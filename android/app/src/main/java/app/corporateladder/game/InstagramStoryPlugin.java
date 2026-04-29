package app.corporateladder.game;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import androidx.core.content.FileProvider;

import java.io.File;

@CapacitorPlugin(name = "InstagramStory")
public class InstagramStoryPlugin extends Plugin {

    @PluginMethod
    public void share(PluginCall call) {
        String filePath = call.getString("filePath");
        if (filePath == null) {
            call.reject("filePath required");
            return;
        }

        try {
            // Strip file:// prefix if present
            if (filePath.startsWith("file://")) {
                filePath = filePath.substring(7);
            }
            File f = new File(filePath);
            if (!f.exists()) {
                call.reject("file does not exist: " + filePath);
                return;
            }

            String authority = getContext().getPackageName() + ".fileprovider";
            Uri contentUri = FileProvider.getUriForFile(getContext(), authority, f);

            Intent intent = new Intent("com.instagram.share.ADD_TO_STORY");
            intent.setType("image/*");
            intent.putExtra(Intent.EXTRA_STREAM, contentUri);
            intent.putExtra("interactive_asset_uri", contentUri);
            intent.putExtra("source_application", getContext().getPackageName());
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // Verify Instagram is installed
            if (intent.resolveActivity(getContext().getPackageManager()) == null) {
                call.reject("Instagram is not installed");
                return;
            }

            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("share failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        Intent test = new Intent("com.instagram.share.ADD_TO_STORY");
        test.setType("image/*");
        boolean available = test.resolveActivity(getContext().getPackageManager()) != null;
        JSObject ret = new JSObject();
        ret.put("available", available);
        call.resolve(ret);
    }
}
