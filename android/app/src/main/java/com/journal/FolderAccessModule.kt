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
}
