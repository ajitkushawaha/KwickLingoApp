import { Platform, Alert, Linking } from 'react-native';
import { request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

// Permission types for different platforms
const PERMISSION_TYPES = {
  CAMERA: Platform.select({
    ios: PERMISSIONS.IOS.CAMERA,
    android: PERMISSIONS.ANDROID.CAMERA,
  }) as Permission,
  MICROPHONE: Platform.select({
    ios: PERMISSIONS.IOS.MICROPHONE,
    android: PERMISSIONS.ANDROID.RECORD_AUDIO,
  }) as Permission,
};

// Request camera permission
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const result = await request(PERMISSION_TYPES.CAMERA);
    
    if (result === RESULTS.GRANTED) {
      return true;
    } else if (result === RESULTS.DENIED) {
      // Try again
      const retryResult = await request(PERMISSION_TYPES.CAMERA);
      return retryResult === RESULTS.GRANTED;
    } else if (result === RESULTS.BLOCKED) {
      showPermissionAlert('Camera', 'camera');
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

// Request microphone permission
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const result = await request(PERMISSION_TYPES.MICROPHONE);
    
    if (result === RESULTS.GRANTED) {
      return true;
    } else if (result === RESULTS.DENIED) {
      // Try again
      const retryResult = await request(PERMISSION_TYPES.MICROPHONE);
      return retryResult === RESULTS.GRANTED;
    } else if (result === RESULTS.BLOCKED) {
      showPermissionAlert('Microphone', 'microphone');
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
};

// Request both camera and microphone permissions
export const requestVideoCallPermissions = async (): Promise<boolean> => {
  try {
    const [cameraGranted, microphoneGranted] = await Promise.all([
      requestCameraPermission(),
      requestMicrophonePermission(),
    ]);

    if (!cameraGranted || !microphoneGranted) {
      Alert.alert(
        'Permissions Required',
        'Camera and microphone permissions are required for video calls. Please enable them in settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting video call permissions:', error);
    return false;
  }
};

// Show permission alert
const showPermissionAlert = (permissionName: string, settingName: string) => {
  Alert.alert(
    `${permissionName} Permission Required`,
    `Please enable ${permissionName.toLowerCase()} permission in settings to use video calling features.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Open Settings', 
        onPress: () => Linking.openSettings() 
      },
    ]
  );
};

// Check if permissions are granted
export const checkPermissions = async (): Promise<{
  camera: boolean;
  microphone: boolean;
}> => {
  try {
    const [cameraResult, microphoneResult] = await Promise.all([
      request(PERMISSION_TYPES.CAMERA),
      request(PERMISSION_TYPES.MICROPHONE),
    ]);

    return {
      camera: cameraResult === RESULTS.GRANTED,
      microphone: microphoneResult === RESULTS.GRANTED,
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    return { camera: false, microphone: false };
  }
};
