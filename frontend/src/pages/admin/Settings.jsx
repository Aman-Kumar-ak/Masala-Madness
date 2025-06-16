import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../../components/BackButton';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { useNotification } from '../../components/NotificationContext';
import api from '../../utils/api';
import useKeyboardScrollAdjustment from '../../hooks/useKeyboardScrollAdjustment';
import PasswordVerificationDialog from '../../components/PasswordVerificationDialog';

const Settings = () => {
  useKeyboardScrollAdjustment();
  const { user, isAuthenticated, logout, getUserDevices, revokeDevice } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('adminControl');
  
  // Add version state
  const [versionInfo, setVersionInfo] = useState({
    version: 'Loading...',
    buildDate: 'Loading...',
    environment: process.env.NODE_ENV || 'development'
  });
  
  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCurrentPasswordValid, setIsCurrentPasswordValid] = useState(false);
  const [showNewPasswordFields, setShowNewPasswordFields] = useState(false);
  
  // Add state for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // State for secret code management (for QR and Admin Control)
  const [showSecretCodeDialog, setShowSecretCodeDialog] = useState(false);
  const [isSecretCodeAuthenticated, setIsSecretCodeAuthenticated] = useState(false);
  const [secretCodeTimeLeft, setSecretCodeTimeLeft] = useState(null);
  const [currentSecretCode, setCurrentSecretCode] = useState('');
  const [newSecretCode, setNewSecretCode] = useState('');
  const [confirmNewSecretCode, setConfirmNewSecretCode] = useState('');
  const [secretCodeError, setSecretCodeError] = useState('');
  const [secretCodeSuccess, setSecretCodeSuccess] = useState('');
  const [isSecretCodeChanging, setIsSecretCodeChanging] = useState(false);
  const [showNewSecretCodeFields, setShowNewSecretCodeFields] = useState(false);
  const [isCurrentSecretCodeValid, setIsCurrentSecretCodeValid] = useState(false);

  // Add state for secret code password visibility
  const [showCurrentSecretCode, setShowCurrentSecretCode] = useState(false);
  const [showNewSecretCode, setShowNewSecretCode] = useState(false);
  const [showConfirmNewSecretCode, setShowConfirmNewSecretCode] = useState(false);
  
  // State for confirmation dialogs
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutDeleteSplash, setShowLogoutDeleteSplash] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  // State for device management
  const [devices, setDevices] = useState([]);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [deviceToRevoke, setDeviceToRevoke] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState('');
  const [revokeError, setRevokeError] = useState('');
  
  // Add state for user management
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [addUserForm, setAddUserForm] = useState({ name: '', mobileNumber: '', password: '', role: 'worker' });
  const [editUserForm, setEditUserForm] = useState({ name: '', mobileNumber: '', password: '', role: 'worker', isActive: true });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [editUserLoading, setEditUserLoading] = useState(false);
  
  // Add state for all devices
  const [allDevices, setAllDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  
  // Add state for delete confirmation
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // New state for localized loading in Admin Control section
  const [isAdminControlLoading, setIsAdminControlLoading] = useState(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  // Unified useEffect for initial data fetching and secret code authentication check
  useEffect(() => {
    const loadAllInitialData = async () => {
      const initialPromises = [];

      // Fetch version information
      initialPromises.push(
        fetch('/version.json')
          .then(response => response.json())
          .then(data => setVersionInfo({ ...data, environment: process.env.NODE_ENV || 'development' }))
          .catch(error => {
        console.error('Error fetching version info:', error);
            setVersionInfo({ version: 'Unknown', buildDate: 'Unknown', environment: process.env.NODE_ENV || 'development' });
          })
      );

      // Check secret code authentication status if admin - but don't block page load
      if (user?.role === 'admin') {
        const verificationExpiry = localStorage.getItem('qr_verification_expiry');
        if (verificationExpiry) {
          const expiryTime = parseInt(verificationExpiry);
          const currentTime = new Date().getTime();
          if (currentTime < expiryTime) {
            setIsSecretCodeAuthenticated(true);
            const remainingMs = expiryTime - currentTime;
            const remainingMinutes = Math.floor(remainingMs / 60000);
            const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
            setSecretCodeTimeLeft(`${remainingMinutes}m ${remainingSeconds}s`);
            // Admin data will be fetched when the section is unlocked, not on initial load
          } else {
            localStorage.removeItem('qr_verification_expiry');
            setSecretCodeTimeLeft(null);
            setIsSecretCodeAuthenticated(false);
          }
        } else {
          setIsSecretCodeAuthenticated(false);
        }
      }

      await Promise.allSettled(initialPromises);
    };

    // Only attempt to load if authentication status is known and user data is available
    if (isAuthenticated !== undefined && user !== undefined) {
      loadAllInitialData();
    }
  }, [isAuthenticated, user]); // Removed getUserDevices as a dependency since its call is moved

  // Periodically check secret code verification expiry
  useEffect(() => {
    if (isSecretCodeAuthenticated) {
      const timer = setInterval(() => {
        const verificationExpiry = localStorage.getItem('qr_verification_expiry');
        if (verificationExpiry) {
          const expiryTime = parseInt(verificationExpiry);
          const currentTime = new Date().getTime();
          if (currentTime < expiryTime) {
            const remainingMs = expiryTime - currentTime;
            const remainingMinutes = Math.floor(remainingMs / 60000);
            const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
            setSecretCodeTimeLeft(`${remainingMinutes}m ${remainingSeconds}s`);
          } else {
            localStorage.removeItem('qr_verification_expiry');
            setSecretCodeTimeLeft(null);
            setIsSecretCodeAuthenticated(false);
            showError('Secret code verification expired. Please re-verify.');
          }
        } else {
          setIsSecretCodeAuthenticated(false);
          setSecretCodeTimeLeft(null);
        }
      }, 1000); // Check every second
      
      return () => clearInterval(timer);
    }
  }, [isSecretCodeAuthenticated, showError]);
  
  // Verify current password
  const verifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password');
      return;
    }

    setIsVerifying(true);
    setPasswordError('');

    try {
      let token = sessionStorage.getItem('token');
      // If no token, try to log in with username and entered password
      if (!token) {
        if (!user || !user.username) {
          setPasswordError('User information missing. Please log in again.');
          setIsVerifying(false);
          return;
        }
        // Attempt login
        const loginResponse = await fetch('https://masala-madness-production.up.railway.app/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username, password: currentPassword, rememberDevice: true })
        });
        let loginData = {};
        try {
          loginData = await loginResponse.json();
        } catch (jsonErr) {
          setPasswordError('Server error during login. Please try again later.');
          console.error('Login: Failed to parse JSON response', jsonErr);
          setIsVerifying(false);
          return;
        }
        if (loginResponse.ok && loginData.status === 'success' && loginData.token) {
          // Set token and user in sessionStorage
          sessionStorage.setItem('token', loginData.token);
          sessionStorage.setItem('user', JSON.stringify(loginData.user));
          token = loginData.token;
          // Optionally update context if needed (if you have a setUser/setIsAuthenticated function)
          setPasswordError('');
          setIsCurrentPasswordValid(true);
          setShowNewPasswordFields(true);
          setIsVerifying(false);
          return;
        } else {
          setPasswordError('Incorrect password. Please try again.');
          setIsVerifying(false);
          return;
        }
      }
      // If token exists, proceed as before
      const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: currentPassword })
      });

      let data = {};
      try {
        data = await response.json();
      } catch (jsonErr) {
        setPasswordError('Server error. Please try again later.');
        console.error('Password verification: Failed to parse JSON response', jsonErr);
        setIsVerifying(false);
        return;
      }

      if (response.status === 401) {
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        setPasswordError('Current password is incorrect.');
        console.warn('Password verification: Incorrect password.');
      } else if (response.status === 500) {
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        setPasswordError('Server error. Please try again later.');
        console.error('Password verification: Server error.', data);
      } else if (!response.ok) {
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        setPasswordError('Unexpected error. Please try again.');
        console.error('Password verification: Unexpected error.', data);
      } else if (response.ok && data.status === 'success') {
        setIsCurrentPasswordValid(true);
        setShowNewPasswordFields(true);
        setPasswordError('');
        console.log(`User ${user?.username || 'Admin'} successfully verified password`);
      } else {
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        setPasswordError(data.message || 'Failed to verify current password.');
        console.error(`User ${user?.username || 'Admin'} entered incorrect password`, data);
      }
    } catch (error) {
      setIsCurrentPasswordValid(false);
      setShowNewPasswordFields(false);
      if (error.name === 'TypeError') {
        setPasswordError('Network error. Please check your connection.');
        console.error('Password verification: Network error.', error);
      } else {
        setPasswordError('Failed to verify current password. Please try again.');
        console.error('Password verification error:', error);
      }
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    try {
      // Use fetch directly instead of api utility to avoid automatic redirect on 401
      const token = sessionStorage.getItem('token');
      const response = await fetch('https://masala-madness-production.up.railway.app/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        setPasswordSuccess('Password changed successfully');
        // Clear form and reset states
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        console.log(`User ${user?.username || 'Admin'} successfully changed password`);
      } else {
        setPasswordError(data.message || 'Failed to change password');
        console.error(`User ${user?.username || 'Admin'} failed to change password:`, data.message);
      }
    } catch (error) {
      setPasswordError('Error changing password. Please try again.');
      console.error('Password change error:', error);
    }
  };
  
  // Check if form is valid
  const isFormValid = () => {
    return (
      isCurrentPasswordValid && 
      newPassword.length >= 8 && 
      newPassword === confirmPassword
    );
  };
  
  // Handle logout
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };
  
  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    setShowLogoutDeleteSplash(true);

    try {
      logout();
      sessionStorage.setItem('logoutSuccess', 'true');
    } catch (error) {
      console.error("Logout failed:", error);
      setShowLogoutDeleteSplash(false);
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = () => {
    setShowDeleteAccountConfirm(true);
  };
  
  const confirmDeleteAccount = async () => {
    setShowDeleteAccountConfirm(false);
    setShowLogoutDeleteSplash(true);

    try {
      const response = await api.delete(`/auth/delete-account/${user.username}`);
      if (response.status === 200) {
        showSuccess("Account deleted successfully!");
        logout();
      } else {
        throw new Error(response.data.message || "Failed to delete account");
      }
    } catch (error) {
      console.error("Account deletion failed:", error);
      showError("Failed to delete account: " + error.message);
    } finally {
      setShowLogoutDeleteSplash(false);
    }
  };

  // Device Revocation Handlers
  const handleRevokeClick = (device) => {
    setDeviceToRevoke(device);
    setShowRevokeConfirm(true);
  };

  const confirmRevokeDevice = async () => {
    if (!deviceToRevoke) return;
    setIsRevoking(true);
    setRevokeSuccess('');
    setRevokeError('');
    try {
      await revokeDevice(deviceToRevoke.deviceId);
      setRevokeSuccess('Device revoked successfully!');
      // Refresh device list after revocation
      const updatedDevices = await getUserDevices();
      setDevices(updatedDevices);
      // If revoking current device, log out
      if (deviceToRevoke.isCurrent) {
        logout(true); // pass true to keep device token on server side if needed, though we're removing it client side
      }
    } catch (error) {
      console.error('Failed to revoke device:', error);
      setRevokeError(error.message || 'Failed to revoke device.');
    } finally {
      setIsRevoking(false);
      setShowRevokeConfirm(false);
      setDeviceToRevoke(null);
    }
  };

  const cancelRevokeDevice = () => {
    setShowRevokeConfirm(false);
    setDeviceToRevoke(null);
  };

  // Fetch users (admins & workers) - now memoized using useCallback
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUserError('');
    try {
      const res = await api.get('/auth/users');
      setUsers(res);
    } catch (err) {
      setUserError('Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Fetch all devices for admin - now memoized using useCallback
  const fetchAllDevices = useCallback(async () => {
    setLoadingDevices(true);
    setDeviceError('');
    try {
      const res = await api.get('/auth/devices/all');
      setAllDevices(res);
    } catch (err) {
      setDeviceError('Failed to load devices.');
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // Refactor existing useEffects to only trigger on tab change, and not if `isPageLoading` is true
  useEffect(() => {
    if (activeTab === 'adminControl' && user?.role === 'admin' && isSecretCodeAuthenticated) {
      fetchUsers();
      fetchAllDevices();
    }
  }, [activeTab, user, isSecretCodeAuthenticated, fetchUsers, fetchAllDevices]); // Add fetchUsers, fetchAllDevices as dependencies

  // Add user handler
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddUserLoading(true);
    setUserError('');
    try {
      await api.post('/auth/register', addUserForm);
      showSuccess('User added successfully!');
      setShowAddUserModal(false);
      setAddUserForm({ name: '', mobileNumber: '', password: '', role: 'worker' });
      await fetchUsers();
      window.location.reload(); // Force reload to ensure new user can log in
    } catch (err) {
      showError(err.message || 'Failed to add user.');
    } finally {
      setAddUserLoading(false);
    }
  };

  // Edit user handler
  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditUserLoading(true);
    setUserError('');
    try {
      const updateData = { ...editUserForm };
      if (!updateData.password) delete updateData.password; // Don't send empty password
      await api.put(`/auth/users/${selectedUser._id}`, updateData);
      showSuccess('User updated successfully!');
      setShowEditUserModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err) {
      setUserError(err.message || 'Failed to update user.');
    } finally {
      setEditUserLoading(false);
    }
  };

  // Enable/disable user
  const handleToggleActive = async (userObj) => {
    try {
      await api.put(`/auth/users/${userObj._id}`, { isActive: !userObj.isActive });
      showSuccess(`User ${userObj.isActive ? 'disabled' : 'enabled'} successfully!`);
      await fetchUsers();
    } catch (err) {
      showError('Failed to update user status.');
    }
  };

  // Open edit modal
  const openEditUserModal = (userObj) => {
    setSelectedUser(userObj);
    setEditUserForm({
      name: userObj.name,
      mobileNumber: userObj.mobileNumber,
      password: '',
      role: userObj.role,
      isActive: userObj.isActive
    });
    setShowEditUserModal(true);
  };

  // Toggle device active status
  const handleToggleDeviceActive = async (deviceObj) => {
    try {
      await api.put(`/auth/devices/${deviceObj._id}`, { isActive: !deviceObj.isActive });
      showSuccess(`Device ${deviceObj.isActive ? 'disabled' : 'enabled'} successfully!`);
      fetchAllDevices();
    } catch (err) {
      showError('Failed to update device status.');
    }
  };

  // Delete user handler
  const handleDeleteUser = async (userObj) => {
    setUserToDelete(userObj);
    setShowDeleteUserConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/auth/users/${userToDelete._id}`);
      showSuccess('User deleted successfully!');
      await fetchUsers();
    } catch (err) {
      showError(err.message || 'Failed to delete user.');
    } finally {
      setShowDeleteUserConfirm(false);
      setUserToDelete(null);
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteUserConfirm(false);
    setUserToDelete(null);
  };

  // Handle successful secret code verification for Admin Control access
  const handleSecretCodeSuccess = async () => {
    setShowSecretCodeDialog(false);
    setIsSecretCodeAuthenticated(true);
    // Set a timestamp for 15 minutes from now
    const expiryTime = new Date().getTime() + (15 * 60 * 1000); // 15 minutes
    localStorage.setItem('qr_verification_expiry', expiryTime.toString());
    showSuccess('Secret access granted for 15 minutes.');
    
    // Start loading admin data specific to this section
    setIsAdminControlLoading(true);
    try {
      // Fetch users
      await fetchUsers();
      // Fetch all devices
      await fetchAllDevices();
      // Fetch user's own devices for device management (if not already loaded by initial load)
      await getUserDevices().then(setDevices);
    } catch (err) {
      showError('Failed to load admin data.');
      console.error('Error fetching admin data:', err);
    } finally {
      setIsAdminControlLoading(false);
    }
  };

  // Handle secret code dialog close (e.g., user cancels)
  const handleSecretCodeDialogClose = () => {
    setShowSecretCodeDialog(false);
  };

  // Handle change secret code
  const handleChangeSecretCode = async (e) => {
    e.preventDefault();

    setSecretCodeError('');
    setSecretCodeSuccess('');

    if (!currentSecretCode.trim()) {
      setSecretCodeError('Please enter your current secret code.');
      return;
    }

    if (newSecretCode.length < 8) {
      setSecretCodeError('New secret code must be at least 8 characters.');
      return;
    }

    if (newSecretCode !== confirmNewSecretCode) {
      setSecretCodeError('New secret codes do not match.');
      return;
    }

    setIsSecretCodeChanging(true);
    try {
      const response = await api.put('/auth/secret-code/change', {
        currentSecretCode,
        newSecretCode
      });

      if (response.status === 200) {
        setSecretCodeSuccess('Secret access code changed successfully!');
        setCurrentSecretCode('');
        setNewSecretCode('');
        setConfirmNewSecretCode('');
        setIsCurrentSecretCodeValid(false); // Invalidate current secret code validation
        setShowNewSecretCodeFields(false);
      } else {
        setSecretCodeError(response.message || 'Failed to change secret access code.');
      }
    } catch (error) {
      setSecretCodeError(error.message || 'Error changing secret access code.');
      console.error('Error changing secret access code:', error);
    } finally {
      setIsSecretCodeChanging(false);
    }
  };

  // Verify current secret code
  const verifyCurrentSecretCode = async () => {
    if (!currentSecretCode.trim()) {
      setSecretCodeError('Please enter your current secret code.');
      return;
    }

    setIsSecretCodeChanging(true);
    setSecretCodeError('');
    try {
      const response = await api.post('/auth/secret-code/verify', {
        secretCode: currentSecretCode,
        usedWhere: "Settings Secret Code Change Verification",
        currentUserId: user?._id,
      });
      if (response.status === 200) {
        setIsCurrentSecretCodeValid(true);
        setShowNewSecretCodeFields(true);
        setSecretCodeError('');
        showSuccess('Current secret code verified.');
      } else {
        setIsCurrentSecretCodeValid(false);
        setShowNewSecretCodeFields(false);
        setSecretCodeError(response.message || 'Invalid current secret code.');
      }
    } catch (error) {
      setIsCurrentSecretCodeValid(false);
      setShowNewSecretCodeFields(false);
      setSecretCodeError(error.message || 'Failed to verify current secret code.');
      console.error('Secret code verification error:', error);
    } finally {
      setIsSecretCodeChanging(false);
    }
  };

  const isSecretCodeFormValid = () => {
    return (
      isCurrentSecretCodeValid &&
      newSecretCode.length >= 8 &&
      newSecretCode === confirmNewSecretCode
    );
  };

  // New function to handle setting/generating secret code
  const handleGenerateSecretCode = async () => {
    if (!newSecretCode.trim()) {
      setSecretCodeError('Please enter a new secret access code.');
      return;
    }
    if (newSecretCode !== confirmNewSecretCode) {
      setSecretCodeError('New secret codes do not match.');
      return;
    }
    if (newSecretCode.length < 6) { // Minimum length for security
      setSecretCodeError('Secret code must be at least 6 characters long.');
      return;
    }

    setIsSecretCodeChanging(true);
    setSecretCodeError('');
    setSecretCodeSuccess('');

    try {
      const response = await api.post('/auth/secret-code/initialize', {
        secretCode: newSecretCode,
      });

      if (response.data.status === 'success') {
        showSuccess(response.data.message);
        setSecretCodeSuccess(response.data.message);
        setNewSecretCode('');
        setConfirmNewSecretCode('');
        // No need to clear local storage expiry, as the code itself has changed.
        // The next verification attempt will use the new code.
      } else {
        showError(response.data.message || 'Failed to set new secret code.');
        setSecretCodeError(response.data.message || 'Failed to set new secret code.');
      }
    } catch (error) {
      console.error('Error setting new secret code:', error);
      const errorMessage = error.response?.data?.message || 'Failed to set new secret code. Server error.';
      showError(errorMessage);
      setSecretCodeError(errorMessage);
    } finally {
      setIsSecretCodeChanging(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 text-zinc-900 dark:text-zinc-100">
      <BackButton />
      
      <div className="p-4 pt-16 max-w-7xl mx-auto">
        <div>
          {/* Tab Buttons */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 border border-gray-200 shadow-sm">
            <button
              className={`w-1/2 py-2 px-4 text-center rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 
                ${activeTab === 'adminControl' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-800'}`}
              onClick={() => setActiveTab('adminControl')}
            >
              Devices and Roles
            </button>
            <button
              className={`w-1/2 py-2 px-4 text-center rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 
                ${activeTab === 'personalSettings' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-800'}`}
              onClick={() => setActiveTab('personalSettings')}
            >
              Personal Settings
            </button>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'adminControl' && user?.role === 'admin' && (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 border border-gray-200 relative min-h-[300px] flex items-center justify-center">
              {/* Conditional content for Admin Controls */}
              {!isSecretCodeAuthenticated ? (
                <div className="text-center">
                  <div className="text-6xl mb-5">🔒</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Admin Controls Locked</h2>
                  <p className="text-gray-600 mb-6 text-lg">
                    A secret access code is required to manage devices and user roles.
                  </p>
                  <p className="text-gray-500 mb-4 text-sm">
                    Once verified, you'll have access for 10 minutes without re-entering the code.
                  </p>
                  <button
                    onClick={() => setShowSecretCodeDialog(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Unlock Admin
                  </button>
                </div>
              ) : (
                <div className="w-full">
                  {/* Actual Admin Controls content */}
                  <h2 className="text-xl font-bold text-gray-800 mb-6">Device and Roles Management</h2>
                  {secretCodeTimeLeft && (
                    <div className="text-center mb-4 p-2 bg-blue-50 rounded-lg text-sm text-blue-800 border border-blue-200">
                      Secret access session expires in: <span className="font-semibold">{secretCodeTimeLeft}</span>
                    </div>
                  )}

                  {/* Devices Section */}
                  <div className="bg-white rounded-lg p-6 shadow mb-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Devices</h3>
                    {loadingDevices ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-500 mb-4"></div>
                        <p className="text-gray-700 text-xl font-medium">Loading devices...</p>
                      </div>
                    ) : (
                      <>
                        {/* Device Management Card - Show unique users only */}
                        <div className="bg-white shadow-lg rounded-xl p-6 border border-blue-200 mb-6">
                          <div className="flex items-center gap-3 mb-6">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 text-2xl">
                              <i className="fas fa-tablet-alt"></i>
                            </span>
                            <h2 className="text-2xl font-bold text-blue-700">User Devices & Status</h2>
                          </div>
                          {/* Unique Users Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border rounded-xl">
                              <thead>
                                <tr className="bg-blue-50">
                                  <th className="px-2 py-2 border"></th>
                                  <th className="px-4 py-2 border">User Name</th>
                                  <th className="px-4 py-2 border">Mobile Number</th>
                                  <th className="px-4 py-2 border">Role</th>
                                  <th className="px-4 py-2 border">Status</th>
                                  <th className="px-4 py-2 border">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {users && users.length > 0 ? users.map(u => (
                                  <tr key={u._id} className="border-b hover:bg-blue-50 transition">
                                    <td className="px-2 py-2 border text-center">
                                      <span className={`inline-block w-3 h-3 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    </td>
                                    <td className="px-4 py-2 border">{u.name}</td>
                                    <td className="px-4 py-2 border">{u.mobileNumber}</td>
                                    <td className="px-4 py-2 border capitalize">{u.role}</td>
                                    <td className="px-2 py-1 border text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          className="focus:outline-none"
                                          onClick={() => handleToggleActive(u)}
                                          aria-label={u.isActive ? 'Disable account' : 'Enable account'}
                                          type="button"
                                        >
                                          <span className={`inline-block w-14 h-8 rounded-full border-2 transition-colors duration-200 ${u.isActive ? 'bg-green-400 border-green-500' : 'bg-gray-200 border-gray-300'}`}
                                            style={{ position: 'relative' }}>
                                            <span className={`absolute top-0.5 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${u.isActive ? 'translate-x-6' : ''}`}></span>
                                          </span>
                                        </button>
                                        <span className={`text-xs font-semibold ${u.isActive ? 'text-green-600' : 'text-red-600'}`}>{u.isActive ? 'Active' : 'Disabled'}</span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-1 border text-center">
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          className="flex items-center gap-1 px-2 py-1 border border-blue-200 text-blue-700 bg-white rounded-lg shadow-sm hover:border-blue-400 hover:text-blue-900 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-200 text-xs font-semibold group"
                                          onClick={() => openEditUserModal(u)}
                                          title="Edit User"
                                          aria-label="Edit User"
                                        >
                                          <svg className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-700 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" /></svg>
                                          Edit
                                        </button>
                                        <button
                                          className="flex items-center gap-1 px-2 py-1 border border-red-200 text-red-600 bg-white rounded-lg shadow-sm hover:bg-red-50 hover:text-red-800 hover:border-red-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-semibold group"
                                          onClick={() => handleDeleteUser(u)}
                                          title="Delete User"
                                          aria-label="Delete User"
                                        >
                                          <svg className="w-3.5 h-3.5 text-red-400 group-hover:text-red-700 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )) : (
                                  <tr><td colSpan={6} className="text-center text-gray-400 py-6">No users found.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* User Management Card */}
                        <div className="bg-white shadow-lg rounded-xl p-6 border border-emerald-200">
                          <div className="flex items-center gap-3 mb-6">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 text-2xl">
                              <i className="fas fa-users-cog"></i>
                            </span>
                            <h2 className="text-2xl font-bold text-emerald-700">User Management</h2>
                          </div>
                          {/* Add User Form */}
                          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                            <div>
                              <label className="block text-sm font-medium mb-1">Name</label>
                              <input type="text" className="w-full border rounded px-3 py-2" required value={addUserForm.name} onChange={e => setAddUserForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Mobile Number</label>
                              <input type="text" className="w-full border rounded px-3 py-2" required value={addUserForm.mobileNumber} onChange={e => setAddUserForm(f => ({ ...f, mobileNumber: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Password</label>
                              <input type="password" className="w-full border rounded px-3 py-2" required value={addUserForm.password} onChange={e => setAddUserForm(f => ({ ...f, password: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Role</label>
                              <select className="w-full border rounded px-3 py-2" value={addUserForm.role} onChange={e => setAddUserForm(f => ({ ...f, role: e.target.value }))}>
                                <option value="admin">Admin</option>
                                <option value="worker">Worker</option>
                              </select>
                            </div>
                            <div className="md:col-span-4 flex justify-end mt-2">
                              <button type="submit" className="px-6 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 transition" disabled={addUserLoading}>{addUserLoading ? 'Adding...' : 'Add User'}</button>
                            </div>
                          </form>
                          {/* User Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border rounded-xl">
                              <thead>
                                <tr className="bg-emerald-50">
                                  <th className="px-2 py-2 border"></th>
                                  <th className="px-4 py-2 border">Name</th>
                                  <th className="px-4 py-2 border">Mobile Number</th>
                                  <th className="px-4 py-2 border">Role</th>
                                  <th className="px-4 py-2 border">Active</th>
                                  <th className="px-4 py-2 border">Last Login</th>
                                  <th className="px-4 py-2 border">Created</th>
                                  <th className="px-4 py-2 border">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {users && users.length > 0 ? users.map(u => (
                                  <tr key={u._id} className="border-b hover:bg-emerald-50 transition">
                                    <td className="px-2 py-2 border text-center">
                                      <span className={`inline-block w-3 h-3 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    </td>
                                    <td className="px-4 py-2 border">{u.name}</td>
                                    <td className="px-4 py-2 border">{u.mobileNumber}</td>
                                    <td className="px-4 py-2 border capitalize">{u.role}</td>
                                    <td className="px-2 py-1 border text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          className="focus:outline-none"
                                          onClick={() => handleToggleActive(u)}
                                          aria-label={u.isActive ? 'Disable account' : 'Enable account'}
                                          type="button"
                                        >
                                          <span className={`inline-block w-14 h-8 rounded-full border-2 transition-colors duration-200 ${u.isActive ? 'bg-green-400 border-green-500' : 'bg-gray-200 border-gray-300'}`}
                                            style={{ position: 'relative' }}>
                                            <span className={`absolute top-0.5 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${u.isActive ? 'translate-x-6' : ''}`}></span>
                                          </span>
                                        </button>
                                        <span className={`text-xs font-semibold ${u.isActive ? 'text-green-600' : 'text-red-600'}`}>{u.isActive ? 'Active' : 'Disabled'}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 border">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '-'}</td>
                                    <td className="px-4 py-2 border">{new Date(u.createdAt).toLocaleString()}</td>
                                    <td className="px-2 py-1 border text-center">
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          className="flex items-center gap-1 px-2 py-1 border border-blue-200 text-blue-700 bg-white rounded-lg shadow-sm hover:border-blue-400 hover:text-blue-900 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-200 text-xs font-semibold group"
                                          onClick={() => openEditUserModal(u)}
                                          title="Edit User"
                                          aria-label="Edit User"
                                        >
                                          <svg className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-700 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" /></svg>
                                          Edit
                                        </button>
                                        <button
                                          className="flex items-center gap-1 px-2 py-1 border border-red-200 text-red-600 bg-white rounded-lg shadow-sm hover:bg-red-50 hover:text-red-800 hover:border-red-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-semibold group"
                                          onClick={() => handleDeleteUser(u)}
                                          title="Delete User"
                                          aria-label="Delete User"
                                        >
                                          <svg className="w-3.5 h-3.5 text-red-400 group-hover:text-red-700 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )) : (
                                  <tr><td colSpan={8} className="text-center text-gray-400 py-6">No users found.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Edit User Modal (reuse ConfirmationDialog) */}
                        <ConfirmationDialog
                          isOpen={showEditUserModal}
                          onClose={() => setShowEditUserModal(false)}
                          title="Edit User"
                          confirmText={null}
                          cancelText={null}
                          customContent={(
                            <form onSubmit={handleEditUser} className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input type="text" className="w-full border rounded px-3 py-2" required value={editUserForm.name} onChange={e => setEditUserForm(f => ({ ...f, name: e.target.value }))} />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Mobile Number</label>
                                <input type="text" className="w-full border rounded px-3 py-2" required value={editUserForm.mobileNumber} onChange={e => setEditUserForm(f => ({ ...f, mobileNumber: e.target.value }))} />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Password (leave blank to keep unchanged)</label>
                                <input type="password" className="w-full border rounded px-3 py-2" value={editUserForm.password} onChange={e => setEditUserForm(f => ({ ...f, password: e.target.value }))} />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <select className="w-full border rounded px-3 py-2" value={editUserForm.role} onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))}>
                                  <option value="admin">Admin</option>
                                  <option value="worker">Worker</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id="isActive" checked={editUserForm.isActive} onChange={e => setEditUserForm(f => ({ ...f, isActive: e.target.checked }))} />
                                <label htmlFor="isActive" className="text-sm">Active</label>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowEditUserModal(false)}>Cancel</button>
                                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white" disabled={editUserLoading}>{editUserLoading ? 'Saving...' : 'Save Changes'}</button>
                              </div>
                            </form>
                          )}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'personalSettings' && (
            <div className="space-y-6">
              <div className="bg-white shadow-md rounded-lg p-6 border border-orange-200 mb-6 min-h-[calc(100vh-220px)] overflow-y-auto">
                <div className="flex items-center gap-4 mb-6">
                  
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-800 whitespace-nowrap">
                    Personal Settings
                  </h1>
                </div>
                
                {user && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                    <h2 className="text-lg font-semibold text-blue-800 mb-2">Current User</h2>
                    <p className="text-gray-700">
                      Logged in as: <span className="font-medium">{user.username}</span>
                    </p>
                  </div>
                )}
                
                {/* Password Change Section */}
                <div className="border border-gray-200 rounded-lg p-5 mb-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
                    <span className="text-orange-600">🔐</span> Change Password
                  </h2>
                  
                  {passwordError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                      <span className="block sm:inline">{passwordError}</span>
                    </div>
                  )}
                  
                  {passwordSuccess && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                      <span className="block sm:inline">{passwordSuccess}</span>
                    </div>
                  )}
                  
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => {
                              setCurrentPassword(e.target.value);
                              setIsCurrentPasswordValid(false);
                              setShowNewPasswordFields(false);
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            required
                            disabled={isVerifying}
                          />

                          <button 
                            type="button"
                            onClick={verifyCurrentPassword}
                            disabled={!currentPassword || isVerifying || isCurrentPasswordValid}
                            className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 
                              ${isCurrentPasswordValid 
                                ? 'bg-green-100 text-green-700 border border-green-300 cursor-default' 
                                : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'}`}
                          >
                            {isVerifying ? 'Verifying...' : isCurrentPasswordValid ? 'Verified' : 'Verify'}
                          </button>
                        </div>
                        {isCurrentPasswordValid && (
                          <p className="mt-1 text-sm text-green-600">Current password verified</p>
                        )}
                      </div>
                      {/* Show Password Checkbox */}
                      <div className="flex items-center mt-1">
                        <input
                          id="showCurrentPassword"
                          type="checkbox"
                          checked={showCurrentPassword}
                          onChange={() => setShowCurrentPassword((prev) => !prev)}
                          className="mr-2"
                        />
                        <label htmlFor="showCurrentPassword" className="text-xs text-gray-600 select-none">Show Password</label>
                      </div>
                      
                      {showNewPasswordFields && (
                        <>
                          <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                              New Password
                            </label>
                            <input
                              id="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                              required
                              minLength={8}
                            />
                            {/* Show Password Checkbox */}
                            <div className="flex items-center mt-1">
                              <input
                                id="showNewPassword"
                                type="checkbox"
                                checked={showNewPassword}
                                onChange={() => setShowNewPassword((prev) => !prev)}
                                className="mr-2"
                              />
                              <label htmlFor="showNewPassword" className="text-xs text-gray-600 select-none">Show Password</label>
                            </div>
                            {newPassword && newPassword.length < 8 && (
                              <p className="mt-1 text-sm text-red-600">Password must be at least 8 characters</p>
                            )}
                          </div>
                          
                          <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                              Confirm New Password
                            </label>
                            <input
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                              required
                            />
                            {/* Show Password Checkbox */}
                            <div className="flex items-center mt-1">
                              <input
                                id="showConfirmPassword"
                                type="checkbox"
                                checked={showConfirmPassword}
                                onChange={() => setShowConfirmPassword((prev) => !prev)}
                                className="mr-2"
                              />
                              <label htmlFor="showConfirmPassword" className="text-xs text-gray-600 select-none">Show Password</label>
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                              <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div>
                      <button
                        type="submit"
                        disabled={!isFormValid()}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                          ${isFormValid() 
                            ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                            : 'bg-gray-400 cursor-not-allowed'} 
                          focus:outline-none focus:ring-2 focus:ring-offset-2`}
                      >
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>
                
                {/* Generate/Set New Secret Access Code Section */}
                <div className="bg-yellow-50 rounded-lg p-6 shadow mb-6 border border-yellow-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Generate/Set New Secret Access Code</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Use this to set or update the master secret code for admin access to QR and Devices & Roles sections.
                    This does not require the old secret code to change.
                  </p>

                  {secretCodeSuccess && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm mb-4" role="alert">
                      <span className="block sm:inline">{secretCodeSuccess}</span>
                    </div>
                  )}
                  {secretCodeError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm mb-4" role="alert">
                      <span className="block sm:inline">{secretCodeError}</span>
                    </div>
                  )}

                  <div className="mb-4">
                    <label htmlFor="newSecretCodeToSet" className="block text-sm font-semibold text-gray-800 mb-2">
                      New Secret Access Code
                    </label>
                    <div className="relative">
                      <input
                        id="newSecretCodeToSet"
                        type={showNewSecretCode ? "text" : "password"}
                        value={newSecretCode}
                        onChange={(e) => setNewSecretCode(e.target.value)}
                        className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                        placeholder="Enter new secret access code"
                        disabled={isSecretCodeChanging}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewSecretCode(!showNewSecretCode)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700"
                      >
                        {showNewSecretCode ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.122m3.153-3.153A9.973 9.973 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.782 5.562M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="confirmNewSecretCodeToSet" className="block text-sm font-semibold text-gray-800 mb-2">
                      Confirm New Secret Access Code
                    </label>
                    <div className="relative">
                      <input
                        id="confirmNewSecretCodeToSet"
                        type={showConfirmNewSecretCode ? "text" : "password"}
                        value={confirmNewSecretCode}
                        onChange={(e) => setConfirmNewSecretCode(e.target.value)}
                        className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                        placeholder="Confirm new secret access code"
                        disabled={isSecretCodeChanging}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewSecretCode(!showConfirmNewSecretCode)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmNewSecretCode ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.122m3.153-3.153A9.973 9.973 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.782 5.562M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleGenerateSecretCode}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
                      disabled={isSecretCodeChanging}
                    >
                      {isSecretCodeChanging ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Setting...
                        </div>
                      ) : (
                        'Set New Secret Code'
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Logout and Delete Account Section */}
                <div className="bg-red-50 rounded-lg p-6 shadow mb-6 border border-red-200">
                  <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
                    <span className="text-red-600">⚠️</span> Account Actions
                  </h2>
                  
                  <div className="space-y-4">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Version Information Section (moved to bottom) */}
      <div className="bg-white p-2 sm:p-4 rounded-xl shadow-md mb-4 border border-gray-200 overflow-x-auto w-fit mx-auto">
        <div className="flex items-center justify-center gap-2 text-[0.625rem] text-gray-600 whitespace-nowrap sm:text-sm">
          <span className="font-medium">Version: {versionInfo.version}</span>
          <span>|</span>
          <span className="font-medium">Build: {new Date(versionInfo.buildDate).toLocaleString()}</span>
          <span>|</span>
          <span className={`px-1 py-0.5 rounded text-xs font-medium ${
            versionInfo.environment === 'production' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {versionInfo.environment}
          </span>
        </div>
      </div>
      
      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Yes, Logout"
        isLoading={isLoggingOut}
      />
      
      <ConfirmationDialog
        isOpen={showDeleteAccountConfirm}
        onClose={() => setShowDeleteAccountConfirm(false)}
        onConfirm={confirmDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This action cannot be undone."
        confirmText="Yes, Delete Account"
        cancelText="No, Keep Account"
        type="danger"
        isLoading={false}
      />
      
      {/* Revoke Device Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showRevokeConfirm}
        onClose={cancelRevokeDevice}
        onConfirm={confirmRevokeDevice}
        title="Revoke Device Session"
        message={deviceToRevoke?.isCurrent 
          ? `Are you sure you want to revoke your current device (${deviceToRevoke.deviceName})? This will log you out.`
          : `Are you sure you want to revoke the session for ${deviceToRevoke?.deviceName}?`}
        confirmText={deviceToRevoke?.isCurrent ? "Yes, Revoke & Logout" : "Yes, Revoke"}
        cancelText="Cancel"
        type="danger"
        isLoading={isRevoking}
      />
      
      {/* Full-screen Loading Splash Screen for Logout/Delete */}
      {showLogoutDeleteSplash && (
        <div className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-[100] flex items-center justify-center flex-col">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-orange-500 mb-4"></div>
          <p className="text-gray-700 text-xl font-medium">Logging you out...</p>
        </div>
      )}

      {/* Delete User Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteUserConfirm}
        onClose={cancelDeleteUser}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete user '${userToDelete?.name}'? This action cannot be undone.`}
        confirmText="Yes, Delete User"
        cancelText="Cancel"
        type="danger"
        isLoading={false}
      />

      {/* Secret Code Verification Dialog */}
      {showSecretCodeDialog && (
        <PasswordVerificationDialog
          isOpen={showSecretCodeDialog}
          onClose={handleSecretCodeDialogClose}
          onSuccess={handleSecretCodeSuccess}
          verificationType="secretCode"
          usedWhere="Settings Admin Control Access"
          currentUserId={user?._id}
        />
      )}

    </div>
  );
};

export default Settings; 