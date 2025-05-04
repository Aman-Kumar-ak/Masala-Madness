const express = require('express');
const router = express.Router();
const UpiAddress = require('../models/UpiAddress');

// Get all UPI addresses
router.get('/', async (req, res) => {
  try {
    const upiAddresses = await UpiAddress.find().sort({ isDefault: -1, createdAt: -1 });
    res.json(upiAddresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get default UPI address
router.get('/default', async (req, res) => {
  try {
    const defaultUpi = await UpiAddress.findOne({ isDefault: true });
    if (!defaultUpi) {
      // If no default is set, return the most recent one
      const mostRecent = await UpiAddress.findOne().sort({ createdAt: -1 });
      return res.json(mostRecent);
    }
    res.json(defaultUpi);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get UPI address by ID
router.get('/:id', async (req, res) => {
  try {
    const upiAddress = await UpiAddress.findById(req.params.id);
    if (!upiAddress) {
      return res.status(404).json({ message: 'UPI address not found' });
    }
    res.json(upiAddress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new UPI address
router.post('/', async (req, res) => {
  try {
    const { name, upiId, description, isDefault } = req.body;
    
    if (!name || !upiId) {
      return res.status(400).json({ message: 'Name and UPI ID are required' });
    }
    
    // Validate UPI ID format (basic validation)
    const upiRegex = /^[\w\.\-]+@[\w\.\-]+$/;
    if (!upiRegex.test(upiId)) {
      return res.status(400).json({ message: 'Invalid UPI ID format. Expected format: username@provider' });
    }
    
    try {
      const newUpiAddress = new UpiAddress({
        name,
        description: description || '',
        isDefault: isDefault || false,
      });
      
      // Use the virtual property setter for encryption
      newUpiAddress.upiId = upiId;
      
      await newUpiAddress.save();
      res.status(201).json(newUpiAddress);
    } catch (error) {
      console.error('Error saving UPI address:', error);
      return res.status(500).json({ message: 'Failed to save UPI address: ' + error.message });
    }
  } catch (error) {
    console.error('Error in POST /api/upi:', error);
    res.status(400).json({ message: error.message || 'Failed to create UPI address' });
  }
});

// Update a UPI address
router.put('/:id', async (req, res) => {
  try {
    const { name, upiId, description, isDefault } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isDefault !== undefined) updates.isDefault = isDefault;
    
    const upiAddress = await UpiAddress.findById(req.params.id);
    
    if (!upiAddress) {
      return res.status(404).json({ message: 'UPI address not found' });
    }
    
    // Update fields
    Object.keys(updates).forEach(key => {
      upiAddress[key] = updates[key];
    });
    
    // Update UPI ID if provided (this will trigger encryption)
    if (upiId) {
      // Validate UPI ID format
      const upiRegex = /^[\w\.\-]+@[\w\.\-]+$/;
      if (!upiRegex.test(upiId)) {
        return res.status(400).json({ message: 'Invalid UPI ID format. Expected format: username@provider' });
      }
      
      try {
        upiAddress.upiId = upiId;
      } catch (error) {
        return res.status(500).json({ message: 'Failed to encrypt UPI ID: ' + error.message });
      }
    }
    
    try {
      await upiAddress.save();
      res.json(upiAddress);
    } catch (error) {
      console.error('Error saving updated UPI address:', error);
      return res.status(500).json({ message: 'Failed to save UPI address: ' + error.message });
    }
  } catch (error) {
    console.error('Error in PUT /api/upi/:id:', error);
    res.status(400).json({ message: error.message || 'Failed to update UPI address' });
  }
});

// Set a UPI address as default
router.patch('/:id/default', async (req, res) => {
  try {
    const upiAddress = await UpiAddress.findById(req.params.id);
    
    if (!upiAddress) {
      return res.status(404).json({ message: 'UPI address not found' });
    }
    
    upiAddress.isDefault = true;
    await upiAddress.save();
    
    res.json(upiAddress);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a UPI address
router.delete('/:id', async (req, res) => {
  try {
    const result = await UpiAddress.deleteOne({ _id: req.params.id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'UPI address not found' });
    }
    
    res.json({ message: 'UPI address deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 