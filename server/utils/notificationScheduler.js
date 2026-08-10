import cron from 'node-cron';
import nodemailer from 'nodemailer';
import Medicine from '../models/Medicine.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Reminder from '../models/Reminder.js';
import { checkExpiryStatus } from './expiryCheck.js';

// Setup Nodemailer email transporter
const getEmailTransporter = () => {
  const isSmtpConfigured =
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (isSmtpConfigured) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Ethereal fake SMTP fallback
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'mock_user',
        pass: 'mock_pass',
      },
    });
  }
};

// --- CRON JOB 1: Daily Expiry Report at 8:00 AM ---
export const runExpiryReport = async () => {
  console.log('Running daily medicine expiry check...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const msInDay = 24 * 60 * 60 * 1000;
    const ninetyDaysFromNow = new Date(today.getTime() + 90 * msInDay);

    // Find medicines expiring within 90 days (not yet expired)
    const medicines = await Medicine.find({
      expiryDate: { $gte: today, $lte: ninetyDaysFromNow },
    });

    if (medicines.length === 0) {
      console.log('No medicines expiring within 90 days.');
      return { status: 'success', message: 'No expiring medicines found' };
    }

    // Group by status
    const grouped = {
      CRITICAL: [],
      WARNING: [],
      CAUTION: [],
    };

    medicines.forEach((med) => {
      const status = checkExpiryStatus(med.expiryDate);
      const diffTime = new Date(med.expiryDate).getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / msInDay);
      const item = { med, diffDays };

      if (status === 'CRITICAL') grouped.CRITICAL.push(item);
      else if (status === 'WARNING') grouped.WARNING.push(item);
      else if (status === 'CAUTION') grouped.CAUTION.push(item);
    });

    // Find all pharmacists
    const pharmacists = await User.find({ role: 'pharmacist' });
    if (pharmacists.length === 0) {
      console.log('No pharmacists registered to receive expiry report.');
      return { status: 'success', message: 'No pharmacists found' };
    }

    // Build HTML table content
    let htmlContent = `
      <h2 style="color: #0f172a; font-family: sans-serif;">Pharmadesk Expiry Warning Report</h2>
      <p style="color: #475569; font-family: sans-serif;">The following medicines are expiring within 90 days. Please review stocks.</p>
    `;

    const addGroupTable = (title, items, color) => {
      if (items.length === 0) return '';
      let tableHtml = `
        <h3 style="color: ${color}; font-family: sans-serif; margin-top: 20px;">${title} (${items.length} items)</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: sans-serif; width: 100%; text-align: left; border-color: #cbd5e1;">
          <tr style="background-color: #f8fafc; color: #334155;">
            <th>Medicine Name</th>
            <th>Batch No</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Expiry Date</th>
            <th>Days Remaining</th>
          </tr>
      `;

      items.forEach(({ med, diffDays }) => {
        tableHtml += `
          <tr>
            <td><strong>${med.name}</strong><br><span style="font-size: 11px; color: #64748b;">${med.genericName}</span></td>
            <td><code>${med.batchNumber}</code></td>
            <td>${med.category}</td>
            <td>${med.quantity}</td>
            <td>${new Date(med.expiryDate).toLocaleDateString()}</td>
            <td style="color: ${color}; font-weight: bold;">${diffDays} days</td>
          </tr>
        `;
      });

      tableHtml += `</table>`;
      return tableHtml;
    };

    htmlContent += addGroupTable('CRITICAL (Expiring &le; 30 Days)', grouped.CRITICAL, '#ef4444');
    htmlContent += addGroupTable('WARNING (Expiring &le; 60 Days)', grouped.WARNING, '#f97316');
    htmlContent += addGroupTable('CAUTION (Expiring &le; 90 Days)', grouped.CAUTION, '#eab308');

    htmlContent += `
      <p style="font-size: 11px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
        Pharmadesk Medicine System - Scheduled Automation Report
      </p>
    `;

    const medSummary = medicines.map((m) => {
      const status = checkExpiryStatus(m.expiryDate);
      const diffTime = new Date(m.expiryDate).getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / msInDay);
      return `- ${m.name} (Batch: ${m.batchNumber}) [${status}]: ${diffDays} days remaining.`;
    }).join('\n');

    const detailedMessage = `Daily Expiry Report:\n${medSummary}`;

    const transporter = getEmailTransporter();

    // Send emails to all pharmacists
    for (const pharmacist of pharmacists) {
      try {
        const isEthereal = transporter.options.host === 'smtp.ethereal.email';
        
        const mailOptions = {
          from: `"Pharmadesk Notifications" <${process.env.SMTP_USER || 'no-reply@pharmadesk.com'}>`,
          to: pharmacist.email,
          subject: '⚠️ Daily Expiry Report - Pharmadesk Pharmacy',
          html: htmlContent,
        };

        if (isEthereal) {
          console.log(`[MOCK EMAIL] Sent to ${pharmacist.email}: Expiry Report`);
        } else {
          await transporter.sendMail(mailOptions);
        }

        // Log Notification in DB
        await Notification.create({
          recipientId: pharmacist._id,
          type: 'Email',
          message: detailedMessage,
          status: 'sent',
        });
      } catch (err) {
        console.error(`Failed sending expiry report to ${pharmacist.email}:`, err.message);
        await Notification.create({
          recipientId: pharmacist._id,
          type: 'Email',
          message: `Daily Expiry Report failed: ${err.message}`,
          status: 'failed',
        });
      }
    }

    return { status: 'success', message: 'Expiry reports processed' };
  } catch (error) {
    console.error('Error running expiry report cron:', error);
    return { status: 'error', error: error.message };
  }
};

// --- CRON JOB 2: Daily Low Stock Alert at 9:00 AM ---
