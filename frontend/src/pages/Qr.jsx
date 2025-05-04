import React, { useState, useRef, useEffect } from "react";
import { Link } from 'react-router-dom';
import BackButton from "../components/BackButton";
import { useNotification } from "../components/NotificationContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Qr() {
  const [upiId, setUpiId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("Payment for Masala Madness");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [upiLink, setUpiLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRawLink, setShowRawLink] = useState(false);
  
  // For stored UPI addresses
  const [savedUpiAddresses, setSavedUpiAddresses] = useState([]);
  const [isAddingUpi, setIsAddingUpi] = useState(false);
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [currentUpiAddress, setCurrentUpiAddress] = useState(null);
  const [newUpiAddress, setNewUpiAddress] = useState({
    name: '',
    upiId: '',
    description: '',
    isDefault: false
  });
  
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

  // Load saved UPI addresses from the database
  useEffect(() => {
    fetchUpiAddresses();
  }, []);

  // Fetch all UPI addresses from the database
  const fetchUpiAddresses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/upi`);
      if (!response.ok) throw new Error('Failed to fetch UPI addresses');
      
      const data = await response.json();
      setSavedUpiAddresses(data);
      
      // If addresses were found, select the default one
      if (data.length > 0) {
        const defaultAddress = data.find(addr => addr.isDefault) || data[0];
        setCurrentUpiAddress(defaultAddress);
        setUpiId(defaultAddress.upiId);
      }
    } catch (error) {
      console.error('Error fetching UPI addresses:', error);
      showError('Could not load saved UPI addresses');
    }
  };

  // Create a new UPI address
  const createUpiAddress = async () => {
    try {
      if (!newUpiAddress.name || !newUpiAddress.upiId) {
        showError('Name and UPI ID are required');
        return;
      }
      
      // Basic UPI validation on frontend
      const upiRegex = /^[\w\.\-]+@[\w\.\-]+$/;
      if (!upiRegex.test(newUpiAddress.upiId)) {
        showError('Invalid UPI ID format. Expected format: username@provider');
        return;
      }
      
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/upi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUpiAddress)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create UPI address');
      }
      
      await fetchUpiAddresses();
      setIsAddingUpi(false);
      setNewUpiAddress({
        name: '',
        upiId: '',
        description: '',
        isDefault: false
      });
      showSuccess('UPI address saved successfully');
    } catch (error) {
      console.error('Error creating UPI address:', error);
      showError(error.message || 'Failed to create UPI address');
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing UPI address
  const updateUpiAddress = async () => {
    if (!currentUpiAddress || !currentUpiAddress._id) return;
    
    try {
      // Basic validation
      if (!newUpiAddress.name || !newUpiAddress.upiId) {
        showError('Name and UPI ID are required');
        return;
      }
      
      // Basic UPI validation on frontend
      const upiRegex = /^[\w\.\-]+@[\w\.\-]+$/;
      if (!upiRegex.test(newUpiAddress.upiId)) {
        showError('Invalid UPI ID format. Expected format: username@provider');
        return;
      }
      
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/upi/${currentUpiAddress._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUpiAddress)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update UPI address');
      }
      
      await fetchUpiAddresses();
      setIsEditingUpi(false);
      showSuccess('UPI address updated successfully');
    } catch (error) {
      console.error('Error updating UPI address:', error);
      showError(error.message || 'Failed to update UPI address');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a UPI address
  const deleteUpiAddress = async (id) => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/upi/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete UPI address');
      }
      
      await fetchUpiAddresses();
      showSuccess('UPI address deleted successfully');
      
      // Clear current UPI address if it was deleted
      if (currentUpiAddress && currentUpiAddress._id === id) {
        setCurrentUpiAddress(null);
        setUpiId('');
      }
    } catch (error) {
      console.error('Error deleting UPI address:', error);
      showError(error.message || 'Failed to delete UPI address');
    } finally {
      setIsLoading(false);
    }
  };

  // Set a UPI address as default
  const setDefaultUpiAddress = async (id) => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/upi/${id}/default`, {
        method: 'PATCH'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set default UPI address');
      }
      
      await fetchUpiAddresses();
      showSuccess('Default UPI address updated');
    } catch (error) {
      console.error('Error setting default UPI address:', error);
      showError(error.message || 'Failed to set default UPI address');
    } finally {
      setIsLoading(false);
    }
  };

  // Select a UPI address for use
  const selectUpiAddress = (address) => {
    // If selecting a different UPI, reset existing QR code
    if (currentUpiAddress?._id !== address._id) {
      // Clear the QR code and related states
      setQrCodeUrl("");
      setUpiLink("");
      setShowRawLink(false);
    }
    
    setCurrentUpiAddress(address);
    setUpiId(address.upiId);
    showSuccess(`Selected UPI: ${address.name}`);
  };

  // Start editing a UPI address
  const startEditingUpiAddress = (address) => {
    setNewUpiAddress({
      name: address.name,
      upiId: address.upiId,
      description: address.description || '',
      isDefault: address.isDefault
    });
    setIsEditingUpi(true);
  };

  // Function to generate QR code
  const generateQRCode = (e) => {
    e.preventDefault();
    
    if (!upiId) {
      showError("UPI ID is required");
      return;
    }
    
    // Clear existing QR code if UPI ID has changed
    if (upiLink && upiLink.indexOf(encodeURIComponent(upiId)) === -1) {
      setQrCodeUrl("");
      setUpiLink("");
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
            {/* Saved UPI Addresses */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Saved UPI Addresses</h2>
                <button
                  onClick={() => {
                    setIsAddingUpi(true);
                    setIsEditingUpi(false);
                    setNewUpiAddress({
                      name: '',
                      upiId: '',
                      description: '',
                      isDefault: savedUpiAddresses.length === 0
                    });
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add New</span>
                </button>
              </div>

              {savedUpiAddresses.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                  No saved UPI addresses. Add one to get started.
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {savedUpiAddresses.map((address) => (
                    <div 
                      key={address._id}
                      className={`border rounded-lg p-3 ${
                        currentUpiAddress && currentUpiAddress._id === address._id
                          ? qrCodeUrl 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      } transition-colors duration-200`}
                    >
                      <div className="flex justify-between">
                        <div className="flex items-start gap-2">
                          <div 
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              currentUpiAddress && currentUpiAddress._id === address._id
                                ? qrCodeUrl 
                                  ? 'bg-green-100 text-green-600' 
                                  : 'bg-blue-100 text-blue-600'
                                : address.isDefault 
                                  ? 'bg-yellow-100 text-yellow-600' 
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {currentUpiAddress && currentUpiAddress._id === address._id ? (
                              qrCodeUrl ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )
                            ) : address.isDefault ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              {address.name}
                              {currentUpiAddress && currentUpiAddress._id === address._id && (
                                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${qrCodeUrl ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {qrCodeUrl ? 'QR Active' : 'Selected'}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">{address.upiId}</div>
                            {address.description && (
                              <div className="text-xs text-gray-500 mt-1">{address.description}</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => selectUpiAddress(address)}
                            className={`p-1.5 ${
                              currentUpiAddress && currentUpiAddress._id === address._id 
                                ? qrCodeUrl 
                                  ? 'text-green-600 hover:bg-green-50' 
                                  : 'text-blue-600 hover:bg-blue-50' 
                                : 'text-blue-600 hover:bg-blue-50'
                            } rounded`}
                            title={currentUpiAddress && currentUpiAddress._id === address._id ? "Already selected" : "Use this UPI"}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          {!address.isDefault && (
                            <button
                              onClick={() => setDefaultUpiAddress(address._id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Set as default"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => startEditingUpiAddress(address)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteUpiAddress(address._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form to Add/Edit UPI Address */}
            {(isAddingUpi || isEditingUpi) && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {isEditingUpi ? 'Edit UPI Address' : 'Add New UPI Address'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUpiAddress.name}
                      onChange={(e) => setNewUpiAddress({...newUpiAddress, name: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Personal, Business"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UPI ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUpiAddress.upiId}
                      onChange={(e) => setNewUpiAddress({...newUpiAddress, upiId: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="yourname@upi"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newUpiAddress.description}
                      onChange={(e) => setNewUpiAddress({...newUpiAddress, description: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional description"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={newUpiAddress.isDefault}
                      onChange={(e) => setNewUpiAddress({...newUpiAddress, isDefault: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                      Set as default UPI address
                    </label>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={isEditingUpi ? updateUpiAddress : createUpiAddress}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex-1 flex items-center justify-center gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{isEditingUpi ? 'Update' : 'Save'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingUpi(false);
                        setIsEditingUpi(false);
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Generator Form */}
            <form onSubmit={generateQRCode} className="mb-6 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Generate QR Code</h3>
              
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
              <li>Save frequently used UPI IDs for quick access</li>
              <li>Generate QR codes that customers can scan to pay</li>
              <li>Optionally set an amount for fixed-price items</li>
              <li>All UPI addresses are stored securely and encrypted</li>
              <li>Set one UPI address as default for quick access</li>
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
