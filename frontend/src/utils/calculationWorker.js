/**
 * Utility to interface with Web Worker for CPU-intensive calculations
 * This helps prevent UI jitter by offloading heavy calculations to a separate thread
 */

// Keep track of callbacks by ID
const callbacks = new Map();
let nextId = 1;

// Create the worker
let worker = null;

// Initialize worker on first use
const initWorker = () => {
  if (worker === null) {
    try {
      worker = new Worker('/calculation-worker.js');
      
      // Set up message handler
      worker.onmessage = (e) => {
        const { id, result, error } = e.data;
        
        // Find the callback for this ID
        if (callbacks.has(id)) {
          const { resolve, reject } = callbacks.get(id);
          
          if (error) {
            reject(new Error(error));
          } else {
            resolve(result);
          }
          
          // Remove the callback
          callbacks.delete(id);
        }
      };
      
      // Handle worker errors
      worker.onerror = (error) => {
        console.error('Calculation worker error:', error);
        
        // Reject all pending callbacks
        for (const { reject } of callbacks.values()) {
          reject(new Error('Worker error: ' + error.message));
        }
        
        // Clear all callbacks
        callbacks.clear();
        
        // Try to restart the worker
        worker.terminate();
        worker = null;
      };
    } catch (err) {
      console.error('Failed to initialize calculation worker:', err);
      worker = null;
    }
  }
  
  return worker !== null;
};

/**
 * Calculate the total for an order through the web worker
 * @param {Object} items - Order items array
 * @param {Object} discount - Discount object (optional)
 * @returns {Promise<Object>} - Calculation results
 */
export const calculateOrderTotal = (items, discount) => {
  return runCalculation('order-total', { items, discount });
};

/**
 * Calculate a discount amount through the web worker
 * @param {number} subtotal - Order subtotal
 * @param {number} percentage - Discount percentage
 * @param {number} minOrderAmount - Minimum order amount for discount eligibility
 * @returns {Promise<Object>} - Discount calculation results
 */
export const calculateDiscount = (subtotal, percentage, minOrderAmount) => {
  return runCalculation('discount-calculation', { subtotal, percentage, minOrderAmount });
};

/**
 * Calculate tax through the web worker
 * @param {number} amount - Amount to calculate tax on
 * @param {number} taxRate - Tax rate percentage
 * @returns {Promise<Object>} - Tax calculation results
 */
export const calculateTax = (amount, taxRate) => {
  return runCalculation('tax-calculation', { amount, taxRate });
};

/**
 * Run a calculation in the worker
 * @param {string} type - Calculation type
 * @param {Object} data - Calculation data
 * @returns {Promise<any>} - Result from worker
 */
const runCalculation = (type, data) => {
  return new Promise((resolve, reject) => {
    // Handle fallback calculations if worker is not available
    if (!initWorker()) {
      console.warn('Calculation worker not available, using fallback calculations');
      
      try {
        let result;
        
        switch (type) {
          case 'order-total':
            result = fallbackCalculateOrderTotal(data);
            break;
          case 'discount-calculation':
            result = fallbackCalculateDiscount(data);
            break;
          case 'tax-calculation':
            result = fallbackCalculateTax(data);
            break;
          default:
            throw new Error(`Unknown calculation type: ${type}`);
        }
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      return;
    }
    
    // Generate a unique ID for this calculation
    const id = nextId++;
    
    // Store the callbacks
    callbacks.set(id, { resolve, reject });
    
    // Send the calculation to the worker
    worker.postMessage({ id, type, data });
    
    // Set a timeout to prevent hanging calculations
    setTimeout(() => {
      if (callbacks.has(id)) {
        console.warn('Calculation timed out, using fallback calculation');
        
        try {
          let result;
          
          switch (type) {
            case 'order-total':
              result = fallbackCalculateOrderTotal(data);
              break;
            case 'discount-calculation':
              result = fallbackCalculateDiscount(data);
              break;
            case 'tax-calculation':
              result = fallbackCalculateTax(data);
              break;
            default:
              throw new Error(`Unknown calculation type: ${type}`);
          }
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
        
        callbacks.delete(id);
      }
    }, 5000); // 5 second timeout
  });
};

// Fallback calculation functions if the worker is not available

function fallbackCalculateOrderTotal(data) {
  const { items, discount } = data;
  
  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  // Calculate discount if applicable
  let discountAmount = 0;
  if (discount) {
    discountAmount = fallbackCalculateDiscount({
      subtotal,
      percentage: discount.percentage,
      minOrderAmount: discount.minOrderAmount
    }).discountAmount;
  }
  
  // Calculate final total
  const total = subtotal - discountAmount;
  
  return {
    subtotal,
    discountAmount,
    total
  };
}

function fallbackCalculateDiscount(data) {
  const { subtotal, percentage, minOrderAmount } = data;
  
  // Check if order meets minimum amount for discount
  let discountAmount = 0;
  let isApplicable = false;
  
  if (subtotal >= minOrderAmount) {
    discountAmount = Math.round((subtotal * percentage) / 100);
    isApplicable = true;
  }
  
  return {
    discountAmount,
    isApplicable,
    finalAmount: subtotal - discountAmount
  };
}

function fallbackCalculateTax(data) {
  const { amount, taxRate } = data;
  
  const taxAmount = Math.round((amount * taxRate) / 100);
  
  return {
    taxAmount,
    totalWithTax: amount + taxAmount
  };
} 