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

  /**
   * Find public journal-data.json under Documents/Journal (canonical)
   * or Download/Journal (legacy). Prefers Documents when both exist.
   */
  @ReactMethod
  fun findJournalBackup(promise: Promise) {
    try {
      val documents = linkedSetOf<File>()
      val downloads = linkedSetOf<File>()

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
          ?.let { documents.add(File(File(it, "Journal"), "journal-data.json")) }
      }
      Environment.getExternalStorageDirectory()?.let { root ->
        documents.add(File(root, "Documents/Journal/journal-data.json"))
      }

      Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        ?.let { downloads.add(File(File(it, "Journal"), "journal-data.json")) }
      Environment.getExternalStorageDirectory()?.let { root ->
        downloads.add(File(root, "Download/Journal/journal-data.json"))
      }

      fun bestOf(files: Set<File>): File? {
        var best: File? = null
        for (file in files) {
          if (file.exists() && file.isFile && file.length() > 2) {
            if (best == null || file.length() > best!!.length()) {
              best = file
            }
          }
        }
        return best
      }

      val docsBest = bestOf(documents)
      if (docsBest != null) {
        promise.resolve(docsBest.absolutePath)
        return
      }
      promise.resolve(bestOf(downloads)?.absolutePath)
    } catch (e: Exception) {
      promise.reject("FIND_BACKUP_ERROR", e.message, e)
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
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
          ?.let { imageDirs.add(File(File(it, "Journal"), "images")) }
      }

      Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        ?.let { imageDirs.add(File(File(it, "Journal"), "images")) }

      Environment.getExternalStorageDirectory()?.let { root ->
        imageDirs.add(File(root, "Documents/Journal/images"))
        imageDirs.add(File(root, "Download/Journal/images"))
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
   * Recursively delete Documents/Journal (and other Journal backup roots).
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
          "Need All files access to delete Documents/Journal backup",
        )
        return
      }

      val targets = linkedSetOf<File>()

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
          ?.let { targets.add(File(it, "Journal")) }
      }

      Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        ?.let { targets.add(File(it, "Journal")) }

      Environment.getExternalStorageDirectory()?.let { root ->
        targets.add(File(root, "Documents/Journal"))
        targets.add(File(root, "Download/Journal"))
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

      // Verify public Documents/Journal is gone (primary backup location)
      val primary =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
          Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
            ?.let { File(it, "Journal") }
        } else {
          Environment.getExternalStorageDirectory()?.let { File(it, "Documents/Journal") }
        }
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
