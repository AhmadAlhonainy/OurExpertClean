import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface MeetingDetails {
  meetingLink: string;
  meetingId: string;
  eventId: string;
  startTime: string;
  endTime: string;
}

export async function createGoogleMeetMeeting(
  title: string,
  description: string,
  startDateTime: Date,
  durationMinutes: number = 60,
  attendeeEmails: string[] = []
): Promise<MeetingDetails> {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
    
    const event = {
      summary: title,
      description: description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Riyadh',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Riyadh',
      },
      attendees: attendeeEmails.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    const createdEvent = response.data;
    
    if (!createdEvent.hangoutLink) {
      throw new Error('Failed to create Google Meet link');
    }

    return {
      meetingLink: createdEvent.hangoutLink,
      meetingId: createdEvent.conferenceData?.conferenceId || '',
      eventId: createdEvent.id || '',
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
    };
  } catch (error: any) {
    console.error('Error creating Google Meet meeting:', error);
    throw new Error(`فشل في إنشاء اجتماع Google Meet: ${error.message}`);
  }
}

export async function cancelGoogleMeetMeeting(eventId: string): Promise<void> {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'all',
    });
  } catch (error: any) {
    console.error('Error canceling Google Meet meeting:', error);
  }
}
