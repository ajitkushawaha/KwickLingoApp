// src/services/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { CONFIG } from '../config/config';

// Initialize Google Sign-In
GoogleSignin.configure({
  webClientId: CONFIG.GOOGLE.WEB_CLIENT_ID,
});

// Register with email and password
export const registerWithEmail = async (email: string, password: string): Promise<FirebaseAuthTypes.User | null> => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Login with email and password
export const loginWithEmail = async (email: string, password: string): Promise<FirebaseAuthTypes.User | null> => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Save auth state
    if (user) {
      await AsyncStorage.setItem('isAuthenticated', 'true');
    }
    
    return user;
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  }
};

// Login with Google
export const loginWithGoogle = async (): Promise<FirebaseAuthTypes.User | null> => {
  try {
    // Get the user ID token
    const userInfo = await GoogleSignin.signIn();
    console.log('Google ID Token:', userInfo.data);
    const idToken = userInfo.data?.idToken;
    if (!idToken) {
      throw new Error('No ID token received from Google Sign-in');
    }
    // Create a Google credential
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    
    // Sign-in with credential
    const userCredential = await auth().signInWithCredential(googleCredential);
    const user = userCredential.user;
    
    // Save auth state
    if (user) {
      await AsyncStorage.setItem('isAuthenticated', 'true');
    }
    
    return user;
  } catch (error: any) {
    console.error('Google login error:', error);
    throw error;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    // Check if user is signed in with Google
    try {
      const isSignedInWithGoogle = await GoogleSignin.hasPlayServices();
      if (isSignedInWithGoogle) {
        await GoogleSignin.signOut();
      }
    } catch (error) {
      // Ignore Google sign-out errors
      console.log('Google sign-out error (ignored):', error);
    }
    
    // Sign out from Firebase
    await auth().signOut();
    
    // Clear auth state
    await AsyncStorage.removeItem('isAuthenticated');
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Get current authenticated user
export const getCurrentUser = async (): Promise<FirebaseAuthTypes.User | null> => {
  return auth().currentUser;
};

// Check if user is authenticated
export const getAuthState = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem('isAuthenticated');
    if (value === 'true' && auth().currentUser) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking auth state:', error);
    return false;
  }
};