import Bill from '../models/Bill.js';
import Medicine from '../models/Medicine.js';
import User from '../models/User.js';
import { checkExpiryStatus } from '../utils/expiryCheck.js';
import PDFDocument from 'pdfkit';

// @desc    Create a new bill
// @route   POST /api/bills
// @access  Private
export const createBill = async (req, res, next) => {
  const { customerId, items, discount, paymentMethod } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400);
    return next(new Error('Bill items list cannot be empty'));
  }

  try {
    // Determine customerId and pharmacistId based on role
    let finalCustomerId = customerId;
    let finalPharmacistId = null;

    if (req.user.role === 'customer') {
      finalCustomerId = req.user._id;
    } else {
      // Pharmacist or admin creating the bill
      finalPharmacistId = req.user._id;
      if (!finalCustomerId) {
        res.status(400);
        return next(new Error('Customer ID is required for pharmacists to create a bill'));
      }
    }

    // Verify customer exists
    const customer = await User.findById(finalCustomerId);
    if (!customer) {
      res.status(404);
      return next(new Error('Customer not found'));
    }

    const expiredItems = [];
    const insufficientStockItems = [];
    const validatedItems = [];
    let subtotal = 0;

    // 1. Loop through each item and check validations
    for (const item of items) {
      const medicine = await Medicine.findById(item.medicineId);

      if (!medicine) {
        res.status(404);
        return next(new Error(`Medicine with ID ${item.medicineId} not found`));
      }

      // Check Expiry Status
      const expiryStatus = checkExpiryStatus(medicine.expiryDate);
      if (expiryStatus === 'EXPIRED') {
        expiredItems.push(`${medicine.name} (Batch: ${medicine.batchNumber})`);
      }

      // Check Stock Availability
      if (medicine.quantity < item.quantity) {
        insufficientStockItems.push(
          `${medicine.name} (Requested: ${item.quantity}, Available: ${medicine.quantity})`
        );
      }

      subtotal += medicine.price * item.quantity;

      validatedItems.push({
        medicineId: medicine._id,
        name: medicine.name,
        quantity: item.quantity,
        unitPrice: medicine.price,
        expiryStatus,
        expiryDate: medicine.expiryDate,
        ref: medicine, // keep ref to update stock later
      });
    }

    // 2. Reject if any item is expired
    if (expiredItems.length > 0) {
      return res.status(403).json({
        message: `Billing rejected. The following medicines are expired and cannot be billed: ${expiredItems.join(', ')}`,
        code: 'MEDICINE_EXPIRED',
        expiredMedicines: expiredItems,
      });
    }

    // 3. Reject if any item has insufficient stock
    if (insufficientStockItems.length > 0) {
      res.status(400);
      return next(
        new Error(
          `Billing rejected due to insufficient stock levels: ${insufficientStockItems.join(', ')}`
        )
      );
    }

    // 4. Calculate total
    const finalDiscount = Number(discount) || 0;
    const total = Math.max(0, subtotal - finalDiscount);

    // 5. Create the Bill record
    const bill = await Bill.create({
      pharmacistId: finalPharmacistId,
      customerId: finalCustomerId,
      items: validatedItems.map((item) => ({
        medicineId: item.medicineId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        expiryStatus: item.expiryStatus,
        expiryDate: item.expiryDate,
      })),
      subtotal,
      discount: finalDiscount,
      total,
      paymentMethod: paymentMethod || 'Card',
    });

    // 6. Automatically reduce stock quantity in Medicine collection
    for (const item of validatedItems) {
      item.ref.quantity -= item.quantity;
      await item.ref.save();
    }

    const populatedBill = await Bill.findById(bill._id)
      .populate('customerId', 'name email')
      .populate('pharmacistId', 'name email');

    res.status(201).json(populatedBill);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bills for a specific customer
// @route   GET /api/bills/customer/:customerId
// @access  Private
export const getCustomerBills = async (req, res, next) => {
  const { customerId } = req.params;

  try {
    // Security check: Customers can only view their own bills
    if (req.user.role === 'customer' && req.user._id.toString() !== customerId) {
      res.status(403);
      throw new Error('Not authorized to access this customer billing history');
    }

    const bills = await Bill.find({ customerId })
      .populate('customerId', 'name email')
      .populate('pharmacistId', 'name email')
      .sort({ createdAt: -1 });

    res.json(bills);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate downloadable PDF Invoice for a bill
// @route   GET /api/bills/:id/pdf
// @access  Private
