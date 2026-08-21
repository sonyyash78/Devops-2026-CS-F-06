import Notification from '../models/Notification.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { runExpiryReport, runLowStockReport, runEmailReminders } from '../utils/notificationScheduler.js';

// @desc    Get notification history for a specific user
// @route   GET /api/notifications/:userId
// @access  Private
export const getNotificationHistory = async (req, res, next) => {
  const { userId } = req.params;

  try {
    // Security check: Customers can only fetch their own notification logs
    if (req.user.role === 'customer' && req.user._id.toString() !== userId) {
      res.status(403);
      throw new Error('Not authorized to access these notification logs');
    }

    const logs = await Notification.find({ recipientId: userId })
      .populate('recipientId', 'name email')
      .sort({ sentAt: -1 });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a customer medication reminder
// @route   POST /api/notifications/reminders
// @access  Private
export const createReminder = async (req, res, next) => {
  const { medicineName, phoneNumber, time } = req.body;

  if (!medicineName || !phoneNumber) {
    res.status(400);
    return next(new Error('Medicine name and phone number are required'));
  }

  try {
    const reminder = await Reminder.create({
      customerId: req.user._id,
      medicineName,
      phoneNumber,
      time: time || '10:00 AM',
    });

    res.status(201).json(reminder);
  } catch (error) {
    next(error);
  }
};

// @desc    Get active reminders for a customer
// @route   GET /api/notifications/reminders/customer/:customerId
// @access  Private
