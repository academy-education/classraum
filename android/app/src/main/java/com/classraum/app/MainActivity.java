package com.classraum.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private Insets safeAreaInsets;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable edge-to-edge display
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Listen for system bar insets and inject them as CSS custom properties
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, windowInsets) -> {
            safeAreaInsets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            // Inject at multiple timings to catch the remote page load
            injectSafeAreaInsets();
            handler.postDelayed(this::injectSafeAreaInsets, 500);
            handler.postDelayed(this::injectSafeAreaInsets, 1500);
            handler.postDelayed(this::injectSafeAreaInsets, 3000);
            handler.postDelayed(this::injectSafeAreaInsets, 6000);
            return windowInsets;
        });
    }

    private void injectSafeAreaInsets() {
        if (safeAreaInsets == null) return;
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                String js = String.format(
                    "document.documentElement.style.setProperty('--safe-area-top','%dpx');" +
                    "document.documentElement.style.setProperty('--safe-area-bottom','%dpx');" +
                    "document.documentElement.style.setProperty('--safe-area-left','%dpx');" +
                    "document.documentElement.style.setProperty('--safe-area-right','%dpx');",
                    safeAreaInsets.top, safeAreaInsets.bottom,
                    safeAreaInsets.left, safeAreaInsets.right
                );
                webView.evaluateJavascript(js, null);
            }
        } catch (Exception e) {
            // Bridge or WebView not ready yet
        }
    }
}
