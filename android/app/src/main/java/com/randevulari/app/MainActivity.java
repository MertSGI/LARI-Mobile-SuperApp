package com.randevulari.app;

import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onStart() {
        super.onStart();
        if (this.bridge != null) {
            WebView webView = this.bridge.getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                // Lock MIUI / Android system font zoom so mobile layouts stay pixel-accurate (Xiaomi Redmi Note 8 Pro)
                settings.setTextZoom(100);
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setDomStorageEnabled(true);
            }
        }
    }
}
