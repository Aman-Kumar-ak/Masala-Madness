// Utility for Bluetooth KOT printing with real Web Bluetooth API logic

let printerDevice = null;
let printerServer = null;
let printerCharacteristic = null;

const PRINTER_NAME = 'MPT-II';
// Replace with your printer's service/characteristic UUIDs if needed
const SERVICE_UUID = 0xFFE0; // Common for many thermal printers, may need adjustment
const CHARACTERISTIC_UUID = 0xFFE1;

/**
 * Connect to the Bluetooth printer (MPT-II)
 * @returns {Promise<boolean>} true if connected
 */
export async function connectToPrinter() {
  try {
    printerDevice = await navigator.bluetooth.requestDevice({
      filters: [{ name: PRINTER_NAME }],
      optionalServices: [SERVICE_UUID]
    });
    printerServer = await printerDevice.gatt.connect();
    const service = await printerServer.getPrimaryService(SERVICE_UUID);
    printerCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    return true;
  } catch (err) {
    console.error('Bluetooth printer connection failed:', err);
    disconnectPrinter();
    return false;
  }
}

/**
 * Disconnect from the printer
 */
export function disconnectPrinter() {
  if (printerDevice && printerDevice.gatt.connected) {
    printerDevice.gatt.disconnect();
  }
  printerDevice = null;
  printerServer = null;
  printerCharacteristic = null;
}

/**
 * Check if printer is connected
 */
export function isPrinterConnected() {
  return printerDevice && printerDevice.gatt.connected;
}

/**
 * Format KOT receipt for printing
 * @param {Object} params
 * @param {number|string} params.orderNumber
 * @param {number} params.kotNumber
 * @param {Date} params.date
 * @param {Array} params.items - Array of { name, quantity }
 * @returns {string}
 */
export function formatKOTReceipt({ orderNumber, kotNumber, date, items }) {
  const pad = (str, len) => (str + ' '.repeat(len)).slice(0, len);
  const padRight = (str, len) => (str + ' '.repeat(len)).slice(0, len);
  const padLeft = (str, len) => (' '.repeat(len) + str).slice(-len);
  const dt = date instanceof Date ? date : new Date(date);
  const dateStr = dt.toLocaleString('en-IN', { hour12: false });
  let lines = [];
  lines.push(`Order #${orderNumber}   KOT #${kotNumber}`);
  lines.push(dateStr);
  lines.push('');
  lines.push(padRight('Item Name', 16) + padLeft('Qty', 4));
  items.forEach(item => {
    lines.push(padRight(item.name, 16) + padLeft(item.quantity, 4));
  });
  lines.push('\n\n');
  return lines.join('\n');
}

/**
 * Print KOT receipt via Bluetooth using ESC/POS
 * @param {string} receiptText
 * @returns {Promise<void>}
 */
export async function printKOTViaBluetooth(receiptText) {
  if (!printerCharacteristic) {
    throw new Error('Printer not connected');
  }
  // Convert text to CP437 encoding (basic for most ESC/POS printers)
  const encoder = new TextEncoder('ibm437'); // 'ibm437' is CP437
  const data = encoder.encode(receiptText + '\n\n\x1D\x56\x00'); // Add feed & cut command
  // Send in chunks (max 20 bytes per BLE packet)
  for (let i = 0; i < data.length; i += 20) {
    await printerCharacteristic.writeValue(data.slice(i, i + 20));
  }
} 