import Medicine from '../models/Medicine.js';
import { checkExpiryStatus } from '../utils/expiryCheck.js';
import Tesseract from 'tesseract.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// @desc    Get all medicines (with filters)
// @route   GET /api/medicines
// @access  Private
export const getAllMedicines = async (req, res, next) => {
  const { search, category, status, reorder } = req.query;

  try {
    const query = {};

    // 1. Search filter (name, genericName, manufacturer)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
      ];
    }

    // 2. Category filter
    if (category) {
      query.category = category;
    }

    // 3. Expiry status filter
    if (status) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const msInDay = 24 * 60 * 60 * 1000;
      const thirtyDays = new Date(today.getTime() + 30 * msInDay);
      const sixtyDays = new Date(today.getTime() + 60 * msInDay);
      const ninetyDays = new Date(today.getTime() + 90 * msInDay);

      if (status === 'EXPIRED') {
        query.expiryDate = { $lt: today };
      } else if (status === 'CRITICAL') {
        query.expiryDate = { $gte: today, $lte: thirtyDays };
      } else if (status === 'WARNING') {
        query.expiryDate = { $gt: thirtyDays, $lte: sixtyDays };
      } else if (status === 'CAUTION') {
        query.expiryDate = { $gt: sixtyDays, $lte: ninetyDays };
      } else if (status === 'SAFE') {
        query.expiryDate = { $gt: ninetyDays };
      }
    }

    // 4. Reorder level filter (quantity <= reorderLevel)
    if (reorder === 'true') {
      query.$expr = { $lte: ['$quantity', '$reorderLevel'] };
    }

    const medicines = await Medicine.find(query)
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    // Append calculated status to each item for frontend convenience
    const medicinesWithStatus = medicines.map((med) => {
      const medObj = med.toObject();
      medObj.expiryStatus = checkExpiryStatus(med.expiryDate);
      return medObj;
    });

    res.json(medicinesWithStatus);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new medicine
// @route   POST /api/medicines
// @access  Private/Pharmacist,Superadmin
export const createMedicine = async (req, res, next) => {
  const {
    name,
    genericName,
    manufacturer,
    batchNumber,
    expiryDate,
    manufactureDate,
    quantity,
    reorderLevel,
    price,
    category,
    barcode,
    labelImageUrl,
  } = req.body;

  try {
    const batchExists = await Medicine.findOne({ batchNumber });
    if (batchExists) {
      res.status(400);
      throw new Error(`A medicine with batch number '${batchNumber}' already exists.`);
    }

    const medicine = await Medicine.create({
      name,
      genericName,
      manufacturer,
      batchNumber,
      expiryDate,
      manufactureDate,
      quantity,
      reorderLevel,
      price,
      category,
      barcode,
      labelImageUrl,
      createdBy: req.user._id,
    });

    const populatedMed = await Medicine.findById(medicine._id).populate('createdBy', 'name email');
    const medObj = populatedMed.toObject();
    medObj.expiryStatus = checkExpiryStatus(populatedMed.expiryDate);

    res.status(201).json(medObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a medicine
// @route   PUT /api/medicines/:id
// @access  Private/Pharmacist,Superadmin
