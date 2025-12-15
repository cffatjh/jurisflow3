import nodemailer from 'nodemailer';

// Email service configuration
const createTransporter = () => {
  // Use environment variables or default to console (for development)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  
  // Development: Use console transport
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
};

const transporter = createTransporter();

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@jurisflow.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    const info = await transporter.sendMail(mailOptions);
    
    // In development, log to console
    if (!process.env.SMTP_HOST) {
      console.log('📧 Email would be sent:', {
        to: options.to,
        subject: options.subject,
      });
    }
    
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

// Email templates
export const emailTemplates = {
  passwordReset: (resetLink: string, name: string) => ({
    subject: 'Şifre Sıfırlama - JurisFlow',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Şifre Sıfırlama</h2>
        <p>Merhaba ${name},</p>
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
        <p><a href="${resetLink}" style="background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Şifremi Sıfırla</a></p>
        <p>Bu bağlantı 1 saat geçerlidir.</p>
        <p>Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
      </div>
    `,
  }),
  
  invoiceSent: (invoiceNumber: string, amount: number, dueDate: string, clientName: string) => ({
    subject: `Fatura ${invoiceNumber} - JurisFlow`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Yeni Fatura</h2>
        <p>Merhaba ${clientName},</p>
        <p>Size yeni bir fatura gönderilmiştir:</p>
        <ul>
          <li><strong>Fatura No:</strong> ${invoiceNumber}</li>
          <li><strong>Tutar:</strong> ${amount.toFixed(2)} TL</li>
          <li><strong>Vade Tarihi:</strong> ${dueDate}</li>
        </ul>
        <p>Faturanızı görüntülemek için müvekkil portalınıza giriş yapabilirsiniz.</p>
      </div>
    `,
  }),
  
  notification: (title: string, message: string, recipientName: string) => ({
    subject: title,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${title}</h2>
        <p>Merhaba ${recipientName},</p>
        <p>${message}</p>
      </div>
    `,
  }),
};

