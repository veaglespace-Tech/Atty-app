import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api/baseApi';
import { store } from '@/store';
let Notifications = null;
try {
  Notifications = require('expo-notifications');
  
  // Configure foreground notification presentation
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority?.HIGH ?? 4,
    }),
  });
} catch (error) {
  console.warn('[Notifications] expo-notifications is not available (expected in Expo Go SDK 53+).');
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;

  // Remote push notifications are not supported on Web without custom service workers
  if (Platform.OS === 'web') {
    return null;
  }

  // Remote push in Expo Go SDK 51+ is disabled; requires development build or standalone
  const isExpoGo =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient';

  if (isExpoGo) {
    console.info(
      '[Notifications] Remote push notifications require a development build (npx expo run:android / eas build) in Expo SDK 51+.'
    );
  }

  if (!Device.isDevice) {
    console.info('[Notifications] Push notifications require a physical device.');
    return null;
  }

  let token = null;

  try {
    // Configure default Android notification channel (Required for Android 8+)
    if (Platform.OS === 'android') {
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

    // Resolve project ID from Expo config
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      "d782f29a-35b0-49b7-9d97-eedd9d486a98";

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

    // Standardize URL path whether base URL has /api suffix or not
    const base = API_BASE_URL.replace(/\/+$/, '');
    const endpoint = base.endsWith('/api') ? `${base}/auth/push-token` : `${base}/api/auth/push-token`;

    const res = await fetch(endpoint, {
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
  if (!Notifications) return { remove: () => {} };
  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (error) {
    console.warn('[Notifications] Response listener error:', error.message);
    return { remove: () => {} };
  }
}

export function addNotificationReceivedListener(callback) {
  if (!Notifications) return { remove: () => {} };
  try {
    return Notifications.addNotificationReceivedListener(callback);
  } catch (error) {
    console.warn('[Notifications] Received listener error:', error.message);
    return { remove: () => {} };
  }
}

export async function showLocalNotification({ title, body, data = {} }) {
  if (!Notifications) return;
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
