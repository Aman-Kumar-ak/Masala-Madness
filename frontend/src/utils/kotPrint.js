export function buildKotDataFromOrder(order) {
  if (!order) return null;
  return {
    orderNumber: order.orderNumber,
    createdAt: formatKotDate(order.createdAt),
    items: (order.items || []).map((item) => ({
      name: item.name,
      type: item.type,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
    })),
    totalAmount: order.totalAmount,
  };
}

export function buildKotDataFromPendingOrder(order, isFirstKOT) {
  if (!order) return null;
  const kotData = {
    orderNumber: order.orderNumber,
    createdAt: formatKotDate(order.createdAt),
    kotNumber: isFirstKOT ? 1 : order.kotNumber || 1,
    items: (order.items || []).map((item) => ({
      name: item.name,
      type: item.type,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
      kotNumber: isFirstKOT ? 1 : item.kotNumber,
    })),
    totalAmount: order.totalAmount,
  };
  if (isFirstKOT) kotData.KOT = 1;
  return kotData;
}

function formatKotDate(date) {
  const d = date ? new Date(date) : new Date();
  return d
    .toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
    .replace(',', '');
}

export function sendKotToPrinter(kotData) {
  if (!kotData?.orderNumber || !kotData?.items?.length) return false;
  if (!window.AndroidBridge?.sendOrderDetails) return false;
  window.AndroidBridge.sendOrderDetails(JSON.stringify(kotData));
  return true;
}
