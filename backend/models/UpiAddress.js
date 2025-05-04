const mongoose = require('mongoose');
const crypto = require('crypto');

// Define encryption key and algorithm
// In production, these should be stored in environment variables
// We use a fixed key for development, but in production this should be an environment variable
const RAW_KEY = process.env.UPI_ENCRYPTION_KEY || 'masala-madness-secure-encryption-key-2024';
// Create a fixed-length 32-byte key using SHA-256 hash
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_KEY).digest();
const IV_LENGTH = 16; // For AES, this is always 16 bytes

// Helper functions for encryption/decryption
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

function decrypt(text) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return ''; // Return empty string on decryption failure
  }
}

const upiAddressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  encryptedUpiId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual property for the unencrypted UPI ID
upiAddressSchema.virtual('upiId')
  .get(function() {
    return decrypt(this.encryptedUpiId);
  })
  .set(function(value) {
    this.encryptedUpiId = encrypt(value);
  });

// Pre-save hook to ensure only one default UPI address
upiAddressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // Find and unset any other default UPI addresses
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

// Convert to JSON properly (include virtual fields)
upiAddressSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.encryptedUpiId; // Don't expose the encrypted value
    return ret;
  }
});

const UpiAddress = mongoose.model('UpiAddress', upiAddressSchema);

module.exports = UpiAddress; 