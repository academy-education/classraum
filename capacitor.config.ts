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
    contentInset: 'always',
    allowsLinkPreview: true,
    scrollEnabled: true, // Enable scrolling, CSS handles overscroll prevention
    backgroundColor: '#FFFFFF',
    // Deep linking - handled in Info.plist and apple-app-site-association
    scheme: 'classraum',
  },

  // Android specific configuration
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set to true for debugging
    overScrollMode: 'never', // Disable overscroll glow effect
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
      resize: 'body',
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
