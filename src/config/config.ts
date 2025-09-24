// Configuration file for KwickLingo app
// In production, these should come from environment variables

export const CONFIG = {
  // Firebase Configuration
  FIREBASE: {
    API_KEY: 'AIzaSyDfGRBib_S7nTWxsAttSahEmYxczhFplvc',
    AUTH_DOMAIN: 'kwicklingo-8f9e2.firebaseapp.com',
    PROJECT_ID: 'kwicklingo-8f9e2',
    STORAGE_BUCKET: 'kwicklingo-8f9e2.appspot.com',
    MESSAGING_SENDER_ID: '765860787335',
    APP_ID: '1:765860787335:android:cbdc10b7521d585424f422',
  },

  // Google Sign-in Configuration
  GOOGLE: {
    WEB_CLIENT_ID: '765860787335-rgolb0ddpv4ba6gt9um7rubk0pjfjst7.apps.googleusercontent.com',
  },

  // Server Configuration
  SERVER: {
    // For cross-device testing, use the computer's IP address for all platforms
    // This allows physical devices and emulators to connect to the same server
    SIGNALING_URL: __DEV__
      ? 'http://10.144.82.144:3000'  // Use computer's IP for all devices
      : 'https://kwicklingo-server.onrender.com',
  },
};
