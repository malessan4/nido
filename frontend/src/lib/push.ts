import api from './api';

// Esta es la clave pública generada por el Backend
const PUBLIC_VAPID_KEY = 'BNYZ9KX7T_ADAQ6fT7dsVbumUaQO_zNdttSk4omTaVcqI6P1HyvN_dEdsgk0AJAiP7QlEl89wot15iI5xBYxg70';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported in this browser.');
    return;
  }

  try {
    // Pedir permisos al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permission for notifications was denied');
      return;
    }

    // Registrar el Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered successfully');

    // Esperar a que el SW esté activo
    await navigator.serviceWorker.ready;

    // Suscribirse al PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });

    // Parsear los datos para mandar al Backend
    const subJSON = subscription.toJSON();
    const endpoint = subJSON.endpoint;
    const p256dh = subJSON.keys?.p256dh;
    const auth = subJSON.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      throw new Error('Push subscription keys missing');
    }

    // Enviar la suscripción a nuestro backend en Go
    await api.post('/notifications/subscribe', {
      endpoint,
      keys: {
        p256dh,
        auth
      }
    });

    console.log('Push Subscription sent to backend successfully');

  } catch (error) {
    console.error('Error setting up push notifications:', error);
  }
}
