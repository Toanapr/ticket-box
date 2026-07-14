import './global.css';
import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Ionicons } from '@expo/vector-icons';

import { SetupScreen } from './src/screens/SetupScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { QueueScreen } from './src/screens/QueueScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';

const Tab = createBottomTabNavigator();

const NAVIGATION_BAR_REHIDE_DELAY_MS = 1200;

function hideAndroidNavigationBar() {
  if (Platform.OS !== 'android') return;

  void NavigationBar.setVisibilityAsync('hidden').catch(() => {});
}

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let rehideTimer: ReturnType<typeof setTimeout> | undefined;

    // Behavior is also configured natively in app.json. This runtime call keeps
    // Expo Go and development builds aligned when edge-to-edge is not enforced.
    void NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
    hideAndroidNavigationBar();

    const visibilitySubscription = NavigationBar.addVisibilityListener(
      ({ visibility }) => {
        if (visibility !== 'visible') return;

        if (rehideTimer) clearTimeout(rehideTimer);
        rehideTimer = setTimeout(
          hideAndroidNavigationBar,
          NAVIGATION_BAR_REHIDE_DELAY_MS,
        );
      },
    );

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') hideAndroidNavigationBar();
    });

    return () => {
      if (rehideTimer) clearTimeout(rehideTimer);
      visibilitySubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer onStateChange={hideAndroidNavigationBar}>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerShown: true,
            headerStyle: { 
              backgroundColor: '#09090b',
              shadowColor: 'transparent', // iOS
              elevation: 0, // Android
              borderBottomWidth: 1,
              borderBottomColor: '#27272a'
            },
            headerTintColor: '#fff',
            headerTitleStyle: { 
              fontWeight: '800',
              fontSize: 18,
              letterSpacing: 0.5,
            },
            tabBarStyle: { 
              backgroundColor: '#09090b',
              borderTopColor: '#27272a',
              borderTopWidth: 1,
              paddingBottom: 8,
              paddingTop: 8,
              height: 60,
            },
            tabBarActiveTintColor: '#10b981',
            tabBarInactiveTintColor: '#71717a',
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
              marginTop: 2,
            }
          }}
        >
          <Tab.Screen 
            name="Setup" 
            component={SetupScreen} 
            options={{ 
              title: 'Provisioning',
              tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={24} color={color} />
            }} 
          />
          <Tab.Screen 
            name="Scan" 
            component={ScanScreen} 
            options={{ 
              title: 'Scanner Workspace',
              headerShown: false, // Hide header for camera screen to maximize viewport
              tabBarIcon: ({ color, size }) => <Ionicons name="scan-outline" size={24} color={color} />
            }} 
          />
          <Tab.Screen 
            name="Queue" 
            component={QueueScreen} 
            options={{ 
              title: 'Offline Queue',
              tabBarIcon: ({ color, size }) => <Ionicons name="cloud-offline-outline" size={24} color={color} />
            }} 
          />
          <Tab.Screen 
            name="History" 
            component={HistoryScreen} 
            options={{ 
              title: 'Scan Results',
              tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={24} color={color} />
            }} 
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
