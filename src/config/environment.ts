// src/config/environment.ts
import { CONFIG } from './config';
import { PRODUCTION_CONFIG } from './production';

// Determine environment
const isProduction = __DEV__ === false;
const isDevelopment = __DEV__ === true;

// Environment-specific configuration
export const ENV_CONFIG = {
  ...CONFIG,
  ...(isProduction ? PRODUCTION_CONFIG : {}),

  // Environment flags
  IS_PRODUCTION: isProduction,
  IS_DEVELOPMENT: isDevelopment,

  // Environment-specific overrides
  SERVER: {
    ...CONFIG.SERVER,
    ...(isProduction ? PRODUCTION_CONFIG.SERVER : {}),
  },

  FEATURES: {
    LIVE_STREAMING: true,
    DYNAMIC_LAYOUTS: true,
    GIFT_SYSTEM: true,
    CHAT_INTEGRATION: true,
    DEBUG_MODE: !isProduction,
    ...(isProduction ? PRODUCTION_CONFIG.FEATURES : {}),
  },
};

// Export environment-specific config
export default ENV_CONFIG;
