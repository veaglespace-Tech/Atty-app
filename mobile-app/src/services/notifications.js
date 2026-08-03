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
  console.warn('[Notifications] Notification module not available:', error?.message);
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications) {
    return null;
  }

  // Push notification tokens (remote push) are not supported on Web without custom VAPID/service workers
  if (Platform.OS === 'web') {
    return null;
  }

  // Check if running inside Expo Go (Expo Go SDK 51+ does not support remote push notifications)
  const isExpoGo =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient';

  if (isExpoGo) {
    console.info(
      '[Notifications] Remote push notifications require a development build (npx expo run:android or EAS build) in Expo SDK 53+.'
    );
    return null;
  }

  if (!Device.isDevice) {
    console.info('[Notifications] Push notifications require a physical device.');
    return null;
  }

  let token = null;

  try {
    // Configure Android notification channel
    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#208AEF',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    // Check and request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted for push notifications (Status:', finalStatus, ')');
      return null;
    }

    // Get the Expo Push Token using project ID from app config
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      "ea281884-8a26-4d8e-abed-5a4386ff21cf";

    if (!projectId) {
      console.warn('[Notifications] Project ID not found in app configuration.');
      return null;
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = pushTokenData?.data;
    console.log('[Notifications] Expo Push Token obtained:', token);
  } catch (e) {
    console.warn('[Notifications] Error fetching push token:', e.message);
  }

  return token;
}

export async function sendPushTokenToServer(pushToken) {
  if (!pushToken) return;

  try {
    const token = store.getState()?.auth?.token;
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
      console.warn('[Notifications] Failed to save push token to server:', res.status, text);
    } else {
      console.log('[Notifications] SUCCESS: Push token registered on server');
    }
  } catch (error) {
    console.error('[Notifications] Failed to send push token to server:', error);
  }
}

export function addNotificationResponseListener(callback) {
  if (!Notifications || !Notifications.addNotificationResponseReceivedListener) {
    return { remove: () => {} };
  }
  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (error) {
    console.warn('[Notifications] Response listener error:', error.message);
    return { remove: () => {} };
  }
}

export function addNotificationReceivedListener(callback) {
  if (!Notifications || !Notifications.addNotificationReceivedListener) {
    return { remove: () => {} };
  }
  try {
    return Notifications.addNotificationReceivedListener(callback);
  } catch (error) {
    console.warn('[Notifications] Received listener error:', error.message);
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


