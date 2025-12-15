// Microsoft Teams Service - Creates real Teams meetings via Graph API
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

export interface TeamsMeeting {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  joinUrl: string;
  meetingUrl: string;
}

export const microsoftTeamsService = {
  // Create a Microsoft Teams meeting via Graph API
  createMeeting: async (
    accessToken: string,
    subject: string,
    startTime: Date,
    endTime: Date,
    content?: string
  ): Promise<TeamsMeeting> => {
    const event = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: content || ''
      },
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness'
    };

    const response = await fetch(`${GRAPH_API_BASE}/me/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Teams meeting: ${error}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      subject: data.subject,
      startTime: data.start.dateTime,
      endTime: data.end.dateTime,
      joinUrl: data.onlineMeeting?.joinUrl || '',
      meetingUrl: data.webLink || ''
    };
  },

  // Get OAuth2 authorization URL for Microsoft Graph API
  getAuthUrl: (): string => {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '';
    const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
    const scope = 'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite';
    const responseType = 'code';
    
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=${responseType}&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scope)}`;
  }
};

