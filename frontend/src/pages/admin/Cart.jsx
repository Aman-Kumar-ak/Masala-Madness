import React, { useEffect, useState } from "react";
import { useCart } from "../../components/CartContext";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";
import Notification from "../../components/Notification";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { useNotification } from "../../components/NotificationContext";
import useKeyboardScrollAdjustment from "../../hooks/useKeyboardScrollAdjustment";
import { api } from '../../utils/api';

export default function Cart() {
  useKeyboardScrollAdjustment();
  const { cartItems, removeFromCart, clearCart, updateQuantity } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("");
  const [activeDiscount, setActiveDiscount] = useState(null);
  const navigate = useNavigate();
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPendingConfirm, setShowPendingConfirm] = useState(false);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [defaultUpiAddress, setDefaultUpiAddress] = useState(null);
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const [manualDiscount, setManualDiscount] = useState(0);
  const [showSplashScreen, setShowSplashScreen] = useState(false);
  const [manualPayment, setManualPayment] = useState({ cash: 0, online: 0 });
  const [showCustomPaymentDialog, setShowCustomPaymentDialog] = useState(false);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const groupedItems = cartItems.reduce((acc, item) => {
    const existing = acc.find(i => i.name === item.name);
    if (existing) {
      existing.types.push({ type: item.type, quantity: item.quantity, price: item.price });
    } else {
      acc.push({ name: item.name, types: [{ type: item.type, quantity: item.quantity, price: item.price }] });
    }
    return acc;
  }, []);

  // Calculate discount if applicable
  const calculateDiscount = () => {
    let percentageDiscount = 0;
    if (activeDiscount && subtotal >= activeDiscount.minOrderAmount) {
      percentageDiscount = Math.round((subtotal * activeDiscount.percentage) / 100);
    }
    // Ensure manual discount does not exceed the remaining amount after percentage discount
    const maxManualDiscount = Math.max(0, subtotal - percentageDiscount);
    const finalManualDiscount = Math.min(manualDiscount, maxManualDiscount);

    return percentageDiscount + finalManualDiscount;
  };

  const discountAmount = calculateDiscount();
  const totalAmount = subtotal - discountAmount;

  // Fetch active discount and default UPI address on component mount
  useEffect(() => {
    const fetchActiveDiscount = async () => {
      try {
        const data = await api.get('/discounts/active');
        setActiveDiscount(data);
      } catch (error) {
        console.error('Error fetching discount:', error);
      }
    };

    const fetchDefaultUpiAddress = async () => {
      try {
        const data = await api.get('/upi');
        const defaultAddress = data.find(addr => addr.isDefault);
        if (defaultAddress) {
          setDefaultUpiAddress(defaultAddress);
        } else if (data.length > 0) {
          setDefaultUpiAddress(data[0]);
        }
      } catch (error) {
        console.error('Error fetching UPI addresses:', error);
      }
    };

    fetchActiveDiscount();
    fetchDefaultUpiAddress();
  }, []);

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
    setManualPayment({ cash: 0, online: 0 }); // Reset manual payment on method change
    
    if (method === "Online") {
      // Check if we have a default UPI address to generate QR code
      if (defaultUpiAddress) {
        generateQRCode();
      } else {
        // If no UPI addresses are set up, just show regular confirmation
        setShowPaymentConfirm(true);
      }
    } else if (method === "Custom") {
      setShowCustomPaymentDialog(true);
    } else {
      // For Cash payments, show the regular confirmation
      setShowPaymentConfirm(true);
    }
    
    setShowPaymentOptions(false);
  };

  const generateQRCode = () => {
    if (!defaultUpiAddress) {
      showError("No UPI address configured for QR payments");
      return;
    }
    
    try {
      // Create UPI payment URL
      // Format: upi://pay?pa=UPI_ID&pn=PAYEE_NAME&am=AMOUNT&cu=INR&tn=NOTE
      let upiUrl = `upi://pay?pa=${encodeURIComponent(defaultUpiAddress.upiId)}`;
      
      // Add merchant name
      upiUrl += `&pn=${encodeURIComponent("Masala Madness")}`;
      
      // Add amount
      upiUrl += `&am=${encodeURIComponent(totalAmount)}`;
      
      // Always add currency as INR
      upiUrl += `&cu=INR`;
      
      // Add payment note
      upiUrl += `&tn=${encodeURIComponent(`Payment for Order - Masala Madness`)}`;
      
      // Use a QR code generation service
      const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}&margin=10`;
      
      setQrCodeUrl(qrCodeImageUrl);
      setShowQrCode(true);
    } catch (error) {
      console.error("Error generating QR code:", error);
      showError("Failed to generate QR code");
      // Fall back to regular confirmation
      setShowPaymentConfirm(true);
    }
  };

  const handleQrConfirmPayment = async () => {
    await processPayment(true, 'Online'); // Pass 'Online' as payment method for QR confirmation
    setShowQrCode(false);
  };

  const handleShowPaymentOptions = () => {
    if (cartItems.length === 0) {
      showWarning("Your cart is empty. Add items before proceeding.");
      return;
    }
    
    if (isProcessing) return;
    
    setShowPaymentOptions(true);
  };

  const handleAddToPending = async () => {
    if (cartItems.length === 0) {
      showWarning("Your cart is empty. Add items before proceeding.");
      return;
    }
    
    if (isProcessing) return;
    
    // Show confirmation dialog instead of processing immediately
    setShowPendingConfirm(true);
  };

  const confirmAddToPending = async () => {
    await processPayment(false);
    setShowPendingConfirm(false);
  };

  const handleConfirmWithKOT = async () => {
    setShowPaymentConfirm(false);
    setShowPaymentOptions(false);
    setShowQrCode(false);
    setShowCustomPaymentDialog(false);
    setShowSplashScreen(true);
    await processPayment(true, true); // true = isPaid, true = printKOT
  };

  const processPayment = async (isPaid, printKOT = false) => {
    if (isProcessing) return;
    setIsProcessing(true);
    let finalPaymentMethod = paymentMethod;
    let customCashAmount = 0;
    let customOnlineAmount = 0;
    if (paymentMethod === "Custom") {
      finalPaymentMethod = `Custom (Cash: ₹${manualPayment.cash.toFixed(2)}, Online: ₹${manualPayment.online.toFixed(2)})`;
      customCashAmount = manualPayment.cash;
      customOnlineAmount = manualPayment.online;
    }
    const payload = {
      items: cartItems.map((item) => ({
        dishId: item.id || "custom",
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        type: item.type,
        totalPrice: item.quantity * item.price
      })),
      subtotal,
      totalAmount,
      discountAmount,
      discountPercentage: activeDiscount?.percentage || 0,
      manualDiscount,
      paymentMethod: isPaid ? finalPaymentMethod : "",
      isPaid,
      customCashAmount: isPaid && paymentMethod === "Custom" ? customCashAmount : undefined,
      customOnlineAmount: isPaid && paymentMethod === "Custom" ? customOnlineAmount : undefined,
    };
    try {
      if (isPaid) {
        setShowPaymentConfirm(false);
        setShowPaymentOptions(false);
        setShowQrCode(false);
        setShowCustomPaymentDialog(false);
        setShowSplashScreen(true);
        const res = await api.post('/orders/confirm', payload);
        const data = res;
        if (data && data.message) {
          showSuccess(`Payment successful! Order confirmed for ₹${totalAmount.toFixed(2)}`);
          // Send KOT data to app if available
          if (window.AndroidBridge && window.AndroidBridge.sendOrderDetails && data.order) {
            const kotData = {
              orderNumber: data.order.orderNumber,
              createdAt: data.order.createdAt,
              items: (data.order.items || []).map(item => ({
                name: item.name,
                type: item.type,
                quantity: item.quantity
              }))
            };
            if (kotData.orderNumber && kotData.createdAt && kotData.items.length > 0) {
              try {
                console.log('[KOT] Sending to app:', kotData);
                console.log('[KOT][DEBUG] About to call window.AndroidBridge.sendOrderDetails with:', JSON.stringify(kotData));
                window.AndroidBridge.sendOrderDetails(JSON.stringify(kotData));
              } catch (err) {
                console.error('Failed to send KOT to app:', err);
              }
            } else {
              console.warn('KOT data missing required fields, not sending to app:', kotData);
            }
          }
          clearCart();
          setTimeout(() => {
            navigate("/");
          }, 1500);
        } else {
          throw new Error((data && data.message) || "Failed to process order");
        }
      } else {
        // Add to pending logic
        const res = await api.post('/pending-orders', payload);
        const data = res;
        if (data && data.message) {
          showInfo(`Order added to pending. Amount: ₹${totalAmount.toFixed(2)}`);
          clearCart();
          setTimeout(() => {
            navigate("/");
          }, 1500);
        } else {
          throw new Error((data && data.message) || "Failed to add order to pending");
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      showError("Failed to process order: " + error.message);
    } finally {
      setIsProcessing(false);
      setShowSplashScreen(false);
    }
  };

  const handleConfirmClearCart = () => {
    clearCart();
    setShowClearCartConfirm(false);
    showInfo("Cart cleared successfully");
  };

  const handleManualDiscountChange = (val) => {
    let percentageDiscount = 0;
    if (activeDiscount && subtotal >= activeDiscount.minOrderAmount) {
      percentageDiscount = Math.round((subtotal * activeDiscount.percentage) / 100);
    }
    const maxManualDiscount = Math.max(0, subtotal - percentageDiscount);
    if (val > maxManualDiscount) {
      showWarning(`Manual discount cannot exceed ₹${maxManualDiscount.toFixed(2)} (total minus percentage discount)`);
      return;
    }
    setManualDiscount(val);
  };

  // Add global handlers for handshake and print status
  if (typeof window !== 'undefined') {
    window.onKOTReceived = function() {
      console.log('[KOT] App acknowledged receipt of KOT data');
      // Optionally show a notification: Printing started...
    };
    window.onKOTPrinted = function() {
      console.log('[KOT] App reports KOT printed');
      // Optionally show a notification: Printing successful!
    };
    window.onKOTPrintFailed = function() {
      console.log('[KOT] App reports KOT print failed');
      // Optionally show a notification: Printing failed!
    };
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <BackButton />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-400 to-yellow-300 text-white shadow-md">
        <div className="container mx-auto px-4 py-6 pt-16">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <span className="text-4xl mr-2">🛒</span> Your Cart
          </h1>
          {cartItems.length > 0 && (
            <div className="text-white/90 text-base">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6 text-lg">Add some delicious items from the menu!</p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-lg rounded-lg shadow-md transition-colors duration-200"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-xl text-gray-800">Order Items</h2>
              </div>
              
              <div className="divide-y divide-gray-100">
                {groupedItems.map((group, index) => (
                  <div key={`${group.name}-${index}`} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-lg text-gray-800 flex items-center">
                        <span className="w-6 h-6 inline-flex items-center justify-center bg-orange-100 text-orange-600 rounded-full text-sm mr-2">
                          {index + 1}
                        </span>
                        {group.name}
                      </h3>
                      <span className="text-right font-semibold text-lg text-gray-800">
                        ₹{group.types.reduce((sum, type) => sum + type.quantity * type.price, 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="space-y-3 pl-8">
                      {group.types.map((type, idx) => (
                        <div key={`${type.type}-${idx}`} className="bg-amber-50 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-base font-medium text-gray-700">
                              {type.type === 'H' ? 'Half' : type.type === 'F' ? 'Full' : type.type === 'N/A' || type.type === 'Fixed' || type.type === 'FIXED' ? 'Fixed' : type.type}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-base text-gray-500">₹{type.price.toFixed(2)} × {type.quantity}</span>
                              <button
                                onClick={() => removeFromCart({ name: group.name, type: type.type })}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100"
                                aria-label="Remove item"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between bg-white rounded-lg p-1 shadow-sm">
                            <button 
                              onClick={() => updateQuantity({ name: group.name, type: type.type }, type.quantity - 1)}
                              className="w-9 h-9 rounded-full bg-amber-50 hover:bg-orange-50 flex items-center justify-center text-orange-500 transition-colors duration-200"
                              disabled={type.quantity <= 1}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                              </svg>
                            </button>
                            <span className="font-medium text-gray-700 w-12 text-center text-lg">{type.quantity}</span>
                            <button 
                              onClick={() => updateQuantity({ name: group.name, type: type.type }, type.quantity + 1)}
                              className="w-9 h-9 rounded-full bg-amber-50 hover:bg-orange-50 flex items-center justify-center text-orange-500 transition-colors duration-200"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="font-bold text-xl mb-4 text-gray-800">Order Summary</h3>
              <div className="space-y-3 text-lg">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
              
                {activeDiscount && subtotal >= activeDiscount.minOrderAmount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({activeDiscount.percentage}%):</span>
                    <span>-₹{Math.round(subtotal * activeDiscount.percentage / 100).toFixed(2)}</span>
                  </div>
                )}

                {/* Manual Discount Input */}
                <div className="flex justify-between items-center text-gray-600 mb-2">
                    <span className="font-medium">Discount:</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={manualDiscount || ''}
                            onChange={(e) => handleManualDiscountChange(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-24 text-right border rounded-md px-2 py-1 text-sm focus:ring-orange-500 focus:border-orange-500"
                            placeholder="0.00"
                            min="0"
                            step="any"
                        />
                        {manualDiscount > 0 && (
                            <button
                                onClick={() => setManualDiscount(0)}
                                className="p-1 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                                aria-label="Remove manual discount"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex justify-between font-bold text-xl pt-3 border-t border-gray-100 text-gray-800">
                  <span>Total Discount:</span>
                  <span className="text-green-600">-₹{discountAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-bold text-xl pt-3 text-gray-800">
                  <span>Amount:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>

                {activeDiscount && subtotal < activeDiscount.minOrderAmount && (
                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100 text-base text-orange-700">
                    <p className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Add items worth ₹{(activeDiscount.minOrderAmount - subtotal).toFixed(2)} more to get {activeDiscount.percentage}% discount!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleShowPaymentOptions}
                  disabled={isProcessing}
                  className={`py-3 px-2 rounded-xl font-medium transition-all duration-200 text-white shadow-md flex items-center justify-center text-base md:text-lg ${
                    isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  } max-[380px]:text-sm max-[320px]:text-xs`}
                >
                  <span className="text-center">Confirm Payment</span>
                </button>
                <button
                  onClick={handleAddToPending}
                  disabled={isProcessing}
                  className={`py-3 px-2 rounded-xl font-medium transition-all duration-200 text-white shadow-md flex items-center justify-center text-base md:text-lg ${
                    isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
                  } max-[380px]:text-sm max-[320px]:text-xs`}
                >
                  <span className="text-center">Add to Pending</span>
                </button>
              </div>

              <button
                onClick={() => setShowClearCartConfirm(true)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3.5 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 text-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear Cart</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Payment Dialog */}
      <ConfirmationDialog
        isOpen={showQrCode}
        onClose={() => setShowQrCode(false)}
        title="Scan QR Code to Pay"
        message={`Total Amount: ₹${totalAmount.toFixed(2)}`}
        customContent={
          <div className="flex flex-col items-center gap-4 w-full max-w-[95vw] sm:max-w-[400px] mx-auto">
            <div className="bg-white p-5 sm:p-4 rounded-lg border-2 border-orange-200 shadow-md mb-2 flex items-center justify-center w-full">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="Payment QR Code"
                  className="w-[200px] h-[200px] sm:w-64 sm:h-64 object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/qr-code.png";
                    showError("QR code generation failed. Please try again.");
                  }}
                />
              ) : (
                <div className="w-[180px] h-[180px] sm:w-64 sm:h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="animate-spin h-12 w-12 border-4 border-orange-500 rounded-full border-t-transparent"></div>
                </div>
              )}
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 w-full text-center">
              <p className="font-medium text-gray-700">Paying to:</p>
              <p className="font-medium text-blue-600 text-lg">{defaultUpiAddress?.upiId}</p>
              <p className="text-sm text-gray-600 mt-1">{defaultUpiAddress?.name}</p>
            </div>
            <div className="flex flex-col gap-3 w-full mt-2">
              <button
                onClick={async () => {
                  setShowQrCode(false);
                  setShowPaymentOptions(false);
                  setShowPaymentConfirm(false);
                  setShowCustomPaymentDialog(false);
                  await processPayment(true, true); // printKOT = true
                }}
                className="w-full py-3 rounded-lg font-medium bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
                disabled={isProcessing}
              >
                Confirm and Print
              </button>
              <button
                onClick={async () => {
                  setShowQrCode(false);
                  setShowPaymentOptions(false);
                  setShowPaymentConfirm(false);
                  setShowCustomPaymentDialog(false);
                  await processPayment(true, false); // printKOT = false
                }}
                className="w-full py-3 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
                disabled={isProcessing}
              >
                Confirm
              </button>
            </div>
          </div>
        }
        confirmText={null}
        cancelText="Cancel"
        type="info"
        isLoading={isProcessing}
      />

      {/* Payment Options Dialog */}
      <ConfirmationDialog
        isOpen={showPaymentOptions}
        onClose={() => setShowPaymentOptions(false)}
        title="Select Payment Method"
        message="How would the customer like to pay?"
        customContent={
          <div className="flex flex-wrap justify-center gap-3 w-full">
            <button
              onClick={() => handlePaymentMethodSelect("Cash")}
              className="flex-1 min-w-[calc(50%-0.75rem)] py-3 px-3 rounded-lg font-medium bg-orange-500 hover:bg-orange-600 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Cash
            </button>
            <button
              onClick={() => handlePaymentMethodSelect("Online")}
              className="flex-1 min-w-[calc(50%-0.75rem)] py-3 px-3 rounded-lg font-medium bg-yellow-500 hover:bg-yellow-600 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Online
            </button>
            <button
              onClick={() => handlePaymentMethodSelect("Custom")}
              className="w-full py-3 px-3 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2 mt-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Custom
            </button>
          </div>
        }
        confirmText={null}
        cancelText="Cancel"
        type="info"
        isLoading={isProcessing}
      />

      {/* Custom Payment Dialog */}
      <ConfirmationDialog
        isOpen={showCustomPaymentDialog}
        onClose={() => setShowCustomPaymentDialog(false)}
        title="Enter Custom Payment Amounts"
        message={`Order Total: ₹${totalAmount.toFixed(2)}`}
        customContent={
          <div className="space-y-4 w-full">
            <div>
              <label htmlFor="cash-amount" className="block text-sm font-medium text-gray-700 mb-1">Cash Amount</label>
              <input
                type="number"
                id="cash-amount"
                value={manualPayment.cash === 0 && manualPayment.online === 0 ? '' : manualPayment.cash}
                onChange={(e) => {
                  const cashValue = Math.max(0, parseFloat(e.target.value) || 0);
                  const newCash = Math.min(cashValue, totalAmount);
                  const newOnline = Math.max(0, totalAmount - newCash);
                  setManualPayment({ cash: newCash, online: newOnline });
                }}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setManualPayment(prev => ({ ...prev, cash: 0 }));
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                step="any"
                min="0"
                max={totalAmount}
              />
            </div>
            <div>
              <label htmlFor="online-amount" className="block text-sm font-medium text-gray-700 mb-1">Online Amount</label>
              <input
                type="number"
                id="online-amount"
                value={manualPayment.online === 0 && manualPayment.cash === 0 ? '' : manualPayment.online}
                onChange={(e) => {
                  const onlineValue = Math.max(0, parseFloat(e.target.value) || 0);
                  const newOnline = Math.min(onlineValue, totalAmount);
                  const newCash = Math.max(0, totalAmount - newOnline);
                  setManualPayment({ cash: newCash, online: newOnline });
                }}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setManualPayment(prev => ({ ...prev, online: 0 }));
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                step="any"
                min="0"
                max={totalAmount}
              />
            </div>
            <div className="flex flex-col gap-3 w-full mt-2">
              <button
                onClick={async () => {
                  const totalPaid = manualPayment.cash + manualPayment.online;
                  if (Math.abs(totalPaid - totalAmount) > 0.01) {
                    showError(`Total custom payment (₹${totalPaid.toFixed(2)}) does not match order total (₹${totalAmount.toFixed(2)})`);
                    return;
                  }
                  setShowCustomPaymentDialog(false);
                  setShowPaymentOptions(false);
                  setShowPaymentConfirm(false);
                  setShowQrCode(false);
                  setShowSplashScreen(true);
                  await processPayment(true, true); // printKOT = true
                }}
                className="w-full py-3 rounded-lg font-medium bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
                disabled={isProcessing}
              >
                Confirm and Print
              </button>
              <button
                onClick={async () => {
                  const totalPaid = manualPayment.cash + manualPayment.online;
                  if (Math.abs(totalPaid - totalAmount) > 0.01) {
                    showError(`Total custom payment (₹${totalPaid.toFixed(2)}) does not match order total (₹${totalAmount.toFixed(2)})`);
                    return;
                  }
                  setShowCustomPaymentDialog(false);
                  setShowPaymentOptions(false);
                  setShowPaymentConfirm(false);
                  setShowQrCode(false);
                  await processPayment(true, false); // printKOT = false
                }}
                className="w-full py-3 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
                disabled={isProcessing}
              >
                Confirm
              </button>
            </div>
          </div>
        }
        confirmText={null}
        cancelText="Cancel"
        type="info"
        isLoading={isProcessing}
      />

      {/* Payment Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showPaymentConfirm}
        onClose={() => setShowPaymentConfirm(false)}
        title="Confirm Payment"
        message={`Confirm ${paymentMethod} payment of ₹${totalAmount.toFixed(2)}?`}
        customContent={
          <div className="flex flex-col gap-3">
            <button
              onClick={handleConfirmWithKOT}
              className="w-full py-3 rounded-lg font-medium bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
              disabled={isProcessing}
            >
              Confirm and Print
            </button>
            <button
              onClick={() => {
                setShowPaymentConfirm(false);
                setShowPaymentOptions(false);
                processPayment(true, false);
              }}
              className="w-full py-3 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-colors text-lg flex items-center justify-center gap-2"
              disabled={isProcessing}
            >
              Confirm
            </button>
          </div>
        }
        confirmText={null}
        cancelText="Cancel"
        type="warning"
        isLoading={isProcessing}
      />

      {/* Add to Pending Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showPendingConfirm}
        onClose={() => setShowPendingConfirm(false)}
        onConfirm={confirmAddToPending}
        title="Add to Pending Orders"
        message={`Add this order (₹${totalAmount.toFixed(2)}) to pending orders?`}
        confirmText="Yes, Add to Pending"
        cancelText="Cancel"
        type="warning"
        isLoading={isProcessing}
      />

      {/* Clear Cart Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showClearCartConfirm}
        onClose={() => setShowClearCartConfirm(false)}
        onConfirm={handleConfirmClearCart}
        title="Clear Cart"
        message={`Are you sure you want to remove all ${cartItems.length} items from your cart?`}
        confirmText="Yes, Clear Cart"
        cancelText="Cancel"
        type="danger"
        isLoading={isProcessing}
      />

      {/* Full-screen Loading Splash Screen */}
      {showSplashScreen && (
        <div className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-[100] flex items-center justify-center flex-col">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mb-4"></div>
          <p className="text-gray-700 text-xl font-medium">Confirming Order Payment...</p>
        </div>
      )}
    </div>
  );
}
