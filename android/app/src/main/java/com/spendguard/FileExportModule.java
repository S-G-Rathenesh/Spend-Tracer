package com.spendguard;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class FileExportModule extends ReactContextBaseJavaModule {
    private static final String TAG = "FileExportModule";
    private final ReactApplicationContext reactContext;

    public FileExportModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "FileExportModule";
    }

    @ReactMethod
    public void saveToDownloads(String filename, String content, String mimeType, Promise promise) {
        try {
            OutputStream outputStream;
            String path;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                Uri uri = reactContext.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                
                if (uri != null) {
                    outputStream = reactContext.getContentResolver().openOutputStream(uri);
                    path = uri.toString();
                } else {
                    promise.reject("FILE_EXPORT_ERROR", "Failed to create new MediaStore record.");
                    return;
                }
            } else {
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File file = new File(downloadsDir, filename);
                outputStream = new FileOutputStream(file);
                path = file.getAbsolutePath();
            }

            if (outputStream != null) {
                outputStream.write(content.getBytes());
                outputStream.close();
                promise.resolve(path);
            } else {
                promise.reject("FILE_EXPORT_ERROR", "Output stream is null.");
            }

        } catch (Exception e) {
            Log.e(TAG, "Error saving file: ", e);
            promise.reject("FILE_EXPORT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void copyFileToDownloads(String sourcePath, String filename, String mimeType, Promise promise) {
        try {
            // Remove file:// prefix if present
            if (sourcePath.startsWith("file://")) {
                sourcePath = sourcePath.substring(7);
            }

            File sourceFile = new File(sourcePath);
            if (!sourceFile.exists()) {
                promise.reject("FILE_EXPORT_ERROR", "Source file does not exist: " + sourcePath);
                return;
            }
            if (sourceFile.length() == 0) {
                promise.reject("FILE_EXPORT_ERROR", "Source file is empty.");
                return;
            }

            OutputStream outputStream;
            String path;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                Uri uri = reactContext.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);

                if (uri != null) {
                    outputStream = reactContext.getContentResolver().openOutputStream(uri);
                    path = uri.toString();
                } else {
                    promise.reject("FILE_EXPORT_ERROR", "Failed to create new MediaStore record.");
                    return;
                }
            } else {
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File destFile = new File(downloadsDir, filename);
                outputStream = new FileOutputStream(destFile);
                path = destFile.getAbsolutePath();
            }

            if (outputStream != null) {
                java.io.FileInputStream inputStream = new java.io.FileInputStream(sourceFile);
                byte[] buffer = new byte[1024];
                int length;
                while ((length = inputStream.read(buffer)) > 0) {
                    outputStream.write(buffer, 0, length);
                }
                inputStream.close();
                outputStream.close();

                // Optional: Check if we actually wrote bytes (if using File)
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                    File checkFile = new File(path);
                    if (!checkFile.exists() || checkFile.length() == 0) {
                        promise.reject("FILE_EXPORT_ERROR", "Destination file is empty or missing after copy.");
                        return;
                    }
                }
                
                promise.resolve(path);
            } else {
                promise.reject("FILE_EXPORT_ERROR", "Output stream is null.");
            }

        } catch (Exception e) {
            Log.e(TAG, "Error copying file: ", e);
            promise.reject("FILE_EXPORT_ERROR", e.getMessage());
        }
    }
}
