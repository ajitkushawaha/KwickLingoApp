// src/utils/errorHandler.ts
import { Alert } from 'react-native';

interface ErrorInfo {
  error: Error;
  errorInfo?: any;
  context?: string;
  userId?: string;
  timestamp: number;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorInfo[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Log error for debugging
  logError(error: Error, context?: string, errorInfo?: any): void {
    const errorData: ErrorInfo = {
      error,
      errorInfo,
      context,
      timestamp: Date.now(),
    };

    this.errorLog.push(errorData);

    // In production, send to crash reporting service
    if (!__DEV__) {
      this.sendToCrashReporting(errorData);
    } else {
      console.error(`[${context || 'Unknown'}] Error:`, error);
      if (errorInfo) {
        console.error('Error Info:', errorInfo);
      }
    }
  }

  // Show user-friendly error message
  showError(error: Error, context?: string): void {
    const userMessage = this.getUserFriendlyMessage(error, context);

    Alert.alert(
      'Something went wrong',
      userMessage,
      [
        {
          text: 'OK',
          style: 'default',
        },
      ]
    );
  }

  // Handle WebRTC specific errors
  handleWebRTCError(error: Error, context: string): void {
    this.logError(error, `WebRTC-${context}`);

    const userMessage = this.getWebRTCErrorMessage(error);
    this.showError(error, `WebRTC-${context}`);
  }

  // Handle network errors
  handleNetworkError(error: Error, context: string): void {
    this.logError(error, `Network-${context}`);

    Alert.alert(
      'Connection Error',
      'Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  }

  // Handle authentication errors
  handleAuthError(error: Error, context: string): void {
    this.logError(error, `Auth-${context}`);

    Alert.alert(
      'Authentication Error',
      'Please log in again to continue.',
      [{ text: 'OK' }]
    );
  }

  // Get user-friendly error messages
  private getUserFriendlyMessage(error: Error, context?: string): string {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'Please check your internet connection and try again.';
    }

    if (errorMessage.includes('permission')) {
      return 'Please grant the required permissions to continue.';
    }

    if (errorMessage.includes('camera') || errorMessage.includes('microphone')) {
      return 'Camera or microphone access is required for video chat.';
    }

    if (errorMessage.includes('webrtc')) {
      return 'Video connection failed. Please try again.';
    }

    return 'An unexpected error occurred. Please try again.';
  }

  // Get WebRTC specific error messages
  private getWebRTCErrorMessage(error: Error): string {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('ice')) {
      return 'Unable to establish video connection. Please check your network.';
    }

    if (errorMessage.includes('offer') || errorMessage.includes('answer')) {
      return 'Video call setup failed. Please try again.';
    }

    if (errorMessage.includes('stream')) {
      return 'Video stream error. Please restart the call.';
    }

    return 'Video connection failed. Please try again.';
  }

  // Send error to crash reporting service (implement with your preferred service)
  private sendToCrashReporting(errorData: ErrorInfo): void {
    // TODO: Implement crash reporting service integration
    // Examples: Sentry, Bugsnag, Crashlytics, etc.

    // Example implementation:
    /*
    import crashlytics from '@react-native-firebase/crashlytics';

    crashlytics().recordError(errorData.error);
    crashlytics().setAttributes({
      context: errorData.context,
      timestamp: errorData.timestamp.toString(),
    });
    */
  }

  // Get error log for debugging
  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = [];
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export types
export type { ErrorInfo };
