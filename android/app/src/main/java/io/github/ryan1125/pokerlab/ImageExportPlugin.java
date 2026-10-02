package io.github.ryan1125.pokerlab;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

/** Saves only a user-confirmed PNG through Android's document picker; no storage permission. */
@CapacitorPlugin(name = "ImageExport")
public class ImageExportPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String data = call.getString("data");
        String filename = call.getString("filename", "牌局实验室.png");
        if (data == null || data.length() > 40000000 || !filename.endsWith(".png") || filename.contains("/") || filename.contains("\\")) {
            call.reject("Invalid PNG export");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/png");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "imageDestination");
    }

    @ActivityCallback
    private void imageDestination(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }
        Uri uri = result.getData().getData();
        getBridge().execute(() -> {
            try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "w")) {
                if (stream == null) throw new java.io.IOException("Destination unavailable");
                stream.write(Base64.decode(call.getString("data"), Base64.DEFAULT));
                stream.flush();
            } catch (Exception error) {
                call.reject("Unable to save image", error);
                return;
            }
            String filename = call.getString("filename");
            try (Cursor cursor = getContext().getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) filename = cursor.getString(0);
            } catch (Exception ignored) { /* Some providers do not expose display names. */ }
            JSObject response = new JSObject();
            response.put("cancelled", false);
            response.put("filename", filename);
            call.resolve(response);
        });
    }
}
