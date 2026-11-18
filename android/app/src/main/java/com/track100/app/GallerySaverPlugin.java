package com.track100.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 把分享卡 PNG 保存到系统相册(Pictures/Track100)。
 * Capacitor 官方无「存相册」能力,FileProvider 的 uri 只能用于系统分享,
 * 因此用 MediaStore 直接插入一条图片记录,用户可在相册里看到。
 */
@CapacitorPlugin(name = "GallerySaver")
public class GallerySaverPlugin extends Plugin {

    @PluginMethod
    public void saveImage(PluginCall call) {
        String base64 = call.getString("data");
        String filename = call.getString("filename", "track100.png");
        if (base64 == null || base64.isEmpty()) {
            call.reject("empty data");
            return;
        }
        try {
            byte[] bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) {
                call.reject("decode failed");
                return;
            }

            Context ctx = getContext();
            ContentResolver resolver = ctx.getContentResolver();
            String displayName = filename.endsWith(".png") ? filename : filename + ".png";

            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, displayName);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Images.Media.RELATIVE_PATH,
                        android.os.Environment.DIRECTORY_PICTURES + "/Track100");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
            }

            Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) {
                call.reject("insert failed");
                return;
            }

            boolean ok = false;
            android.os.ParcelFileDescriptor pfd = null;
            try {
                pfd = resolver.openFileDescriptor(uri, "w");
                if (pfd != null) {
                    java.io.FileOutputStream out = new java.io.FileOutputStream(pfd.getFileDescriptor());
                    out.write(bytes);
                    out.flush();
                    out.close();
                    ok = true;
                }
            } finally {
                if (pfd != null) {
                    try { pfd.close(); } catch (Exception ignored) { }
                }
            }

            if (!ok) {
                resolver.delete(uri, null, null);
                call.reject("write failed");
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues done = new ContentValues();
                done.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(uri, done, null, null);
            }

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            call.resolve(result);
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? "save failed" : e.getMessage());
        }
    }
}
