const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

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

  async sendPrescriptionEmail(patientEmail, patientName, tokenNumber, doctorName, prescription, instructions) {
    if (!patientEmail || !process.env.MAIL_USER || !process.env.MAIL_PASS) return;

    try {
      // Generate PDF in memory
      const pdfBuffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc.fontSize(24).fillColor('#4F46E5').text('QueueCure Clinic', { align: 'center' });
        doc.fontSize(12).fillColor('#6B7280').text('Digital Prescription', { align: 'center' });
        doc.moveDown(2);

        // Details
        doc.fillColor('#000000').fontSize(14).text(`Doctor: Dr. ${doctorName}`);
        doc.text(`Patient: ${patientName}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Token #: ${tokenNumber}`);
        doc.moveDown(2);

        // Medicines
        if (prescription) {
          doc.fontSize(16).fillColor('#4F46E5').text('Prescribed Medicines');
          doc.moveDown(0.5);
          doc.fontSize(12).fillColor('#000000').text(prescription, { lineGap: 4 });
          doc.moveDown(2);
        }

        // Instructions
        if (instructions) {
          doc.fontSize(16).fillColor('#4F46E5').text('Instructions');
          doc.moveDown(0.5);
          doc.fontSize(12).fillColor('#000000').text(instructions, { lineGap: 4 });
        }

        doc.end();
      });

      const mailOptions = {
        from: `"QueueCure Clinic" <${process.env.MAIL_USER}>`,
        to: patientEmail,
        subject: `Your Digital Prescription from Dr. ${doctorName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #4F46E5;">Digital Prescription</h2>
            <p>Hello <strong>${patientName}</strong>,</p>
            <p>Please find attached the digital prescription and instructions from your visit with <strong>Dr. ${doctorName}</strong> today.</p>
            <p>We wish you a quick recovery!</p>
            <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">Thank you for using QueueCure!</p>
          </div>
        `,
        attachments: [
          {
            filename: `Prescription_${patientName.replace(/\\s+/g, '_')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Prescription Email sent to ${patientEmail} for Token #${tokenNumber}: ${info.messageId}`);
    } catch (error) {
      console.error(`Failed to send prescription email to ${patientEmail}:`, error.message);
    }
  }
}

module.exports = new EmailService();
