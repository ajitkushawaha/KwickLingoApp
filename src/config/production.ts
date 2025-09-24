// src/config/production.ts
export const PRODUCTION_CONFIG = {
  // Server Configuration
  SERVER: {
    SIGNALING_URL: 'https://kwicklingo-server.onrender.com',
    HEALTH_CHECK_URL: 'https://kwicklingo-server.onrender.com/health',
  },

  // Firebase Configuration (Production)
  FIREBASE: {
    API_KEY: 'your-production-api-key',
    AUTH_DOMAIN: 'your-production-project.firebaseapp.com',
    PROJECT_ID: 'your-production-project',
    STORAGE_BUCKET: 'your-production-project.appspot.com',
    MESSAGING_SENDER_ID: '123456789',
    APP_ID: '1:123456789:web:abcdef123456',
  },

  // App Configuration
  APP: {
    NAME: 'KwickLingo',
    VERSION: '1.0.0',
    BUILD_NUMBER: '1',
    ENVIRONMENT: 'production',
  },

  // Feature Flags
  FEATURES: {
    LIVE_STREAMING: true,
    DYNAMIC_LAYOUTS: true,
    GIFT_SYSTEM: true,
    CHAT_INTEGRATION: true,
    DEBUG_MODE: false,
  },

  // Performance Settings
  PERFORMANCE: {
    VIDEO_QUALITY: 'high', // high, medium, low
    AUDIO_QUALITY: 'high',
    MAX_CONNECTIONS: 1000,
    CONNECTION_TIMEOUT: 30000,
  },

  // Security Settings
  SECURITY: {
    ENABLE_ENCRYPTION: true,
    REQUIRE_AUTHENTICATION: true,
    ALLOWED_ORIGINS: ['https://your-domain.com'],
  },

  // Analytics
  ANALYTICS: {
    ENABLED: true,
    TRACK_EVENTS: true,
    TRACK_PERFORMANCE: true,
  },
};
