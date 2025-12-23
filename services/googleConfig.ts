
import { toast } from '../components/Toast';

// Centralized configuration for Google Integration
// This ensures we have a single source of truth for the Client ID and better error handling

export const getGoogleClientId = (): string => {
    // Try to get from Vite env vars
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
        console.error('Google Client ID is missing. Please check your .env file.');
        // Only show toast once per session/page load to avoid spamming
        if (!window.sessionStorage.getItem('google_error_shown')) {
            toast.error('Google Client ID not found! System functionality may be limited.');
            window.sessionStorage.setItem('google_error_shown', 'true');
        }
        return '';
    }

    return clientId;
};

export const checkGoogleConfig = (): boolean => {
    return !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
};
