/**
 * Web Worker for handling CPU-intensive calculations
 * This helps prevent blocking the main thread and UI jitter
 */

// Cache for memoization
const calculationCache = new Map();

// Handle messages from the main thread
self.onmessage = function(e) {
  const { id, type, data } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case 'order-total':
        result = calculateOrderTotal(data);
        break;
      case 'discount-calculation':
        result = calculateDiscount(data);
        break;
      case 'tax-calculation':
        result = calculateTax(data);
        break;
      default:
        throw new Error(`Unknown calculation type: ${type}`);
    }
    
    // Return the result to the main thread
    self.postMessage({
      id,
      type,
      result,
      error: null
    });
  } catch (error) {
    // Return any errors to the main thread
    self.postMessage({
      id,
      type,
      result: null,
      error: error.message
    });
  }
};

/**
 * Calculate the total for an order including any applied discounts
 * @param {Object} data - Order data including items and any discount
 * @returns {Object} Total calculation results
 */
function calculateOrderTotal(data) {
  const { items, discount } = data;
  const cacheKey = JSON.stringify(data);
  
  // Check cache first
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey);
  }
  
  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  // Calculate discount if applicable
  let discountAmount = 0;
  if (discount) {
    discountAmount = calculateDiscount({
      subtotal,
      percentage: discount.percentage,
      minOrderAmount: discount.minOrderAmount
    }).discountAmount;
  }
  
  // Calculate final total
  const total = subtotal - discountAmount;
  
  const result = {
    subtotal,
    discountAmount,
    total
  };
  
  // Cache the result
  calculationCache.set(cacheKey, result);
  
  return result;
}

/**
 * Calculate a discount amount based on order subtotal and discount rules
 * @param {Object} data - Data including subtotal and discount rules
 * @returns {Object} Discount calculation results
 */
function calculateDiscount(data) {
  const { subtotal, percentage, minOrderAmount } = data;
  const cacheKey = JSON.stringify(data);
  
  // Check cache first
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey);
  }
  
  // Check if order meets minimum amount for discount
  let discountAmount = 0;
  let isApplicable = false;
  
  if (subtotal >= minOrderAmount) {
    discountAmount = Math.round((subtotal * percentage) / 100);
    isApplicable = true;
  }
  
  const result = {
    discountAmount,
    isApplicable,
    finalAmount: subtotal - discountAmount
  };
  
  // Cache the result
  calculationCache.set(cacheKey, result);
  
  return result;
}

/**
 * Calculate tax based on order amount and tax rate
 * @param {Object} data - Data including amount and tax rate
 * @returns {Object} Tax calculation results
 */
function calculateTax(data) {
  const { amount, taxRate } = data;
  const cacheKey = JSON.stringify(data);
  
  // Check cache first
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey);
  }
  
  const taxAmount = Math.round((amount * taxRate) / 100);
  
  const result = {
    taxAmount,
    totalWithTax: amount + taxAmount
  };
  
  // Cache the result
  calculationCache.set(cacheKey, result);
  
  return result;
}

// Clean up cache periodically to prevent memory leaks
setInterval(() => {
  if (calculationCache.size > 1000) {
    // Only keep most recent entries
    const entries = Array.from(calculationCache.entries());
    const recentEntries = entries.slice(-500); // Keep only the 500 most recent
    
    calculationCache.clear();
    
    for (const [key, value] of recentEntries) {
      calculationCache.set(key, value);
    }
  }
}, 60000); // Cleanup every minute 