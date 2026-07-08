import './global.css';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
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

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
      
      // Lắng nghe sự kiện nếu thanh điều hướng vô tình bị hiện lên do chạm mép màn hình
      // thì tự động ép nó ẩn đi ngay lập tức để giữ trạng thái full màn hình (Immersive Sticky)
      const listener = NavigationBar.addVisibilityListener(({ visibility }) => {
        if (visibility === 'visible') {
          setTimeout(() => {
            NavigationBar.setVisibilityAsync('hidden').catch(() => {});
          }, 1500); // Chờ 1.5s rồi tự động ẩn lại (tạo cảm giác tự nhiên như immersive sticky chuẩn của Android)
        }
      });

      return () => listener.remove();
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
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
