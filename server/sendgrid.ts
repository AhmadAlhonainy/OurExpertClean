// SendGrid Email Service - Using Replit SendGrid Integration
import sgMail from '@sendgrid/mail';

let connectionSettings: any;

async function getCredentials() {
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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}

async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

export interface BookingConfirmationEmailData {
  recipientEmail: string;
  recipientName: string;
  experienceTitle: string;
  mentorName: string;
  learnerName: string;
  sessionDate: string;
  meetingLink?: string | null;
  isMentor: boolean;
}

export async function sendBookingConfirmationEmail(data: BookingConfirmationEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const subject = data.isMentor 
      ? `تأكيد الحجز - جلسة مع ${data.learnerName}`
      : `تم قبول حجزك - جلسة مع ${data.mentorName}`;
    
    const meetingSection = data.meetingLink 
      ? `
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="color: #2e7d32; margin-bottom: 15px;">رابط الاجتماع (Google Meet)</h3>
          <a href="${data.meetingLink}" style="background-color: #1a73e8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">
            انضم للاجتماع
          </a>
          <p style="color: #666; margin-top: 15px; font-size: 14px;">
            أو انسخ الرابط: <a href="${data.meetingLink}" style="color: #1a73e8;">${data.meetingLink}</a>
          </p>
        </div>
      ` 
      : '';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.8; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background-color: #fff; padding: 30px; border: 1px solid #e0e0e0; }
          .footer { background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-label { color: #666; }
          .detail-value { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">تم تأكيد الحجز</h1>
          </div>
          <div class="content">
            <p>مرحباً ${data.recipientName}،</p>
            <p>${data.isMentor ? 'لديك جلسة جديدة مؤكدة' : 'نسعد بإبلاغك أنه تم قبول حجزك'}!</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #764ba2;">تفاصيل الجلسة</h3>
              <div class="detail-row">
                <span class="detail-label">التجربة:</span>
                <span class="detail-value">${data.experienceTitle}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">المرشد:</span>
                <span class="detail-value">${data.mentorName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">المتعلم:</span>
                <span class="detail-value">${data.learnerName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">موعد الجلسة:</span>
                <span class="detail-value">${data.sessionDate}</span>
              </div>
            </div>
            
            ${meetingSection}
            
            <p style="color: #666; font-size: 14px;">
              يمكنك التواصل مع ${data.isMentor ? 'المتعلم' : 'المرشد'} من خلال المحادثة في المنصة قبل موعد الجلسة.
            </p>
          </div>
          <div class="footer">
            <p style="margin: 0; color: #666;">منصة WisdomConnect - نربط بين الخبراء والمتعلمين</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
مرحباً ${data.recipientName}،

${data.isMentor ? 'لديك جلسة جديدة مؤكدة' : 'نسعد بإبلاغك أنه تم قبول حجزك'}!

تفاصيل الجلسة:
- التجربة: ${data.experienceTitle}
- المرشد: ${data.mentorName}
- المتعلم: ${data.learnerName}
- موعد الجلسة: ${data.sessionDate}
${data.meetingLink ? `\nرابط الاجتماع (Google Meet): ${data.meetingLink}` : ''}

يمكنك التواصل من خلال المحادثة في المنصة قبل موعد الجلسة.

منصة WisdomConnect
    `;

    await client.send({
      to: data.recipientEmail,
      from: fromEmail,
      subject: subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`✅ Email sent successfully to ${data.recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error('Error sending email:', error);
    return false;
  }
}

export interface BookingRejectionEmailData {
  recipientEmail: string;
  recipientName: string;
  experienceTitle: string;
  mentorName: string;
  reason?: string;
}

export async function sendBookingRejectionEmail(data: BookingRejectionEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.8; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">إشعار بشأن الحجز</h1>
          </div>
          <div style="background-color: #fff; padding: 30px; border: 1px solid #e0e0e0;">
            <p>مرحباً ${data.recipientName}،</p>
            <p>نأسف لإبلاغك أنه تم رفض حجزك للتجربة "${data.experienceTitle}" من قبل المرشد ${data.mentorName}.</p>
            ${data.reason ? `<p><strong>السبب:</strong> ${data.reason}</p>` : ''}
            <p>يمكنك البحث عن تجارب أخرى متاحة في المنصة.</p>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 0; color: #666;">منصة WisdomConnect</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.send({
      to: data.recipientEmail,
      from: fromEmail,
      subject: `إشعار بشأن حجزك - ${data.experienceTitle}`,
      text: `مرحباً ${data.recipientName}،\n\nنأسف لإبلاغك أنه تم رفض حجزك للتجربة "${data.experienceTitle}".\n${data.reason ? `السبب: ${data.reason}` : ''}\n\nمنصة WisdomConnect`,
      html: htmlContent,
    });

    console.log(`✅ Rejection email sent to ${data.recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error('Error sending rejection email:', error);
    return false;
  }
}
