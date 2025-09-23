// src/navigation/AppNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/Login';
import HomeScreen from '../screens/Home';
import VideoChatScreen from '../screens/VideoChatScreen';
import Welcome from '../screens/Welcome';
import PreferencesScreen from '../screens/PreferencesScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Home: undefined;
  Streame: undefined;
  Preferences: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  isAuthenticated: boolean;
  hasSeenWelcome: boolean;
}

const AppNavigator: React.FC<AppNavigatorProps> = ({ isAuthenticated, hasSeenWelcome }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#2c3e50' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {!hasSeenWelcome ? (
        <Stack.Screen
          name="Welcome"
          component={Welcome}
          options={{ headerShown: false }}
        />
      ) : !isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'KwickLingo' ,  headerShown: false }}
          />
          <Stack.Screen
            name="Streame"
            component={VideoChatScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Preferences"
            component={PreferencesScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
