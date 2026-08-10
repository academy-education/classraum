import type { CapacitorConfig } from '@capacitor/cli';

// Your production app URL - this is where your app is deployed
// IMPORTANT: Use the app subdomain (app.classraum.com), not the main domain
// The app will automatically route users based on their role after login:
// - Students/Parents → /mobile interface
// - Managers/Teachers → /dashboard interface

// For local testing
// const APP_URL = 'http://localhost:3000';
const APP_URL = 'https://app.classraum.com';

const config: CapacitorConfig = {
  appId: 'com.classraum.app',
  appName: 'Classraum',
  webDir: 'out', // Fallback for any static assets

  // Server configuration - loads your hosted web app
  server: {
    url: APP_URL,
    androidScheme: 'https',
    // Allow navigation to these hosts
    allowNavigation: [
      'app.classraum.com',
      '*.classraum.com',
    ],
  },

  // iOS specific configuration
  ios: {
    contentInset: 'never', // Allow web content to extend edge-to-edge (CSS handles safe areas)
    allowsLinkPreview: true,
    scrollEnabled: true, // Enable scrolling, CSS handles overscroll prevention
    backgroundColor: '#FFFFFF', // Match app background to avoid black notch stripe
    // Deep linking - handled in Info.plist and apple-app-site-association
    scheme: 'classraum',
  },

  // Android specific configuration
  android: {
    allowMixedContent: false,
    /*
     * captureInput MUST stay false — it breaks Korean input.
     *
     * When true, CapacitorWebView.onCreateInputConnection returns
     * `new BaseInputConnection(this, false)` instead of the WebView's own
     * connection. That second argument is `fullEditor`, and with it false
     * the connection has no Editable to compose into: the IME's
     * setComposingText calls go nowhere, so a Hangul syllable is INVISIBLE
     * until it is committed. Users typing 강 saw nothing for ㄱ, 가 — the
     * character only appeared once finished. Verified by reading
     * node_modules/@capacitor/android/.../CapacitorWebView.java:24-41,
     * not inferred from the symptom.
     *
     * The paired dispatchKeyEvent hack in the same file is the other half
     * of this legacy path: on ACTION_MULTIPLE it string-concatenates the
     * characters straight into document.activeElement.value via
     * evaluateJavascript, which mangles composition and is an injection
     * shape besides.
     *
     * This file is COMPILED INTO THE NATIVE SHELL (it lands in
     * android/app/src/main/assets/capacitor.config.json via `cap sync`),
     * so unlike the web-layer fixes this one only reaches users through a
     * new store build. Nothing here ships on a Vercel deploy.
     */
    captureInput: false,
    webContentsDebuggingEnabled: false, // Set to true for debugging
    // overScrollMode is accepted by the Android shell at runtime but not
    // declared in @capacitor/cli's CapacitorConfig type yet. Cast keeps
    // the option without losing type checks elsewhere.
    ...({ overScrollMode: 'never' } as Record<string, unknown>),
    // Deep linking - custom URL scheme
    // Universal links configured in AndroidManifest.xml
  },

  // Plugin configurations
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#FFFFFF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE', // Changed from CENTER_CROP to prevent distortion
      showSpinner: true,
      spinnerColor: '#3B82F6', // Blue spinner
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      // @capacitor/keyboard's `resize` is a typed enum (KeyboardResize.Body)
      // but accepts the string literal at runtime. Cast keeps the literal
      // form so this file doesn't need to import the enum.
      resize: 'body' as never,
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#FFFFFF',
      overlaysWebView: true,
    },
    App: {
      // Deep link URL schemes
      // iOS: classraum://
      // Android: classraum://
    },
  },
};

export default config;
