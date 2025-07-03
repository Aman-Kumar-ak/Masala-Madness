// Utility for KOT printing from web app, designed for Android WebView integration
// This version does NOT use BLE/Web Bluetooth. It bridges to native Android code via JS interface.

/**
 * Format a KOT receipt for 58mm printers (max 32-40 chars per line)
 * @param {Object} params
 * @param {number|string} params.orderNumber
 * @param {string} params.date
 * @param {Array} params.items - Array of { qty, name, price }
 * @param {number|string} params.total
 * @param {string} params.paymentMode
 * @returns {string}
 */
export function formatKOT({ orderNumber, date, items, total, paymentMode }) {
  const pad = (str, len) => (str + ' '.repeat(len)).slice(0, len);
  const padLeft = (str, len) => (' '.repeat(len) + str).slice(-len);
  let lines = [];
  lines.push("Masala Madness");
  lines.push(`Order No: #${orderNumber}`);
  lines.push(`Date: ${date}`);
  lines.push("-------------------------------");
  items.forEach(item => {
    lines.push(
      pad(`${item.qty}x ${item.name}`, 24) + padLeft(`₹${item.price}`, 8)
    );
  });
  lines.push("-------------------------------");
  lines.push(pad("Total:", 24) + padLeft(`₹${total}`, 8));
  lines.push(`Payment Mode: ${paymentMode}`);
  lines.push("\n\n");
  return lines.join("\n");
}

/**
 * Print KOT via Android WebView bridge or browser fallback
 * @param {string} kotText
 */
export function printKOT(kotText) {
  if (window.AndroidPrinter && typeof window.AndroidPrinter.printKOT === 'function') {
    window.AndroidPrinter.printKOT(kotText);
  } else {
    // Fallback for browser testing
    const win = window.open('', '', 'width=300,height=600');
    win.document.write(`<pre>${kotText}</pre>`);
    win.print();
    win.close();
  }
} 