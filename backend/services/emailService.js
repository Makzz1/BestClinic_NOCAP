const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendRegistrationEmail(patientEmail, patientName, tokenNumber, doctorName, estimatedWaitMins, queuePosition) {
    if (!patientEmail || !process.env.MAIL_USER || !process.env.MAIL_PASS) return;

    try {
      const mailOptions = {
        from: `"QueueCure Clinic" <${process.env.MAIL_USER}>`,
        to: patientEmail,
        subject: `Token Confirmed: #${tokenNumber} with Dr. ${doctorName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #4F46E5;">Registration Successful</h2>
            <p>Hello <strong>${patientName}</strong>,</p>
            <p>You have been successfully added to the queue for <strong>Dr. ${doctorName}</strong>.</p>
            <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6B7280;">Your Token Number</p>
              <h1 style="margin: 5px 0; color: #111827; font-size: 32px;">#${tokenNumber}</h1>
            </div>
            <p style="font-size: 16px;">Current position in queue: <strong>${queuePosition}</strong></p>
            <p style="font-size: 16px;">Estimated wait time: <strong>~${estimatedWaitMins} minutes</strong></p>
            <p>We will notify you again when your turn is approaching.</p>
            <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">Thank you for using QueueCure!</p>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Registration Email sent to ${patientEmail} for Token #${tokenNumber}: ${info.messageId}`);
    } catch (error) {
      console.error(`Failed to send registration email to ${patientEmail}:`, error.message);
    }
  }

  async sendQueueUpdateEmail(patientEmail, patientName, tokenNumber, doctorName, estimatedWaitMins) {
    if (!patientEmail || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.log(`Skipping email for Token #${tokenNumber}: Missing email configuration or recipient email.`);
      return;
    }

    try {
      const mailOptions = {
        from: `"QueueCure Clinic" <${process.env.MAIL_USER}>`,
        to: patientEmail,
        subject: `Your Turn is Approaching! (Token #${tokenNumber})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #4F46E5;">QueueCure Update</h2>
            <p>Hello <strong>${patientName}</strong>,</p>
            <p>Your turn with <strong>Dr. ${doctorName}</strong> is approaching!</p>
            <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6B7280;">Your Token Number</p>
              <h1 style="margin: 5px 0; color: #111827; font-size: 32px;">#${tokenNumber}</h1>
            </div>
            <p style="font-size: 16px;">Estimated wait time: <strong>~${estimatedWaitMins} minutes</strong></p>
            <p>Please return to the clinic waiting area so you don't miss your turn.</p>
            <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">Thank you for using QueueCure!</p>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${patientEmail} for Token #${tokenNumber}: ${info.messageId}`);
    } catch (error) {
      console.error(`Failed to send email to ${patientEmail}:`, error.message);
    }
  }
}

module.exports = new EmailService();
