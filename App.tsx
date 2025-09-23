// App.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import AppNavigator from './src/navigation/AppNavigation';

export interface AppNavigatorProps {
  isAuthenticated: boolean;
  hasSeenWelcome: boolean;
  // other props if any
}


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Check if user has seen the welcome screen
  useEffect(() => {
    const checkWelcome = async () => {
      const seen = await AsyncStorage.getItem('hasSeenWelcome');
      setHasSeenWelcome(seen === 'true');
    };
    checkWelcome();
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(user => {
      setIsAuthenticated(!!user);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing || hasSeenWelcome === null) return null; // Show splash if needed

  return (
    <NavigationContainer>
      <AppNavigator
        isAuthenticated={isAuthenticated}
        hasSeenWelcome={hasSeenWelcome}
      />
    </NavigationContainer>
  );
}
