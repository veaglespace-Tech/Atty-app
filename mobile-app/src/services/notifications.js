import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api/baseApi';
import { store } from '@/store';

let Notifications = null;
try {
  // Safe require for Expo Go SDK 53+ compatibility
  Notifications = require('expo-notifications');
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH ?? 4,
      }),
    });
  }
} catch (error) {
  console.warn('[Notifications] Push notifications are disabled in Expo Go (SDK 53+). Use a development build for push notifications.');
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications) {
    return null;
  }

  let token;

  try {
    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      // Get the Expo Push Token using project ID from app config
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? "d782f29a-35b0-49b7-9d97-eedd9d486a98";
        
      if (!projectId) {
        console.log('Project ID not found. Ensure app.json has an eas.projectId');
        return null;
      }

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log('Got Expo Push Token:', token);
    } else {
      console.log('Must use physical device for Push Notifications');
    }
  } catch (e) {
    console.warn('Error fetching push token:', e.message);
  }

  return token;
}

export async function sendPushTokenToServer(pushToken) {
  try {
    const { store } = require('@/store');
    const token = store.getState().auth.token;
    
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/auth/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pushToken }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn('Failed to save token to server:', res.status, text);
    } else {
      console.log('SUCCESS! Token saved to Live Server!');
    }
  } catch (error) {
    console.error('Failed to send push token to server:', error);
  }
}

export function addNotificationResponseListener(callback) {
  if (!Notifications || !Notifications.addNotificationResponseReceivedListener) {
    return { remove: () => {} };
  }
  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (error) {
    console.warn('[Notifications] Listener error:', error.message);
    return { remove: () => {} };
  }
}

export async function showLocalNotification({ title, body, data = {} }) {
  if (!Notifications || !Notifications.scheduleNotificationAsync) {
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // trigger immediately
    });
  } catch (error) {
    console.warn('[Notifications] Error scheduling local notification:', error.message);
  }
}

