// Push Notification Service for Web Push API
// Uses VAPID for authentication

export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: {
        url?: string;
        type?: string;
    };
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
}

// Check if browser supports push notifications
export const isPushSupported = (): boolean => {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Get current notification permission status
export const getNotificationPermission = (): NotificationPermission => {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
};

// Request notification permission from user
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
};

// Register service worker for push notifications
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });
        console.log('Service Worker registered:', registration.scope);
        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
};

// Subscribe to push notifications
export const subscribeToPush = async (
    registration: ServiceWorkerRegistration,
    vapidPublicKey: string
): Promise<PushSubscriptionJSON | null> => {
    try {
        // Convert VAPID key to Uint8Array
        const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding)
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        };

        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as BufferSource
        });

        return subscription.toJSON();
    } catch (error) {
        console.error('Push subscription failed:', error);
        return null;
    }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (): Promise<boolean> => {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Unsubscribe failed:', error);
        return false;
    }
};

// Get current push subscription
export const getCurrentSubscription = async (): Promise<PushSubscriptionJSON | null> => {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription ? subscription.toJSON() : null;
    } catch (error) {
        console.error('Failed to get subscription:', error);
        return null;
    }
};

// Send subscription to server
export const saveSubscriptionToServer = async (
    subscription: PushSubscriptionJSON,
    userId: string
): Promise<boolean> => {
    try {
        const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                subscription,
                userId
            })
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to save subscription:', error);
        return false;
    }
};

// Remove subscription from server
export const removeSubscriptionFromServer = async (endpoint: string): Promise<boolean> => {
    try {
        const response = await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ endpoint })
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to remove subscription:', error);
        return false;
    }
};

// Show a local notification (for testing or fallback)
export const showLocalNotification = (payload: NotificationPayload): void => {
    if (Notification.permission === 'granted') {
        new Notification(payload.title, {
            body: payload.body,
            icon: payload.icon || '/icons/icon-192.png',
            badge: payload.badge || '/icons/badge-72.png',
            tag: payload.tag,
            data: payload.data
        });
    }
};

// Notification preference types
export interface NotificationPreferences {
    pushEnabled: boolean;
    emailEnabled: boolean;
    taskReminders: boolean;
    deadlineAlerts: boolean;
    newMessages: boolean;
    invoiceUpdates: boolean;
    courtDates: boolean;
    dailySummary: boolean;
    reminderHoursBefore: number; // Hours before deadline to send reminder
}

export const defaultNotificationPreferences: NotificationPreferences = {
    pushEnabled: true,
    emailEnabled: true,
    taskReminders: true,
    deadlineAlerts: true,
    newMessages: true,
    invoiceUpdates: true,
    courtDates: true,
    dailySummary: false,
    reminderHoursBefore: 24
};

// Get user notification preferences
export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
    try {
        const response = await fetch('/api/user/notification-preferences', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            return await response.json();
        }
        return defaultNotificationPreferences;
    } catch (error) {
        console.error('Failed to get preferences:', error);
        return defaultNotificationPreferences;
    }
};

// Save user notification preferences
export const saveNotificationPreferences = async (
    preferences: NotificationPreferences
): Promise<boolean> => {
    try {
        const response = await fetch('/api/user/notification-preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(preferences)
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to save preferences:', error);
        return false;
    }
};
