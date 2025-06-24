import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';
import BackButton from "../../components/BackButton";
import { useNotification } from "../../components/NotificationContext";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import PasswordVerificationDialog from "../../components/PasswordVerificationDialog";
import { useAuth } from "../../contexts/AuthContext";
import { api } from '../../utils/api';
import useKeyboardScrollAdjustment from "../../hooks/useKeyboardScrollAdjustment";


export default function Qr() {
  const [upiId, setUpiId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("Payment for Masala Madness");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [upiLink, setUpiLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // For stored UPI addresses
  const [savedUpiAddresses, setSavedUpiAddresses] = useState([]);
  const [isAddingUpi, setIsAddingUpi] = useState(false);
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [currentUpiAddress, setCurrentUpiAddress] = useState(null);
  const [isDeletingUpiAddress, setIsDeletingUpiAddress] = useState(false);
  const [newUpiAddress, setNewUpiAddress] = useState({
    name: '',
    upiId: '',
    description: '',
    isDefault: false
  });
  
  // Authentication states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isSecretCodeAccessGranted, setIsSecretCodeAccessGranted] = useState(false);
  const { user, isAuthenticated: isLoggedIn, logout, getUserDevices, revokeDevice } = useAuth();
  const [sessionTimeLeft, setSessionTimeLeft] = useState(null);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    upiAddressId: null,
    type: 'warning'
  });
  
  const qrRef = useRef(null);
  const upiFormRef = useRef(null); // Reference for UPI form section
  const { showSuccess, showError, showInfo } = useNotification();
  const navigate = useNavigate();

  // Add state for lockoutMs, lockoutMessage, and lockoutTimer for QR secret code verification.
  // On too many failed attempts, set lockoutMs to 30 minutes (1800000 ms), set lockoutMessage, and start a timer to update lockoutTimer in 'Xm Ys' format.
  const [lockoutMs, setLockoutMs] = useState(null);
  const [lockoutMessage, setLockoutMessage] = useState("");
  const [lockoutTimer, setLockoutTimer] = useState("");

  // Check authentication status on component mount and when isLoggedIn changes
  useEffect(() => {
    const verificationExpiry = localStorage.getItem('qr_unlock_expiry');
    const currentTime = new Date().getTime();
    let accessCurrentlyGranted = false;

    if (verificationExpiry && currentTime < parseInt(verificationExpiry)) {
      accessCurrentlyGranted = true;
      const remainingMs = parseInt(verificationExpiry) - currentTime;
      const remainingMinutes = Math.floor(remainingMs / 60000);
      const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
      setSessionTimeLeft(`${remainingMinutes}m ${remainingSeconds}s`);
    } else {
      localStorage.removeItem('qr_unlock_expiry'); // Clean up expired/non-existent
      setSessionTimeLeft(null);
    }
    
    setIsSecretCodeAccessGranted(accessCurrentlyGranted);
    // Only show dialog if access is NOT currently granted and user IS logged in.
    setShowPasswordDialog(!accessCurrentlyGranted && isLoggedIn); 

  }, [isLoggedIn]);

  // Check if verification has expired periodically
  useEffect(() => {
    // Only run this timer if secret code access has been granted for this session
    if (isSecretCodeAccessGranted) {
      const timer = setInterval(() => {
        const verificationExpiry = localStorage.getItem('qr_unlock_expiry');
        const currentTime = new Date().getTime();

        if (verificationExpiry && currentTime < parseInt(verificationExpiry)) {
          const remainingMs = parseInt(verificationExpiry) - currentTime;
          const remainingMinutes = Math.floor(remainingMs / 60000);
          const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
          setSessionTimeLeft(`${remainingMinutes}m ${remainingSeconds}s`);
        } else {
          // If expired or not present, revoke access and clear timer
          localStorage.removeItem('qr_unlock_expiry');
          setSessionTimeLeft(null);
          setIsSecretCodeAccessGranted(false); // Revoke access
          showError('QR access expired. Please re-verify.');
          navigate('/'); // Redirect to home page
        }
      }, 1000); // Check every second
      
      return () => clearInterval(timer);
    } else {
      // If access is not granted, ensure timer is cleared and session time is null
      clearInterval(setInterval(() => {}, 1)); // Clear any lingering interval (just in case)
      setSessionTimeLeft(null);
    }
  }, [isSecretCodeAccessGranted, showError]);

  // Load saved UPI ID from localStorage on component mount
  useEffect(() => {
    const savedUpiId = localStorage.getItem('masalaMadness_upiId');
    if (savedUpiId) {
      setUpiId(savedUpiId);
    }
  }, []);

  // Load saved UPI addresses from the database
  useEffect(() => {
    // Only fetch if authenticated and access is granted
    if (isSecretCodeAccessGranted) {
      fetchUpiAddresses();
    }
  }, [isSecretCodeAccessGranted]);

  // Fetch all UPI addresses from the database
  const fetchUpiAddresses = async () => {
    try {
      const response = await api.get('/upi');
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

  // Handle successful password verification
  const handlePasswordSuccess = () => {
    setIsSecretCodeAccessGranted(true); // Grant access only on successful verification
    setShowPasswordDialog(false);
    const expiryTime = new Date().getTime() + (15 * 60 * 1000); // 15 minutes validity
    localStorage.setItem('qr_unlock_expiry', expiryTime.toString());
    fetchUpiAddresses(); // Fetch UPI addresses now that access is granted
    showSuccess('Access granted. QR settings unlocked.');
  };

  // Handle cancel/close of password dialog
  const handlePasswordDialogClose = () => {
    setShowPasswordDialog(false);
    // If user cancels, and they are not granted access, navigate away
    if (!isSecretCodeAccessGranted) {
      navigate('/'); 
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
      const response = await api.post('/upi', newUpiAddress);
      
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
      const response = await api.put(`/upi/${currentUpiAddress._id}`, newUpiAddress);
      
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
      setIsDeletingUpiAddress(true);
      const response = await api.delete(`/upi/${id}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete UPI address');
      }
      
      await fetchUpiAddresses();
      showSuccess('UPI address deleted successfully');
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error('Error deleting UPI address:', error);
      showError(error.message || 'Failed to delete UPI address');
    } finally {
      setIsDeletingUpiAddress(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteConfirmation = (address) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete UPI Address',
      message: `Are you sure you want to delete the UPI address for "${address.name}"? This action cannot be undone.`,
      onConfirm: () => deleteUpiAddress(address._id),
      upiAddressId: address._id,
      type: 'danger'
    });
  };

  // Set a UPI address as default
  const setDefaultUpiAddress = async (id) => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const response = await api.patch(`/upi/${id}/default`);
      
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
    }
    
    setCurrentUpiAddress(address);
    setUpiId(address.upiId);
    showSuccess(`Selected UPI: ${address.name}`);
  };

  // Start editing a UPI address
  const startEditingUpiAddress = (address) => {
    // Clear any existing QR code when editing
    setQrCodeUrl("");
    setUpiLink("");
    
    setNewUpiAddress({
      name: address.name,
      upiId: address.upiId,
      description: address.description || '',
      isDefault: address.isDefault
    });
    setIsEditingUpi(true);
    setIsAddingUpi(false);
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

  // Scrolling to UPI form function
  const scrollToUpiForm = () => {
    if (upiFormRef.current) {
      setTimeout(() => {
        upiFormRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100); // Small delay to ensure state updates before scrolling
    }
  };

  useKeyboardScrollAdjustment();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 text-zinc-900 dark:text-zinc-900">
      {showPasswordDialog && isLoggedIn && (
        <PasswordVerificationDialog
          isOpen={showPasswordDialog}
          onClose={handlePasswordDialogClose}
          onSuccess={handlePasswordSuccess}
          verificationType="secretCode"
          usedWhere="QR Access"
          currentUserId={user ? user._id : null} // Pass the current user ID for audit
          lockoutMs={lockoutMs}
          lockoutMessage={lockoutMessage}
          lockoutTimer={lockoutTimer}
          infoText="Once verified, you'll have access for 15 minutes. 3 failed attempts will lock you out for 30 minutes."
        />
      )}

      {/* Only show "Please log in" if not logged in at all */}
      {!isLoggedIn && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Please log in to access this page.</p>
        </div>
      )}

      {/* Only show main QR content if access is granted and user is logged in */}
      {isSecretCodeAccessGranted && isLoggedIn && (
        <div className="flex-1 flex flex-col">
          <div className="container mx-auto p-4 md:p-8 mt-10 md:mt-16">
            <BackButton />
            <div className="flex flex-col items-center justify-center mb-6 hidden"> {/* Hidden as content moved into card */}
              {/* <h1 className="text-3xl font-bold text-center text-gray-800">QR Code Generator</h1> */}
              {/* {isSecretCodeAccessGranted && sessionTimeLeft && (
                <div className="text-center mt-2">
                  <p className="text-sm text-gray-700">Session expires in: <span className="font-semibold">{sessionTimeLeft}</span></p>
                </div>
              )} */} 
            </div>

            {/* Main content with conditional blur */}
            <div className={`flex-1 overflow-y-auto ${!isSecretCodeAccessGranted ? 'filter blur-md pointer-events-none' : ''}`}>
              <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-0 border border-gray-200">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-lg mb-6">
                    <h1 className="text-2xl font-bold text-center text-gray-800">QR Code Generator</h1>
                    {isSecretCodeAccessGranted && sessionTimeLeft && (
                      <div className="text-center mt-2">
                        <p className="text-sm text-gray-700">Session expires in: <span className="font-semibold">{sessionTimeLeft}</span></p>
                      </div>
                    )}
                  </div>
                            
                  <div className="p-3 md:p-8">
                    {/* Mode switch buttons */}
                    <div className="mb-8 flex justify-center">
                      <div className="inline-flex bg-gray-100 p-1 rounded-lg shadow-inner">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingUpi(false);
                            setIsEditingUpi(false);
                          }}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                            !isAddingUpi && !isEditingUpi
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Generate QR
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isAddingUpi && !isEditingUpi) {
                              setIsAddingUpi(true);
                              setQrCodeUrl("");
                              setUpiLink("");
                              scrollToUpiForm(); // Scroll to form
                            }
                          }}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                            isAddingUpi || isEditingUpi
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          Manage UPI
                        </button>
                      </div>
                    </div>

                    {/* Saved UPI Addresses - Show in both modes but style differently */}
                    <div className="mb-8">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-800">
                          {isAddingUpi || isEditingUpi ? 'Manage UPI Addresses' : 'Saved UPI Addresses'}
                        </h2>
                        {(isAddingUpi || isEditingUpi) && (
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
                              scrollToUpiForm(); // Scroll to form
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 whitespace-nowrap shadow-md hover:shadow-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            disabled={isEditingUpi} // Disable when editing
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add New</span>
                          </button>
                        )}
                      </div>

                      {/* Helper text for different modes */}
                      {savedUpiAddresses.length === 0 ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500 shadow-sm">
                          No saved UPI addresses. Add one to get started.
                        </div>
                      ) : (
                        <div className="space-y-6 max-h-96 overflow-y-auto pr-2 pb-4 pt-2 px-1 md:px-2 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:space-y-0">
                          {savedUpiAddresses.map((address) => (
                            <div 
                              key={address._id}
                              className={`border-2 rounded-xl p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transform transition-all duration-200 hover:-translate-y-1 cursor-pointer ${
                                isEditingUpi && newUpiAddress.upiId === address.upiId
                                  ? 'bg-yellow-50 border-yellow-300'
                                : currentUpiAddress && currentUpiAddress._id === address._id
                                  ? qrCodeUrl 
                                    ? 'bg-green-50 border-green-300' 
                                    : 'bg-blue-50 border-blue-300'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                // Different behavior based on mode
                                if (isAddingUpi || isEditingUpi) {
                                  // In UPI management mode - fill the form with this UPI's details
                                  startEditingUpiAddress(address);
                                } else {
                                  // In QR generation mode - select this UPI for the QR code
                                  selectUpiAddress(address);
                                }
                              }}
                            >
                              <div className="flex flex-col h-full">
                                <div className="flex flex-col md:flex-row md:items-start gap-2 sm:gap-3 md:gap-4">
                                  <div 
                                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      isEditingUpi && newUpiAddress.upiId === address.upiId
                                        ? 'bg-yellow-100 text-yellow-600'
                                      : currentUpiAddress && currentUpiAddress._id === address._id
                                        ? qrCodeUrl 
                                          ? 'bg-green-100 text-green-600' 
                                          : 'bg-blue-100 text-blue-600'
                                      : address.isDefault 
                                        ? 'bg-yellow-100 text-yellow-600' 
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {isEditingUpi && newUpiAddress.upiId === address.upiId ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    ) : currentUpiAddress && currentUpiAddress._id === address._id ? (
                                      qrCodeUrl ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )
                                    ) : address.isDefault ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-grow min-w-0">
                                    <div className="font-medium text-gray-800 text-base sm:text-lg flex items-center flex-wrap gap-1 sm:gap-2">
                                      <span className="truncate max-w-[150px] sm:max-w-full">{address.name}</span>
                                      {isEditingUpi && newUpiAddress.upiId === address.upiId ? (
                                        <span className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-normal shadow-sm">
                                          Editing
                                        </span>
                                      ) : currentUpiAddress && currentUpiAddress._id === address._id && (
                                        <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${qrCodeUrl ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'} font-normal shadow-sm`}>
                                          {qrCodeUrl ? 'QR Active' : 'Selected'}
                                        </span>
                                      )}
                                      {address.isDefault && (
                                        <span className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-normal flex items-center gap-1 shadow-sm">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                          </svg>
                                          <span className="hidden xxxs:inline">Default</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm sm:text-base md:text-lg text-gray-600 mt-1 sm:mt-2 font-mono">
                                      <div className="flex flex-col">
                                        <span className="text-[10px] sm:text-xs text-gray-500">UPI ID:</span>
                                        <div className="overflow-hidden max-w-full pr-1 sm:pr-2 bg-gray-50 p-1 sm:p-2 rounded-md mt-0.5 sm:mt-1 shadow-inner">
                                          <span className="font-medium text-xs sm:text-sm md:text-base truncate inline-block max-w-full">{address.upiId}</span>
                                        </div>
                                      </div>
                                    </div>
                                    {address.description && (
                                      <div className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 line-clamp-1 sm:line-clamp-2">
                                        {address.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap justify-end gap-1 sm:gap-2 mt-2 sm:mt-3 md:mt-4">
                                  {!address.isDefault && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDefaultUpiAddress(address._id);
                                      }}
                                      className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors duration-200 shadow-sm"
                                      title="Set as default"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                      </svg>
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingUpiAddress(address);
                                    }}
                                    className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors duration-200 shadow-sm"
                                    title="Edit"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDeleteConfirmation(address);
                                    }}
                                    className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200 shadow-sm"
                                    title="Delete"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      <div ref={upiFormRef} className="bg-blue-50 p-5 rounded-lg border border-blue-200 mb-8 scroll-mt-8">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {isEditingUpi ? 
                              `Edit "${newUpiAddress.name}" UPI` : 
                              'Add New UPI Address'
                            }
                          </h3>
                          <button
                            onClick={() => {
                              setIsAddingUpi(false);
                              setIsEditingUpi(false);
                            }}
                            className="text-gray-500 hover:text-gray-700 p-1"
                            title="Close"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newUpiAddress.name}
                              onChange={(e) => setNewUpiAddress({...newUpiAddress, name: e.target.value})}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="Optional description"
                            />
                          </div>
                          
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="isDefault"
                              checked={newUpiAddress.isDefault}
                              onChange={(e) => setNewUpiAddress({...newUpiAddress, isDefault: e.target.checked})}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                            />
                            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                              Set as default UPI address
                            </label>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={isEditingUpi ? updateUpiAddress : createUpiAddress}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg flex-1 text-xs sm:text-sm font-medium whitespace-nowrap flex items-center justify-center shadow-md hover:shadow-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full mr-1 sm:mr-2"></div>
                                  <span>Processing...</span>
                                </>
                              ) : (
                                "Save"
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingUpi(false);
                                setIsEditingUpi(false);
                              }}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg flex-1 text-xs sm:text-sm font-medium whitespace-nowrap shadow-md hover:shadow-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* QR Code Generator Form - only show when not editing/adding UPI */}
                    {!isAddingUpi && !isEditingUpi && (
                      <form onSubmit={generateQRCode} className="mb-8 space-y-4 bg-white p-5 rounded-lg border border-gray-200 shadow-md">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">Generate QR Code</h3>
                          {qrCodeUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setQrCodeUrl("");
                                setUpiLink("");
                                showInfo("QR code cleared");
                              }}
                              className="p-1.5 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 flex items-center text-sm transition-colors duration-200 shadow-sm"
                              title="Clear QR Code"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="upiId" className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                              <span>UPI ID <span className="text-red-500">*</span></span>
                              {currentUpiAddress && (
                                <span className="text-xs text-blue-600 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Using saved UPI
                                </span>
                              )}
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                id="upiId"
                                value={upiId}
                                onChange={(e) => {
                                  // Only allow changes if no UPI address is selected
                                  if (!currentUpiAddress) {
                                    setUpiId(e.target.value);
                                  }
                                }}
                                placeholder={currentUpiAddress ? "UPI address selected" : "yourname@upi"}
                                className={`w-full p-3 border ${currentUpiAddress 
                                    ? "bg-gray-50 border-gray-300 cursor-not-allowed" 
                                    : "bg-white border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                                } rounded-lg`}
                                required
                                readOnly={!!currentUpiAddress}
                              />
                            </div>
                            {currentUpiAddress ? (
                              <div className="mt-2 bg-blue-50 p-2 rounded-md border border-blue-100 shadow-sm">
                                <p className="text-xs text-gray-700 flex items-center">
                                  <span className="font-medium mr-1">Name:</span> 
                                  <span className="text-blue-700">{currentUpiAddress.name}</span>
                                  {currentUpiAddress.isDefault && (
                                    <span className="ml-2 bg-yellow-100 text-yellow-700 text-[10px] px-2 py-1 rounded-full flex items-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                      </svg>
                                      Default
                                    </span>
                                  )}
                                </p>
                                {currentUpiAddress.description && (
                                  <p className="text-xs text-gray-600 mt-1">{currentUpiAddress.description}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 mt-1">
                                Enter a UPI ID or select from saved addresses above
                              </p>
                            )}
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
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
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
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full md:w-auto md:px-8 md:ml-auto md:flex md:items-center bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                              <span className="whitespace-nowrap text-sm sm:text-base">Generating...</span>
                            </>
                          ) : (
                            <span className="whitespace-nowrap text-sm sm:text-base">Generate QR Code</span>
                          )}
                        </button>
                      </form>
                    )}

                    {/* QR Code Display - only show when not editing/adding UPI */}
                    {qrCodeUrl && !isAddingUpi && !isEditingUpi && (
                      <div className="flex flex-col md:flex-row md:items-start md:justify-evenly border-t border-gray-200 pt-6 mt-8">
                        <div className="flex flex-col items-center md:w-1/2">
                          <h2 className="text-xl font-semibold text-gray-800 mb-4">Your UPI QR Code</h2>
                          <div 
                            ref={qrRef}
                            className="bg-white p-6 border-2 border-orange-200 rounded-lg shadow-xl mb-4 flex items-center justify-center"
                          >
                            <img
                              src={qrCodeUrl}
                              alt="UPI QR Code"
                              className="w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/images/qr-code.png";
                                showError("QR code generation failed. Please try again.");
                              }}
                            />
                          </div>
                        </div>

                        {/* UPI Payment Information */}
                        <div className="md:w-1/2 md:pt-16 text-center mb-4">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 inline-block shadow-sm">
                            <p className="text-sm text-gray-600">Paying to:</p>
                            <p className="font-medium text-gray-800 text-lg">{upiId}</p>
                            {currentUpiAddress && (
                              <p className="text-xs text-gray-500 mt-1">
                                {currentUpiAddress.name}
                                {currentUpiAddress.description && ` • ${currentUpiAddress.description}`}
                              </p>
                            )}
                            {amount && Number(amount) > 0 && (
                              <div className="mt-2 pt-2 border-t border-yellow-200">
                                <p className="text-sm text-gray-600">Amount:</p>
                                <p className="font-medium text-green-600 text-lg">₹{Number(amount).toLocaleString('en-IN')}</p>
                              </div>
                            )}
                          </div>
                        
                          <p className="text-sm text-gray-600 mb-4 text-center mt-4">
                            Scan this QR code with any UPI app (GPay, PhonePe, Paytm, etc.) to make a payment
                          </p>
                          
                          <div className="flex flex-wrap gap-3 justify-center">
                            <button
                              onClick={copyToClipboard}
                              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>Copy</span>
                            </button>
                            
                            <a
                              href={qrCodeUrl}
                              download="upi-qr-code.png"
                              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              <span>Download</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="bg-blue-50 p-6 rounded-b-lg border-t border-blue-200 shadow-md mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Instructions</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                      <li>Save frequently used UPI IDs for quick access</li>
                      <li>Generate QR codes that customers can scan to pay</li>
                      <li>Optionally set an amount for fixed-price items</li>
                      <li>All UPI addresses are stored securely and encrypted</li>
                      <li>Set one UPI address as default for quick access</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type || 'warning'}
        confirmText="Delete"
        isLoading={isDeletingUpiAddress}
      />
    </div>
  );
}
