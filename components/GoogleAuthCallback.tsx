import React, { useEffect } from 'react';
import { toast } from './Toast';

// This component handles the OAuth callback from Google
// It should be rendered at the route /auth/google/callback
const GoogleAuthCallback: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  useEffect(() => {
    if (error) {
      console.error('OAuth error:', error);
      toast.error('Authentication failed. Please try again.');
      window.close();
      return;
    }

    if (code) {
      // Exchange code for tokens
      fetch('/api/google/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
        .then(res => res.json())
        .then(data => {
          if (data.accessToken) {
            // Determine which service based on scope in the URL or localStorage
            const scope = urlParams.get('scope') || '';
            const isGmail = scope.includes('gmail');
            const isDocs = scope.includes('documents') || scope.includes('drive');
            
            if (isGmail) {
              localStorage.setItem('gmail_access_token', data.accessToken);
              if (data.refreshToken) {
                localStorage.setItem('gmail_refresh_token', data.refreshToken);
              }
              toast.success('Gmail successfully connected!');
              window.location.href = '/#communications';
            } else if (isDocs) {
              localStorage.setItem('google_docs_access_token', data.accessToken);
              if (data.refreshToken) {
                localStorage.setItem('google_docs_refresh_token', data.refreshToken);
              }
              toast.success('Google Docs successfully connected!');
              window.location.href = '/#documents';
            } else if (scope.includes('calendar')) {
              // Google Calendar/Meet connection
              localStorage.setItem('google_meet_access_token', data.accessToken);
              if (data.refreshToken) {
                localStorage.setItem('google_meet_refresh_token', data.refreshToken);
              }
              toast.success('Google Meet successfully connected!');
              window.location.href = '/#videocall';
            } else {
              // Default to Gmail if can't determine
              localStorage.setItem('gmail_access_token', data.accessToken);
              if (data.refreshToken) {
                localStorage.setItem('gmail_refresh_token', data.refreshToken);
              }
              toast.success('Successfully connected!');
              window.location.href = '/';
            }
          } else {
            throw new Error('No access token received');
          }
        })
        .catch(err => {
          console.error('Token exchange error:', err);
          toast.error('Failed to complete authentication. Please try again.');
          window.close();
        });
    }
  }, [code, error]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;

