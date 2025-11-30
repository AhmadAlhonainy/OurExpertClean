// SendGrid Email Service - Using Environment Variable
import sgMail from '@sendgrid/mail';

// Default from email - can be overridden by SENDGRID_FROM_EMAIL env var
const DEFAULT_FROM_EMAIL = 'noreply@wisdomconnect.com';

function getSendGridClient() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY environment variable is not set');
  }
  
  // Debug: Log API key format (first few characters only for security)
  const keyPrefix = apiKey.substring(0, 10);
  console.log(`🔑 SendGrid API Key prefix: ${keyPrefix}...`);
  console.log(`📧 SendGrid FROM EMAIL: ${fromEmail}`);
  console.log(`📧 Env SENDGRID_FROM_EMAIL: ${process.env.SENDGRID_FROM_EMAIL}`);
  console.log(`📧 DEFAULT_FROM_EMAIL: ${DEFAULT_FROM_EMAIL}`);
  
  if (!apiKey.startsWith('SG.')) {
    console.error(`⚠️ Warning: API key does not start with "SG." - this may not be a valid SendGrid API key`);
  }
  
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: fromEmail
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
    const { client, fromEmail } = getSendGridClient();
    
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

    // Trim email and validate before sending
    const trimmedEmail = data.recipientEmail.trim().toLowerCase();
    
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      console.error(`❌ Invalid recipient email format: ${data.recipientEmail}`);
      return false;
    }
    
    await client.send({
      to: trimmedEmail,
      from: fromEmail,
      subject: subject,
      text: textContent,
      html: htmlContent,
      replyTo: fromEmail,
    });

    console.log(`✅ Email sent successfully to ${trimmedEmail}`);
    return true;
  } catch (error: any) {
    console.error('Error sending email:', error);
    return false;
  }
}

export interface NewBookingNotificationData {
  mentorEmail: string;
  mentorName: string;
  learnerName: string;
  experienceTitle: string;
  sessionDate: string;
}

export async function sendNewBookingNotificationToMentor(data: NewBookingNotificationData): Promise<boolean> {
  try {
    const { client, fromEmail } = getSendGridClient();
    
    // Validate email addresses
    if (!data.mentorEmail || !data.mentorEmail.includes('@')) {
      console.error(`❌ Invalid mentor email: ${data.mentorEmail}`);
      return false;
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.8; color: #333; }
        </style>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">مبروك! حجز جديد</h1>
          </div>
          <div style="background-color: #fff; padding: 30px; border: 1px solid #e0e0e0;">
            <p>مرحباً ${data.mentorName}،</p>
            <p style="font-size: 18px; color: #4CAF50; font-weight: bold;">لديك طلب حجز جديد!</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #4CAF50;">
              <h3 style="margin-top: 0; color: #333;">تفاصيل الحجز</h3>
              <p><strong>التجربة:</strong> ${data.experienceTitle}</p>
              <p><strong>المتعلم:</strong> ${data.learnerName}</p>
              <p><strong>موعد الجلسة:</strong> ${data.sessionDate}</p>
            </div>
            
            <p>يرجى مراجعة الحجز وقبوله أو رفضه من لوحة التحكم الخاصة بك.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://wisdomconnect.replit.app/dashboard/mentor" style="background-color: #4CAF50; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                مراجعة الحجز
              </a>
            </div>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 0; color: #666;">منصة WisdomConnect - نربط بين الخبراء والمتعلمين</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
مرحباً ${data.mentorName}،

مبروك! لديك طلب حجز جديد!

تفاصيل الحجز:
- التجربة: ${data.experienceTitle}
- المتعلم: ${data.learnerName}
- موعد الجلسة: ${data.sessionDate}

يرجى مراجعة الحجز وقبوله أو رفضه من لوحة التحكم الخاصة بك.

منصة WisdomConnect
    `;

    // Trim email and ensure it's valid before sending
    const trimmedEmail = data.mentorEmail.trim().toLowerCase();
    
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      console.error(`❌ Invalid mentor email format: ${data.mentorEmail}`);
      return false;
    }
    
    await client.send({
      to: trimmedEmail,
      from: fromEmail,
      subject: `مبروك! حجز جديد - ${data.experienceTitle}`,
      text: textContent,
      html: htmlContent,
      replyTo: fromEmail,
    });

    console.log(`✅ New booking notification sent to mentor: ${trimmedEmail}`);
    return true;
  } catch (error: any) {
    console.error('Error sending new booking notification:', error);
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
    const { client, fromEmail } = getSendGridClient();
    
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

    // Trim email and validate before sending
    const trimmedEmail = data.recipientEmail.trim().toLowerCase();
    
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      console.error(`❌ Invalid recipient email format: ${data.recipientEmail}`);
      return false;
    }
    
    await client.send({
      to: trimmedEmail,
      from: fromEmail,
      subject: `إشعار بشأن حجزك - ${data.experienceTitle}`,
      text: `مرحباً ${data.recipientName}،\n\nنأسف لإبلاغك أنه تم رفض حجزك للتجربة "${data.experienceTitle}".\n${data.reason ? `السبب: ${data.reason}` : ''}\n\nمنصة WisdomConnect`,
      html: htmlContent,
      replyTo: fromEmail,
    });

    console.log(`✅ Rejection email sent to ${trimmedEmail}`);
    return true;
  } catch (error: any) {
    console.error('Error sending rejection email:', error);
    return false;
  }
}

export interface PasswordResetEmailData {
  recipientEmail: string;
  recipientName: string;
  resetLink: string;
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = getSendGridClient();
    
    // Validate email first
    if (!data.recipientEmail || typeof data.recipientEmail !== 'string') {
      console.error(`❌ Invalid recipient email: ${data.recipientEmail}`);
      return false;
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.8; color: #333; }
        </style>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">إعادة تعيين كلمة المرور</h1>
          </div>
          <div style="background-color: #fff; padding: 30px; border: 1px solid #e0e0e0;">
            <p>مرحباً ${data.recipientName}،</p>
            <p>لقد طلبت إعادة تعيين كلمة المرور الخاصة بحسابك في منصة الخبرات.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetLink}" style="background-color: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                إعادة تعيين كلمة المرور
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              إذا لم يعمل الزر، انسخ الرابط التالي في متصفحك:<br>
              <a href="${data.resetLink}" style="color: #667eea; word-break: break-all;">${data.resetLink}</a>
            </p>
          </div>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 0; color: #666;">منصة الخبرات - نربط بين الخبراء والمتعلمين</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
مرحباً ${data.recipientName}،

لقد طلبت إعادة تعيين كلمة المرور الخاصة بحسابك في منصة الخبرات.

لإعادة تعيين كلمة المرور، اضغط على الرابط التالي:
${data.resetLink}

هذا الرابط صالح لمدة ساعة واحدة فقط.

إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة.

منصة الخبرات
    `;

    // Trim email and validate before sending
    const trimmedEmail = data.recipientEmail.trim().toLowerCase();
    
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      console.error(`❌ Invalid recipient email format: ${data.recipientEmail}`);
      return false;
    }
    
    await client.send({
      to: trimmedEmail,
      from: fromEmail,
      subject: 'إعادة تعيين كلمة المرور - منصة الخبرات',
      text: textContent,
      html: htmlContent,
      replyTo: fromEmail,
    });

    console.log(`✅ Password reset email sent to ${trimmedEmail}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending password reset email:', error.message || error);
    if (error.response?.body?.errors) {
      console.error('SendGrid errors:', error.response.body.errors);
    }
    return false;
  }
}
