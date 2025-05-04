import React, { useState, useRef, useEffect } from "react";
import { Link } from 'react-router-dom';
import BackButton from "../components/BackButton";
import { useNotification } from "../components/NotificationContext";

export default function Qr() {
  const [upiId, setUpiId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("Payment for Masala Madness");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [upiLink, setUpiLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRawLink, setShowRawLink] = useState(false);
  const qrRef = useRef(null);
  const upiLinkRef = useRef(null);
  const { showSuccess, showError } = useNotification();

  // Load saved UPI ID from localStorage on component mount
  useEffect(() => {
    const savedUpiId = localStorage.getItem('masalaMadness_upiId');
    if (savedUpiId) {
      setUpiId(savedUpiId);
    }
  }, []);

  // Function to generate QR code
  const generateQRCode = (e) => {
    e.preventDefault();
    
    if (!upiId) {
      showError("UPI ID is required");
      return;
    }
    
    // Save UPI ID to localStorage for future use
    localStorage.setItem('masalaMadness_upiId', upiId);
    
    setIsLoading(true);
    
    try {
      // Create UPI payment URL
      // Format: upi://pay?pa=UPI_ID&pn=PAYEE_NAME&am=AMOUNT&cu=INR&tn=NOTE
      let upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}`;
      
      // Add merchant name
      upiUrl += `&pn=${encodeURIComponent("Masala Madness")}`;
      
      // Add optional parameters if provided
      if (amount && amount > 0) {
        upiUrl += `&am=${encodeURIComponent(amount)}`;
      }
      
      // Always add currency as INR
      upiUrl += `&cu=INR`;
      
      // Add payment note if provided
      if (note) {
        upiUrl += `&tn=${encodeURIComponent(note)}`;
      }
      
      // Store the UPI link for display
      setUpiLink(upiUrl);
      
      // Use a different QR code generation service that's more reliable
      const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}&margin=10`;
      
      setQrCodeUrl(qrCodeImageUrl);
      showSuccess("QR code generated successfully");
    } catch (error) {
      console.error("Error generating QR code:", error);
      showError("Failed to generate QR code");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    // Not implementing actual copy functionality since we're dealing with an image
    showSuccess("QR code ready for sharing");
  };
  
  const copyUpiLink = () => {
    if (upiLinkRef.current) {
      upiLinkRef.current.select();
      document.execCommand('copy');
      showSuccess("UPI link copied to clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      <BackButton />
      <div className="container mx-auto px-4 py-8 pt-16">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-400 to-yellow-400 p-4 text-white">
            <h1 className="text-2xl font-bold text-center">UPI Payment QR Code</h1>
            <p className="text-center opacity-90">Generate QR codes for customer payments</p>
          </div>

          <div className="p-6">
            {/* QR Code Generator Form */}
            <form onSubmit={generateQRCode} className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="upiId" className="block text-sm font-medium text-gray-700 mb-1">
                    UPI ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="upiId"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹) <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Note
                </label>
                <input
                  type="text"
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Payment note"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Generate QR Code</span>
                  </>
                )}
              </button>
            </form>

            {/* QR Code Display */}
            {qrCodeUrl && (
              <div className="flex flex-col items-center border-t border-gray-200 pt-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Your UPI QR Code</h2>
                <div 
                  ref={qrRef}
                  className="bg-white p-6 border-2 border-orange-200 rounded-lg shadow-md mb-4 flex items-center justify-center"
                >
                  <img
                    src={qrCodeUrl}
                    alt="UPI QR Code"
                    className="w-56 h-56 md:w-64 md:h-64 object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/qr-code.png";
                      showError("QR code generation failed. Please try again.");
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 mb-4 text-center">
                  Scan this QR code with any UPI app (GPay, PhonePe, Paytm, etc.) to make a payment
                </p>
                
                {/* UPI Link Section */}
                {upiLink && (
                  <div className="w-full mb-4">
                    <button 
                      onClick={() => setShowRawLink(!showRawLink)}
                      className="text-blue-600 text-sm mb-2 flex items-center gap-1 mx-auto"
                    >
                      {showRawLink ? 'Hide UPI Link' : 'Show UPI Link'} 
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showRawLink ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
                      </svg>
                    </button>
                    
                    {showRawLink && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center">
                        <input
                          ref={upiLinkRef}
                          type="text"
                          value={upiLink}
                          readOnly
                          className="w-full text-sm bg-transparent border-none focus:ring-0 text-gray-600"
                        />
                        <button
                          onClick={copyUpiLink}
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={copyToClipboard}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 border border-blue-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                  </button>
                  
                  <a
                    href={qrCodeUrl}
                    download="upi-qr-code.png"
                    className="bg-green-50 text-green-600 hover:bg-green-100 font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 border border-green-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 border-t border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Instructions</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>Enter your UPI ID (required)</li>
              <li>Optionally specify an amount for fixed price items</li>
              <li>Customers can scan this QR code with any UPI app to pay</li>
              <li>Show this QR code to customers for easy payment</li>
              <li>Download the QR code to print or share with customers</li>
            </ul>
          </div>
        </div>

        {/* Display logo/icon at the bottom */}
        <div className="mt-8 flex justify-center">
          <img 
            src="/images/qr-code.png" 
            alt="QR Code" 
            className="w-16 h-16 opacity-60"
          />
        </div>
      </div>
    </div>
  );
}
