// src/utils/performance.ts
import { Dimensions } from 'react-native';

interface PerformanceMetrics {
  appStartTime: number;
  screenLoadTimes: { [key: string]: number };
  connectionTimes: { [key: string]: number };
  memoryUsage: number;
  deviceInfo: {
    width: number;
    height: number;
    scale: number;
  };
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private startTimes: { [key: string]: number } = {};

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.metrics = {
      appStartTime: Date.now(),
      screenLoadTimes: {},
      connectionTimes: {},
      memoryUsage: 0,
      deviceInfo: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        scale: Dimensions.get('window').scale,
      },
    };
  }

  // Start timing a screen load
  startScreenTimer(screenName: string): void {
    this.startTimes[`screen-${screenName}`] = Date.now();
  }

  // End timing a screen load
  endScreenTimer(screenName: string): void {
    const startTime = this.startTimes[`screen-${screenName}`];
    if (startTime) {
      const loadTime = Date.now() - startTime;
      this.metrics.screenLoadTimes[screenName] = loadTime;
      delete this.startTimes[`screen-${screenName}`];

      if (!__DEV__) {
        this.logPerformanceMetric('screen_load', {
          screen: screenName,
          loadTime,
        });
      }
    }
  }

  // Start timing a connection
  startConnectionTimer(connectionType: string): void {
    this.startTimes[`connection-${connectionType}`] = Date.now();
  }

  // End timing a connection
  endConnectionTimer(connectionType: string): void {
    const startTime = this.startTimes[`connection-${connectionType}`];
    if (startTime) {
      const connectionTime = Date.now() - startTime;
      this.metrics.connectionTimes[connectionType] = connectionTime;
      delete this.startTimes[`connection-${connectionType}`];

      if (!__DEV__) {
        this.logPerformanceMetric('connection_time', {
          type: connectionType,
          connectionTime,
        });
      }
    }
  }

  // Track WebRTC connection performance
  trackWebRTCPerformance(metrics: {
    connectionTime: number;
    iceConnectionState: string;
    iceGatheringState: string;
    signalingState: string;
  }): void {
    this.metrics.connectionTimes.webrtc = metrics.connectionTime;

    if (!__DEV__) {
      this.logPerformanceMetric('webrtc_performance', metrics);
    }
  }

  // Track memory usage
  updateMemoryUsage(): void {
    // In React Native, we can't directly access memory usage
    // This would need to be implemented with native modules
    // For now, we'll track app uptime as a proxy
    this.metrics.memoryUsage = Date.now() - this.metrics.appStartTime;
  }

  // Get performance metrics
  getMetrics(): PerformanceMetrics {
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  // Log performance metric to analytics service
  private logPerformanceMetric(event: string, data: any): void {
    // TODO: Implement analytics service integration
    // Examples: Firebase Analytics, Mixpanel, Amplitude, etc.

    // Example implementation:
    /*
    import analytics from '@react-native-firebase/analytics';

    analytics().logEvent(event, {
      ...data,
      timestamp: Date.now(),
      app_version: '1.0.0',
    });
    */
  }

  // Check if device meets performance requirements
  checkDevicePerformance(): {
    isCompatible: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let isCompatible = true;

    // Check screen size
    if (this.metrics.deviceInfo.width < 320 || this.metrics.deviceInfo.height < 480) {
      warnings.push('Screen size may be too small for optimal video chat experience');
    }

    // Check screen density
    if (this.metrics.deviceInfo.scale < 1.5) {
      warnings.push('Low screen density may affect video quality');
    }

    // Check if device is older (based on screen dimensions as proxy)
    if (this.metrics.deviceInfo.width < 360) {
      warnings.push('Device may have limited performance for video streaming');
      isCompatible = false;
    }

    return { isCompatible, warnings };
  }

  // Optimize performance based on device capabilities
  getOptimalSettings(): {
    videoQuality: 'high' | 'medium' | 'low';
    audioQuality: 'high' | 'medium' | 'low';
    maxBitrate: number;
  } {
    const { isCompatible } = this.checkDevicePerformance();

    if (isCompatible) {
      return {
        videoQuality: 'high',
        audioQuality: 'high',
        maxBitrate: 2000000, // 2 Mbps
      };
    } else {
      return {
        videoQuality: 'medium',
        audioQuality: 'medium',
        maxBitrate: 1000000, // 1 Mbps
      };
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export types
export type { PerformanceMetrics };
