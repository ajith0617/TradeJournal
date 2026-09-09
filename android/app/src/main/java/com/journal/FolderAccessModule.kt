package com.journal

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.File

class FolderAccessModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "FolderAccess"

  @ReactMethod
  fun hasAllFilesAccess(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        promise.resolve(Environment.isExternalStorageManager())
      } else {
        promise.resolve(true)
      }
    } catch (e: Exception) {
      promise.reject("HAS_ACCESS_ERROR", e)
    }
  }

  @ReactMethod
  fun openAllFilesAccessSettings(promise: Promise) {
    try {
      val packageName = reactContext.packageName
      val intent =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
            data = Uri.parse("package:$packageName")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
        } else {
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.parse("package:$packageName")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
        }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      try {
        val fallback =
          Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
        reactContext.startActivity(fallback)
        promise.resolve(true)
      } catch (e2: Exception) {
        try {
          val details =
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
              data = Uri.parse("package:${reactContext.packageName}")
              addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
          reactContext.startActivity(details)
          promise.resolve(true)
        } catch (e3: Exception) {
          promise.reject("OPEN_SETTINGS_ERROR", e3)
        }
      }
    }
  }

  /**
   * Delete specific image filenames from Journal/images mirrors.
   * Best-effort; skips missing files. Uses All files access on Android 11+.
   */
  @ReactMethod
  fun deleteJournalImages(names: ReadableArray, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
        !Environment.isExternalStorageManager()
      ) {
        // Still try app-private paths; public Download may fail without access
      }

      val imageDirs = linkedSetOf<File>()
      Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        ?.let { imageDirs.add(File(File(it, "Journal"), "images")) }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
          ?.let { imageDirs.add(File(File(it, "Journal"), "images")) }
      }

      Environment.getExternalStorageDirectory()?.let { root ->
        imageDirs.add(File(root, "Download/Journal/images"))
        imageDirs.add(File(root, "Documents/Journal/images"))
      }

      reactContext.getExternalFilesDir(null)?.let { appExt ->
        imageDirs.add(File(File(appExt, "Journal"), "images"))
      }

      var deleted = 0
      for (i in 0 until names.size()) {
        val name = names.getString(i)?.trim().orEmpty()
        if (name.isEmpty() || name.contains('/') || name.contains('\\')) {
          continue
        }
        for (dir in imageDirs) {
          val file = File(dir, name)
          if (file.exists() && file.isFile) {
            if (file.delete() || !file.exists()) {
              deleted += 1
            }
          }
        }
      }

      promise.resolve(deleted)
    } catch (e: Exception) {
      promise.reject("DELETE_IMAGES_ERROR", e.message, e)
    }
  }

  /**
   * Recursively delete Download/Journal (and other Journal backup roots).
   * Requires All files access on Android 11+.
   */
  @ReactMethod
  fun wipeJournalBackup(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
        !Environment.isExternalStorageManager()
      ) {
        promise.reject(
          "NO_ACCESS",
          "Need All files access to delete Download/Journal backup",
        )
        return
      }

      val targets = linkedSetOf<File>()

      Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        ?.let { targets.add(File(it, "Journal")) }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
          ?.let { targets.add(File(it, "Journal")) }
      }

      Environment.getExternalStorageDirectory()?.let { root ->
        targets.add(File(root, "Download/Journal"))
        targets.add(File(root, "Documents/Journal"))
      }

      reactContext.getExternalFilesDir(null)?.let { appExt ->
        targets.add(File(appExt, "Journal"))
      }

      val failed = mutableListOf<String>()
      for (dir in targets) {
        if (!dir.exists()) {
          continue
        }
        if (!deleteRecursively(dir)) {
          failed.add(dir.absolutePath)
        }
      }

      // Verify public Download/Journal is gone (primary backup location)
      val primary =
        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
          ?.let { File(it, "Journal") }
      if (primary != null && primary.exists()) {
        failed.add(primary.absolutePath)
      }

      if (failed.isNotEmpty()) {
        promise.reject(
          "WIPE_FAILED",
          "Could not delete: ${failed.joinToString(", ")}",
        )
        return
      }

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("WIPE_ERROR", e.message, e)
    }
  }

  private fun deleteRecursively(file: File): Boolean {
    if (file.isDirectory) {
      val children = file.listFiles()
      if (children != null) {
        for (child in children) {
          if (!deleteRecursively(child)) {
            return false
          }
        }
      }
    }
    return file.delete() || !file.exists()
  }
}
