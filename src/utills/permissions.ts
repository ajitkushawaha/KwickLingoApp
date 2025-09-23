// src/utils/permissions.ts
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Request camera and microphone permissions
export const requestPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const cameraGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'KwickLingo needs access to your camera for video chat.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      const micGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'KwickLingo needs access to your microphone for voice chat.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      if (
        cameraGranted === PermissionsAndroid.RESULTS.GRANTED &&
        micGranted === PermissionsAndroid.RESULTS.GRANTED
      ) {
        return true;
      } else {
        showPermissionAlert();
        return false;
      }
    } else if (Platform.OS === 'ios') {
      const cameraResult = await request(PERMISSIONS.IOS.CAMERA);
      const micResult = await request(PERMISSIONS.IOS.MICROPHONE);

      if (
        cameraResult === RESULTS.GRANTED &&
        micResult === RESULTS.GRANTED
      ) {
        return true;
      } else {
        showPermissionAlert();
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
};

// Show an alert if permissions are denied
const showPermissionAlert = () => {
  Alert.alert(
    'Permissions Required',
    'Camera and microphone permissions are required for video chat. Please enable them in your device settings.',
    [
      {
        text: 'OK',
        style: 'default',
      },
    ]
  );
};

// Check if permissions are granted
export const checkPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const cameraGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      const micGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );

      return cameraGranted && micGranted;
    } else if (Platform.OS === 'ios') {
      const cameraResult = await request(PERMISSIONS.IOS.CAMERA);
      const micResult = await request(PERMISSIONS.IOS.MICROPHONE);

      return (
        cameraResult === RESULTS.GRANTED &&
        micResult === RESULTS.GRANTED
      );
    }

    return false;
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};