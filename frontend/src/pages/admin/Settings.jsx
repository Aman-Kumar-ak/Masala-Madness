import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../../components/BackButton';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { useNotification } from '../../components/NotificationContext';
import api from '../../utils/api';
import useKeyboardScrollAdjustment from '../../hooks/useKeyboardScrollAdjustment';

const ToggleSwitch = ({ isActive, onToggle, label, disabled = false }) => {
  return (
    <label className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}> 
      <input
        type="checkbox"
        value=""
        className="sr-only peer"
        checked={isActive}
        onChange={onToggle}
        disabled={disabled}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
      <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-900 mt-0.5">{label}</span>
    </label>
  );
};

const Settings = () => {
  useKeyboardScrollAdjustment();
  const { user, isAuthenticated, logout, getUserDevices, revokeDevice, setAuthOperationInProgress, clearAuthOperationInProgress, loading } = useAuth();
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
  const [adminSecretCodeAttempts, setAdminSecretCodeAttempts] = useState(0);
  const [adminSecretCodeLockout, setAdminSecretCodeLockout] = useState(null);
  const [adminUnlockSecretCode, setAdminUnlockSecretCode] = useState('');
  const [changeSecretCodeAttempts, setChangeSecretCodeAttempts] = useState(0);
  const [changeSecretCodeLockout, setChangeSecretCodeLockout] = useState(null);
  
  // State for secret code management (for QR and Admin Control)
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

  // Add state for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPasswords, setShowNewPasswords] = useState(false); // Unified state for new/confirm password visibility
  const [showAddUserPassword, setShowAddUserPassword] = useState(false); // State for Add User form password visibility
  const [showEditUserPassword, setShowEditUserPassword] = useState(false); // State for Edit User form password visibility
  const [confirmEditPassword, setConfirmEditPassword] = useState(''); // State for confirm password in Edit User form
  const [confirmAddUserPassword, setConfirmAddUserPassword] = useState(''); // State for confirm password in Add User form
  const [showConfirmEditUserPassword, setShowConfirmEditUserPassword] = useState(false); // New state for confirm password visibility in Edit User form
  const [showConfirmAddUserPassword, setShowConfirmAddUserPassword] = useState(false); // New state for confirm password visibility in Add User form
  
  
  // Add state for secret code password visibility
  const [showCurrentSecretCode, setShowCurrentSecretCode] = useState(false);
  const [showNewSecretCode, setShowNewSecretCode] = useState(false);
  const [showConfirmNewSecretCode, setShowConfirmNewSecretCode] = useState(false);
  
  // Add state for secret code attempt tracking
  // const [secretCodeAttempts, setSecretCodeAttempts] = useState(0);
  // const [secretCodeLockoutTime, setSecretCodeLockoutTime] = useState(null);
  // const [lockoutRemainingTime, setLockoutRemainingTime] = useState(null);
  const [lockoutMs, setLockoutMs] = useState(null); // Backend lockout duration in ms
  const [lockoutMessage, setLockoutMessage] = useState('');
  const [lockoutTimer, setLockoutTimer] = useState('');
  
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
  
  // Add state for all devices and loading
  const [allDevices, setAllDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  
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
  
  // State to manage expanded user cards
  const [expandedUsers, setExpandedUsers] = useState(new Set());

  // State to determine if it's a desktop view
  const [isDesktopView, setIsDesktopView] = useState(false);

  // Function to toggle expanded state of a user card
  const toggleExpandUser = (userId) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Effect to detect desktop view based on screen width
  useEffect(() => {
    const handleResize = () => {
      // Tailwind's 'md' breakpoint is typically 768px
      setIsDesktopView(window.innerWidth >= 768);
    };

    // Set initial value
    handleResize();

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);

    // Clean up event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Add state for delete confirmation
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  // State for user toggle confirmation
  const [showToggleUserConfirm, setShowToggleUserConfirm] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [isTogglingUser, setIsTogglingUser] = useState(false);
  
  // New state for localized loading in Admin Control section
  const [isAdminControlLoading, setIsAdminControlLoading] = useState(false);
  
  // Effect to disable body scroll when any dialog is open
  useEffect(() => {
    const isAnyDialogShowing = showLogoutConfirm || showDeleteAccountConfirm || showRevokeConfirm || showToggleUserConfirm || showDeleteUserConfirm || showAddUserModal || showEditUserModal;
    if (isAnyDialogShowing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset'; // Ensure cleanup on unmount
    };
  }, [showLogoutConfirm, showDeleteAccountConfirm, showRevokeConfirm, showToggleUserConfirm, showDeleteUserConfirm, showAddUserModal, showEditUserModal]);
  
  // Redirect if not authenticated, but only after loading is false
  useEffect(() => {
    // Check for valid device token and secret code session
    const deviceToken = localStorage.getItem('deviceToken');
    const qrExpiry = localStorage.getItem('admin_unlock_expiry');
    const now = new Date().getTime();
    const isSecretCodeSessionValid = qrExpiry && now < parseInt(qrExpiry, 10);

    if (!loading && !isAuthenticated) {
      if (deviceToken && isSecretCodeSessionValid) {
        // Allow access if device token and secret code session are valid
        setIsSecretCodeAuthenticated(true);
        return;
      }
    }
  }, [loading, isAuthenticated, navigate]);
  
  // Unified useEffect for initial data fetching and secret code authentication check
  useEffect(() => {
    if (loading || !isAuthenticated || !user) return; // Wait for auth to be ready
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
        const verificationExpiry = localStorage.getItem('admin_unlock_expiry');
        if (verificationExpiry) {
          const expiryTime = parseInt(verificationExpiry);
          const currentTime = new Date().getTime();
          if (currentTime < expiryTime) {
            setIsSecretCodeAuthenticated(true);
            const remainingMs = expiryTime - currentTime;
            const remainingMinutes = Math.floor(remainingMs / 60000);
            const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
            setSecretCodeTimeLeft(`${remainingMinutes}m ${remainingSeconds}s`);
          } else {
            localStorage.removeItem('admin_unlock_expiry');
            setSecretCodeTimeLeft(null);
            setIsSecretCodeAuthenticated(false);
          }
        } else {
          setIsSecretCodeAuthenticated(false);
        }
      }
      await Promise.allSettled(initialPromises);
    };
    loadAllInitialData();
  }, [loading, isAuthenticated, user]);

  // Periodically check secret code verification expiry
  useEffect(() => {
    if (isSecretCodeAuthenticated) {
      const timer = setInterval(() => {
        const verificationExpiry = localStorage.getItem('admin_unlock_expiry');
        if (verificationExpiry) {
          const expiryTime = parseInt(verificationExpiry);
          const currentTime = new Date().getTime();
          if (currentTime < expiryTime) {
            const remainingMs = expiryTime - currentTime;
            const remainingMinutes = Math.floor(remainingMs / 60000);
            const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
            setSecretCodeTimeLeft(`${remainingMinutes}m ${remainingSeconds}s`);
          } else {
            localStorage.removeItem('admin_unlock_expiry');
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
    setAuthOperationInProgress(); // Indicate that an auth operation is in progress

    try {
      let token = sessionStorage.getItem('token');
      // If no token, try to log in with username and entered password
      if (!token) {
        if (!user || !user.username) {
          setPasswordError('User information missing. Please log in again.');
          setIsVerifying(false);
          clearAuthOperationInProgress(); // Ensure cleared on early exit
          return;
        }
        // Attempt login using api utility with suppressAuthRedirect
        const loginResponse = await api.post('/auth/login', 
          { username: user.username, password: currentPassword, rememberDevice: true },
          true // suppressAuthRedirect
        );
        
        if (loginResponse.status === 'success' && loginResponse.token) {
          sessionStorage.setItem('token', loginResponse.token);
          sessionStorage.setItem('user', JSON.stringify(loginResponse.user));
          token = loginResponse.token;
          setPasswordError('');
          setIsCurrentPasswordValid(true);
          setShowNewPasswordFields(true);
        } else {
          setPasswordError(loginResponse.message || 'Incorrect password. Please try again.');
          setIsCurrentPasswordValid(false);
          setShowNewPasswordFields(false);
        }
        setIsVerifying(false);
        clearAuthOperationInProgress(); // Ensure cleared after this block
        return;
      }
      // If token exists, proceed as before using api utility with suppressAuthRedirect
      const response = await api.post('/auth/verify-password', 
        { password: currentPassword },
        true // suppressAuthRedirect
      );

      if (response.status === 'success') {
        setIsCurrentPasswordValid(true);
        setShowNewPasswordFields(true);
        setPasswordError('');
        console.log(`User ${user?.username || 'Admin'} successfully verified password`);
      } else {
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        setPasswordError(response.message || 'Failed to verify current password.');
        console.error(`User ${user?.username || 'Admin'} entered incorrect password`, response);
      }
    } catch (error) {
      setIsCurrentPasswordValid(false);
      setShowNewPasswordFields(false);
      setPasswordError(error.response?.data?.message || 'Failed to verify current password. Network error.');
      console.error('Password verification error:', error);
    } finally {
      setIsVerifying(false);
      clearAuthOperationInProgress(); // Clear auth operation in progress
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
      // Use api utility with suppressAuthRedirect
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      }, true); // Pass true for suppressAuthRedirect
      
      if (response.status === 'success') {
        setPasswordSuccess('Password changed successfully');
        // Clear form and reset states
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsCurrentPasswordValid(false);
        setShowNewPasswordFields(false);
        console.log(`User ${user?.username || 'Admin'} successfully changed password`);
      } else {
        setPasswordError(response.message || 'Failed to change password');
        console.error(`User ${user?.username || 'Admin'} failed to change password:`, response.message);
      }
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Error changing password. Please try again.');
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
      // No need to navigate here, AuthContext useEffect will handle it
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // The splash screen will be dismissed by AuthContext's navigation
      // If navigation fails, we ensure the splash is hidden
      setTimeout(() => {
          setShowLogoutDeleteSplash(false);
      }, 2000);
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

    // Mobile number validation: 10 digits only
    if (!/^\d{10}$/.test(addUserForm.mobileNumber)) {
      setUserError('Mobile number must be exactly 10 digits.');
      setAddUserLoading(false);
      return;
    }
    // Duplicate mobile number check
    if (users.some(u => u.mobileNumber === addUserForm.mobileNumber)) {
      setUserError('A user with this mobile number already exists.');
      setAddUserLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', addUserForm);
      showSuccess('User added successfully!');
      setShowAddUserModal(false);
      setAddUserForm({ name: '', mobileNumber: '', password: '', role: 'worker' });
      setConfirmAddUserPassword(''); // Clear confirm password after successful add
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
    setUserError('');

    // Prevent changing the last admin's role to worker
    if (selectedUser && selectedUser.role === 'admin' && editUserForm.role !== 'admin' && getAdminCount() === 1) {
      setUserError('At least one admin must remain. You cannot change the last admin to a worker.');
      return;
    }

    // Client-side validation for password fields
    if (editUserForm.password) { // Only validate if password is being changed
      if (editUserForm.password.length < 8) {
        setUserError('New password must be at least 8 characters long.');
        return;
      }
      if (editUserForm.password !== confirmEditPassword) {
        setUserError('New passwords do not match.');
        return;
      }
    }

    // Helper for edit form duplicate check
    const isEditUserMobileDuplicate = () => {
      return (
        editUserForm.mobileNumber &&
        users.some(u => u.mobileNumber === editUserForm.mobileNumber && u._id !== selectedUser?._id)
      );
    };

    setEditUserLoading(true);
    try {
      const updateData = { ...editUserForm };
      if (!updateData.password) delete updateData.password; // Don't send empty password
      // If password is provided, but no confirm password, it's an error on client side, should not happen with required field
      if (updateData.password && updateData.password !== confirmEditPassword) {
        setUserError('Passwords do not match. Please re-enter.');
        setEditUserLoading(false);
        return;
      }
      // In the Edit User Modal customContent, after the mobile number input:
      if (editUserForm.mobileNumber && isEditUserMobileDuplicate()) {
        setUserError('Mobile number already exists.');
        setEditUserLoading(false);
        return;
      }
      await api.put(`/auth/users/${selectedUser._id}`, updateData);
      showSuccess('User updated successfully!');
      setShowEditUserModal(false);
      setSelectedUser(null);
      setConfirmEditPassword(''); // Clear confirm password after successful edit
      await fetchUsers();
    } catch (err) {
      setUserError(err.message || 'Failed to update user.');
    } finally {
      setEditUserLoading(false);
    }
  };

  // Enable/disable user
  const handleToggleActive = async (userObj) => {
    if (user && (userObj._id === user._id || userObj.username === user.username)) {
      showError("You cannot disable your own account while logged in.");
      return;
    }
    if (userObj.isActive) { // If user is active, confirm before disabling
      setUserToToggle(userObj);
      setShowToggleUserConfirm(true);
    } else {
      // If user is already disabled, enable directly
      try {
        await api.put(`/auth/users/${userObj._id}`, { isActive: !userObj.isActive });
        showSuccess(`User ${userObj.isActive ? 'disabled' : 'enabled'} successfully!`);
        await fetchUsers();
      } catch (err) {
        showError('Failed to update user status.');
      }
    }
  };

  const confirmToggleUser = async () => {
    if (!userToToggle) return;
    setIsTogglingUser(true); // Set loading to true
    try {
      await api.put(`/auth/users/${userToToggle._id}`, { isActive: !userToToggle.isActive });
      showSuccess(`User ${userToToggle.isActive ? 'disabled' : 'enabled'} successfully!`);
      await fetchUsers();
    } catch (err) {
      showError('Failed to update user status.');
    } finally {
      setIsTogglingUser(false); // Set loading to false
      setShowToggleUserConfirm(false);
      setUserToToggle(null);
    }
  };

  const cancelToggleUser = () => {
    setShowToggleUserConfirm(false);
    setUserToToggle(null);
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
    setConfirmEditPassword(''); // Reset confirm password
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
    if (user && (userObj._id === user._id || userObj.username === user.username)) {
      showError("You cannot delete your own account while logged in.");
      return;
    }
    // Prevent deleting the last admin
    if (userObj.role === 'admin' && getAdminCount() === 1) {
      showError("At least one admin must remain. You cannot delete the last admin account.");
      return;
    }
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
    setIsSecretCodeAuthenticated(true);
    // Set a timestamp for 15 minutes from now
    const expiryTime = new Date().getTime() + (15 * 60 * 1000); // 15 minutes
    localStorage.setItem('admin_unlock_expiry', expiryTime.toString());
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

  // Handle secret code verification (for change secret code form)
  const verifyCurrentSecretCode = async () => {
    if (!currentSecretCode.trim()) {
      setSecretCodeError('Please enter your current secret access code.');
      return;
    }
    if (changeSecretCodeLockout && Date.now() < changeSecretCodeLockout) {
      const ms = changeSecretCodeLockout - Date.now();
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      return;
    }
    setIsSecretCodeChanging(true);
    setSecretCodeError('');
    setAuthOperationInProgress();
    try {
      let token = sessionStorage.getItem('token');
      if (!token) {
        token = localStorage.getItem('deviceToken');
      }
      const response = await api.post('/auth/secret-code/verify', {
        secretCode: currentSecretCode,
        deviceToken: localStorage.getItem('deviceToken'),
        usedWhere: 'Settings'
      }, true, true, token);
      if (response.status === 'success') {
        if (response.token) {
          sessionStorage.setItem('token', response.token);
        }
        setIsCurrentSecretCodeValid(true);
        setSecretCodeError('');
        showSuccess('Secret code verified. You can now change it.');
        setChangeSecretCodeLockout(null);
        setChangeSecretCodeAttempts(0);
      } else {
        // Wrong code: increment attempts
        const newAttempts = changeSecretCodeAttempts + 1;
        setChangeSecretCodeAttempts(newAttempts);
        if (newAttempts >= 3) {
          // Lockout for 24 hours
          const lockoutUntil = Date.now() + 24 * 60 * 60 * 1000;
          setChangeSecretCodeLockout(lockoutUntil);
          setSecretCodeError('Too many failed attempts. Locked out for 24 hours.');
        } else {
          setSecretCodeError(`Incorrect secret code. ${3 - newAttempts} attempt${3 - newAttempts === 1 ? '' : 's'} left.`);
        }
      }
    } catch (error) {
      if (error.status === 423) {
        setChangeSecretCodeLockout(error.data?.lockoutMs ? Date.now() + error.data.lockoutMs : Date.now() + 24 * 60 * 60 * 1000);
        setSecretCodeError(error.data?.message || 'Too many failed attempts. Locked out.');
        return;
      }
      // Instead, treat as a failed attempt
      const newAttempts = changeSecretCodeAttempts + 1;
      setChangeSecretCodeAttempts(newAttempts);
      if (newAttempts >= 3) {
        const lockoutUntil = Date.now() + 24 * 60 * 60 * 1000;
        setChangeSecretCodeLockout(lockoutUntil);
        setSecretCodeError('Too many failed attempts. Locked out for 24 hours.');
      } else {
        setSecretCodeError(`Incorrect secret code. ${3 - newAttempts} attempt${3 - newAttempts === 1 ? '' : 's'} left.`);
      }
    } finally {
      setIsSecretCodeChanging(false);
      clearAuthOperationInProgress();
    }
  };

  // New function for Admin Control specific secret code verification
  const handleAdminControlSecretCodeVerification = async () => {
    if (!adminUnlockSecretCode.trim()) {
      setSecretCodeError('Enter your secret access code.');
      return;
    }
    if (adminSecretCodeLockout && Date.now() < adminSecretCodeLockout) {
      const ms = adminSecretCodeLockout - Date.now();
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      return;
    }
    setIsSecretCodeChanging(true);
    setSecretCodeError('');
    setAuthOperationInProgress();
    try {
      let token = sessionStorage.getItem('token');
      if (!token) {
        token = localStorage.getItem('deviceToken');
      }
      const response = await api.post('/auth/secret-code/verify', {
        secretCode: adminUnlockSecretCode,
        deviceToken: localStorage.getItem('deviceToken'),
        usedWhere: 'Settings'
      }, true, true, token);
      if (response.status === 'success') {
        if (response.token) {
          sessionStorage.setItem('token', response.token);
        }
        if (response.deviceToken) {
          localStorage.setItem('deviceToken', response.deviceToken);
        }
        setSecretCodeError('');
        handleSecretCodeSuccess();
        setChangeSecretCodeLockout(null);
        setChangeSecretCodeAttempts(0);
        setAdminSecretCodeAttempts(0); // reset attempts on success
        setAdminSecretCodeLockout(null);
      } else {
        // Wrong code: increment attempts
        const newAttempts = adminSecretCodeAttempts + 1;
        setAdminSecretCodeAttempts(newAttempts);
        if (newAttempts >= 3) {
          // Lockout for 24 hours
          const lockoutUntil = Date.now() + 24 * 60 * 60 * 1000;
          setAdminSecretCodeLockout(lockoutUntil);
          setSecretCodeError('Too many failed attempts. Locked out for 24 hours.');
        } else {
          setSecretCodeError(`Incorrect secret code. ${3 - newAttempts} attempt${3 - newAttempts === 1 ? '' : 's'} left.`);
        }
      }
    } catch (error) {
      // Do NOT log out or redirect on 401/403 for this case
      if (error.status === 423) {
        setChangeSecretCodeLockout(error.data?.lockoutMs ? Date.now() + error.data.lockoutMs : Date.now() + 24 * 60 * 60 * 1000);
        setSecretCodeError(error.data?.message || 'Too many failed attempts. Locked out.');
        return;
      }
      // Instead, treat as a failed attempt
      const newAttempts = adminSecretCodeAttempts + 1;
      setAdminSecretCodeAttempts(newAttempts);
      if (newAttempts >= 3) {
        const lockoutUntil = Date.now() + 24 * 60 * 60 * 1000;
        setAdminSecretCodeLockout(lockoutUntil);
        setSecretCodeError('Too many failed attempts. Locked out for 24 hours.');
      } else {
        setSecretCodeError(`Incorrect secret code. ${3 - newAttempts} attempt${3 - newAttempts === 1 ? '' : 's'} left.`);
      }
    } finally {
      setIsSecretCodeChanging(false);
      clearAuthOperationInProgress();
    }
  };

  const isSecretCodeFormValid = () => {
    return (
      isCurrentSecretCodeValid &&
      newSecretCode.length >= 8 &&
      newSecretCode === confirmNewSecretCode
    );
  };
  
  // Handle secret code change
  const handleChangeSecretCode = async (e) => {
    e.preventDefault();

    setSecretCodeError('');
    setSecretCodeSuccess('');

    if (newSecretCode !== confirmNewSecretCode) {
      setSecretCodeError('New secret codes do not match.');
      return;
    }

    if (newSecretCode.length < 8) {
      setSecretCodeError('Secret code must be at least 8 characters long.');
      return;
    }

    setIsSecretCodeChanging(true);
    setAuthOperationInProgress();

    try {
      const response = await api.post('/auth/secret-code/change', {
        newSecretCode: newSecretCode,
      }, true);

      if (response.status === 'success') {
        setSecretCodeSuccess('Secret access code changed successfully!');
        setCurrentSecretCode('');
        setNewSecretCode('');
        setConfirmNewSecretCode('');
        setIsCurrentSecretCodeValid(false); // Reset verification status
        showSuccess('Secret access code changed successfully!');
      } else {
        setSecretCodeError(response.message || 'Failed to change secret code.');
        showError('Failed to change secret code.');
      }
    } catch (error) {
      setSecretCodeError(error.response?.data?.message || 'Error changing secret code. Please try again.');
      showError('Error changing secret code.');
    } finally {
      setIsSecretCodeChanging(false);
      clearAuthOperationInProgress();
    }
  };

  // Use effect to load secret code attempts and lockout from localStorage on mount
  // Remove useEffect to load secret code attempts and lockout from localStorage
  // Remove useEffect to handle lockout timer countdown from localStorage
  // Add useEffect to handle backend lockout timer
  useEffect(() => {
    let timer;
    if (changeSecretCodeLockout) {
      timer = setInterval(() => {
        const remainingMs = changeSecretCodeLockout - (Date.now() - lockoutStartRef.current);
        if (remainingMs > 0) {
          const hours = Math.floor(remainingMs / (1000 * 60 * 60));
          const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
          if (hours > 0) {
            setLockoutTimer(`${hours}h ${minutes}m`);
          } else {
            setLockoutTimer(`${minutes}m ${seconds}s`);
          }
        } else {
          clearInterval(timer);
          setChangeSecretCodeLockout(null);
          setLockoutMessage('');
          setLockoutTimer('');
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [changeSecretCodeLockout]);
  const lockoutStartRef = useRef(Date.now());

  // Effect to handle lockout timer countdown
  // Remove useEffect to handle lockout timer countdown from localStorage
  // Add useEffect to handle backend lockout timer
  useEffect(() => {
    let timer;
    if (changeSecretCodeLockout) {
      timer = setInterval(() => {
        const remainingMs = changeSecretCodeLockout - (Date.now() - lockoutStartRef.current);
        if (remainingMs > 0) {
          const hours = Math.floor(remainingMs / (1000 * 60 * 60));
          const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
          if (hours > 0) {
            setLockoutTimer(`${hours}h ${minutes}m`);
          } else {
            setLockoutTimer(`${minutes}m ${seconds}s`);
          }
        } else {
          clearInterval(timer);
          setChangeSecretCodeLockout(null);
          setLockoutMessage('');
          setLockoutTimer('');
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [changeSecretCodeLockout]);

  // Add useEffect to clear attempts/lockout after lockout expires
  useEffect(() => {
    if (adminSecretCodeLockout) {
      const timer = setInterval(() => {
        if (Date.now() >= adminSecretCodeLockout) {
          setAdminSecretCodeAttempts(0);
          setAdminSecretCodeLockout(null);
          setSecretCodeError('');
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [adminSecretCodeLockout]);

  // Utility to count admins
  const getAdminCount = () => users.filter(u => u.role === 'admin').length;

  // At the top of the return statement, show a spinner if loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-orange-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500 mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading Masala Madness...</p>
        </div>
      </div>
    );
  }

  // Add this helper function before the return in Settings
  const isAddUserFormValid = () => {
    return (
      addUserForm.name.trim().length > 0 &&
      /^\d{10}$/.test(addUserForm.mobileNumber) &&
      !users.some(u => u.mobileNumber === addUserForm.mobileNumber) &&
      addUserForm.password.length >= 8 &&
      addUserForm.password === confirmAddUserPassword &&
      addUserForm.role
    );
  };

  // Helper for edit form validation
  const isEditUserFormValid = () => {
    return (
      editUserForm.name.trim().length > 0 &&
      /^\d{10}$/.test(editUserForm.mobileNumber) &&
      !users.some(u => u.mobileNumber === editUserForm.mobileNumber && u._id !== selectedUser?._id) &&
      (!editUserForm.password || editUserForm.password.length >= 8) &&
      (editUserForm.password === confirmEditPassword) &&
      editUserForm.role
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 text-zinc-900 dark:text-zinc-900">
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
                    Once verified, you'll have access for 15 minutes without re-entering the code. 3 failed attempts will lock you out for 24 Hours.
                  </p>
                  <form onSubmit={(e) => { e.preventDefault(); handleAdminControlSecretCodeVerification(); }} className="space-y-4">
                    <div>
                      <label htmlFor="secretCodeAdminUnlock" className="sr-only">Secret Access Code</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type={showCurrentSecretCode ? 'text' : 'password'}
                          id="secretCodeAdminUnlock"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 pr-10"
                          placeholder="Enter secret access"
                          value={adminUnlockSecretCode}
                          onChange={(e) => setAdminUnlockSecretCode(e.target.value)}
                          required
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                          <button type="button" onClick={() => setShowCurrentSecretCode(!showCurrentSecretCode)} className="text-gray-500 hover:text-gray-700 focus:outline-none">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCurrentSecretCode ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-2.076m5.262-2.324A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 2.076m-5.262 2.324L12 12m0 0l-3.875 3.875M3 3l18 18' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'} />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCurrentSecretCode ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M12 9v.01M12 12v.01M12 15v.01M21 12c-1.333 4-5.333 7-9 7s-7.667-3-9-7c1.333-4 5.333-7 9-7s7.667 3 9 7z'} />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    {secretCodeError && <p className="text-red-500 text-sm mt-1 text-center">{secretCodeError}</p>}
                    <button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-lg"
                      disabled={isSecretCodeChanging || (changeSecretCodeLockout && changeSecretCodeLockout > 0)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {isSecretCodeChanging ? 'Unlocking...' : (changeSecretCodeLockout && changeSecretCodeLockout > 0) ? `Locked` : 'Unlock Admin'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="w-full">
                  {/* Actual Admin Controls content */}
                  <h2 className="text-xl font-bold text-gray-800 mb-6">User and Device Management</h2>
                  {secretCodeTimeLeft && (
                    <div className="text-center mb-4 p-2 bg-blue-50 rounded-lg text-sm text-blue-800 border border-blue-200">
                      Secret access session expires in: <span className="font-semibold">{secretCodeTimeLeft}</span>
                    </div>
                  )}

                  {/* User Management Section */}
                  <div className="bg-emerald-50 shadow-md rounded-xl p-4 sm:p-6 border border-emerald-200 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 text-2xl">
                        <i className="fas fa-users-cog"></i>
                      </span>
                      <h2 className="text-2xl font-bold text-emerald-700">User Management</h2>
                    </div>
                    {/* User List/Cards */}
                    {loadingUsers ? (
                      <div className="flex items-center justify-center h-48">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-emerald-500 mr-4"></div>
                        <p className="text-gray-700 font-medium">Loading users...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users && users.length > 0 ? users.map(u => {
                          const isExpanded = expandedUsers.has(u._id);
                          const shouldDisplayDetails = isDesktopView || isExpanded;
                          const isCurrentUser = user && (u._id === user._id || u.username === user.username);

                          return (
                            <div
                              key={u._id}
                              className={`bg-white border border-gray-200 rounded-lg shadow-sm p-4 relative transition-all duration-200 ${!isDesktopView ? 'cursor-pointer hover:border-blue-300 hover:shadow-lg hover:scale-[1.01]' : ''}`}
                              onClick={isDesktopView ? null : () => toggleExpandUser(u._id)}
                            >
                              <div className="absolute top-3 right-3 flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} title={u.isActive ? 'Active' : 'Disabled'}></div>
                                {!isDesktopView && (
                                  <span className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-0' : 'rotate-180'}`}>
                                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                                    </svg>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-start mb-2">
                                <p className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">{u.name}
                                  {isCurrentUser && (
                                    <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200">Current Account</span>
                                  )}
                                </p>
                              </div>
                              <p className="text-base text-gray-600 font-medium capitalize">Role: {u.role}</p>
                              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${shouldDisplayDetails ? 'opacity-100' : 'opacity-0'}`} style={{ maxHeight: shouldDisplayDetails ? '500px' : '0' }}>
                                <p className="text-sm text-gray-800 mt-2"><span className="font-semibold">Mobile:</span> {u.mobileNumber}</p>
                                <p className="text-sm text-gray-800 mt-2"><span className="font-semibold">Last Login:</span> {u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}</p>
                                <p className="text-sm text-gray-800 mt-2"><span className="font-semibold">Created:</span> {new Date(u.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                                <div className="mt-4 flex flex-row justify-start items-center gap-2">
                                  <button
                                    className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors duration-200 shadow-sm"
                                    onClick={(e) => { e.stopPropagation(); openEditUserModal(u); }}
                                    title="Edit User"
                                    aria-label="Edit User"
                                  >
                                    <svg className="h-4 w-4 text-blue-400 group-hover:text-blue-700 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" /></svg>
                                  </button>
                                  <button
                                    className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200 shadow-sm"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteUser(u); }}
                                    title="Delete User"
                                    aria-label="Delete User"
                                  >
                                    <svg className="h-4 w-4 text-red-400 group-hover:text-red-700 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                  <div className="w-auto">
                                    <ToggleSwitch
                                      isActive={u.isActive}
                                      onToggle={(e) => { e.stopPropagation(); handleToggleActive(u); }}
                                      label={u.isActive ? "Active" : "Disabled"}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }) : (
                          <p className="text-center text-gray-400 py-6 col-span-full">No users found.</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Add User Section */}
                  <div className="bg-blue-50 shadow-md rounded-xl p-4 sm:p-6 border border-blue-200 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 text-2xl">
                        <i className="fas fa-user-plus"></i>
                      </span>
                      <h2 className="text-2xl font-bold text-blue-700">Add New User</h2>
                    </div>
                    {/* Add User Form */}
                    <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input type="text" className="w-full border rounded px-3 py-2" required value={addUserForm.name} onChange={e => setAddUserForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Mobile Number</label>
                        <input type="text" className="w-full border rounded px-3 py-2" required value={addUserForm.mobileNumber} 
                          onChange={e => {
                            // Only allow numbers and max 10 digits
                            let value = e.target.value.replace(/[^0-9]/g, '');
                            if (value.length > 10) value = value.slice(0, 10);
                            setAddUserForm(f => ({ ...f, mobileNumber: value }));
                          }}
                          maxLength={10}
                        />
                        {/* Live validation for 10 digits */}
                        {addUserForm.mobileNumber && addUserForm.mobileNumber.length !== 10 && (
                          <p className="text-red-500 text-sm mt-1">Mobile number must be exactly 10 digits.</p>
                        )}
                        {/* Live validation for duplicate number */}
                        {addUserForm.mobileNumber && users.some(u => u.mobileNumber === addUserForm.mobileNumber) && (
                          <p className="text-red-500 text-sm mt-1">Mobile number already exists.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <div className="relative">
                          <input
                            type={showAddUserPassword ? "text" : "password"}
                            className="w-full border rounded px-3 py-2 pr-10"
                            required
                            value={addUserForm.password}
                            onChange={e => setAddUserForm(f => ({ ...f, password: e.target.value }))}
                          />
                          <button
                            type="button"
                            onClick={() => setShowAddUserPassword(!showAddUserPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showAddUserPassword ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-2.076m5.262-2.324A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 2.076m-5.262 2.324L12 12m0 0l-3.875 3.875M3 3l18 18' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'} />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showAddUserPassword ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M12 9v.01M12 12v.01M12 15v.01M21 12c-1.333 4-5.333 7-9 7s-7.667-3-9-7c1.333-4 5.333-7 9-7s7.667 3 9 7z'} />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Confirm Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmAddUserPassword ? "text" : "password"}
                            className="w-full border rounded px-3 py-2 pr-10"
                            required
                            value={confirmAddUserPassword}
                            onChange={e => setConfirmAddUserPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmAddUserPassword(!showConfirmAddUserPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 focus:outline-none"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showConfirmAddUserPassword ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-2.076m5.262-2.324A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 2.076m-5.262 2.324L12 12m0 0l-3.875 3.875M3 3l18 18' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'} />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showConfirmAddUserPassword ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M12 9v.01M12 12v.01M12 15v.01M21 12c-1.333 4-5.333 7-9 7s-7.667-3-9-7c1.333-4 5.333-7 9-7s7.667 3 9 7z'} />
                            </svg>
                          </button>
                        </div>
                        {addUserForm.password && addUserForm.password.length > 0 && confirmAddUserPassword.length > 0 && addUserForm.password !== confirmAddUserPassword && (
                          <p className="text-red-500 text-sm mt-1">Passwords do not match.</p>
                        )}
                        {addUserForm.password && addUserForm.password.length < 8 && (
                          <p className="text-red-500 text-sm mt-1">Password must be at least 8 characters.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <select className="w-full border rounded px-3 py-2" value={addUserForm.role} onChange={e => setAddUserForm(f => ({ ...f, role: e.target.value }))}>
                          <option value="admin">Admin</option>
                          <option value="worker">Worker</option>
                        </select>
                      </div>
                      <div className="md:col-span-4 flex justify-end mt-2">
                        <button type="submit" className={`px-6 py-2 rounded font-semibold shadow transition w-full md:w-auto ${isAddUserFormValid() && !addUserLoading ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-white cursor-not-allowed'}`} disabled={!isAddUserFormValid() || addUserLoading}>{addUserLoading ? 'Adding...' : 'Add User'}</button>
                      </div>
                    </form>
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
                      {/* Show Current Password Checkbox */}
                      <div className="flex items-center mt-1">
                        <input
                          id="showCurrentPassword" // Renamed id for clarity
                          type="checkbox"
                          checked={showCurrentPassword}
                          onChange={() => setShowCurrentPassword((prev) => !prev)}
                          className="mr-2"
                        />
                        <label htmlFor="showCurrentPassword" className="text-xs text-gray-600 select-none">Show Current Password</label>
                      </div>
                      
                      {showNewPasswordFields && (
                        <>
                          <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                              New Password
                            </label>
                            <input
                              id="newPassword"
                              type={showNewPasswords ? "text" : "password"} // Use unified state
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                              required
                              minLength={8}
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                              Confirm New Password
                            </label>
                            <input
                              id="confirmPassword"
                              type={showNewPasswords ? "text" : "password"} // Use unified state
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                              required
                            />
                            {confirmPassword && newPassword !== confirmPassword && (
                              <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                            )}
                          </div>
                          {/* Unified Show New/Confirm Passwords Checkbox */}
                          <div className="flex items-center mt-1">
                            <input
                              id="showNewPasswords" // New ID for unified control
                              type="checkbox"
                              checked={showNewPasswords}
                              onChange={() => setShowNewPasswords((prev) => !prev)}
                              className="mr-2"
                            />
                            <label htmlFor="showNewPasswords" className="text-xs text-gray-600 select-none">Show New Passwords</label>
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
          
                {/* Change Secret Access Code Section */}
                <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Change Secret Access Code</h3>
                  <p className="text-xs text-gray-500 mt-1 mb-2">3 failed attempts will lock you out for 24 hours.</p>

                  {!isCurrentSecretCodeValid ? (
                    <form onSubmit={(e) => { e.preventDefault(); verifyCurrentSecretCode(); }} className="space-y-4">
                      <div>
                        <label htmlFor="currentSecretCode" className="block text-sm font-medium text-gray-700">Current Secret Access Code</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type={showCurrentSecretCode ? 'text' : 'password'}
                            id="currentSecretCode"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 pr-10"
                            placeholder="Enter current secret access code"
                            value={currentSecretCode}
                            onChange={(e) => setCurrentSecretCode(e.target.value)}
                            required
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                            <button type="button" onClick={() => setShowCurrentSecretCode(!showCurrentSecretCode)} className="text-gray-500 hover:text-gray-700 focus:outline-none">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCurrentSecretCode ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-2.076m5.262-2.324A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 2.076m-5.262 2.324L12 12m0 0l-3.875 3.875M3 3l18 18' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'} />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCurrentSecretCode ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M12 9v.01M12 12v.01M12 15v.01M21 12c-1.333 4-5.333 7-9 7s-7.667-3-9-7c1.333-4 5.333-7 9-7s7.667 3 9 7z'} />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      {secretCodeError && <p className="text-red-500 text-sm mt-1">{secretCodeError}</p>}
                      {changeSecretCodeLockout && Date.now() < changeSecretCodeLockout && (
                        <p className="text-red-500 text-sm mt-2 text-center">Locked out. Try again after {(() => { const ms = changeSecretCodeLockout - Date.now(); const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`; })()}</p>
                      )}
                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition duration-200"
                        disabled={isSecretCodeChanging || (changeSecretCodeLockout && changeSecretCodeLockout > 0)}
                      >
                        {isSecretCodeChanging ? 'Verifying...' : (changeSecretCodeLockout && changeSecretCodeLockout > 0) ? `Locked` : 'Verify Current Secret Code'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleChangeSecretCode} className="space-y-4">
                      <div>
                        <label htmlFor="newSecretCode" className="block text-sm font-medium text-gray-700">New Secret Access Code</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type={showNewSecretCode ? 'text' : 'password'}
                            id="newSecretCode"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 pr-10"
                            placeholder="Enter new secret access code"
                            value={newSecretCode}
                            onChange={(e) => setNewSecretCode(e.target.value)}
                            required
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                            <button type="button" onClick={() => setShowNewSecretCode(!showNewSecretCode)} className="text-gray-500 hover:text-gray-700 focus:outline-none">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showNewSecretCode ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-2.076m5.262-2.324A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 2.076m-5.262 2.324L12 12m0 0l-3.875 3.875M3 3l18 18' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'} />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showNewSecretCode ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M12 9v.01M12 12v.01M12 15v.01M21 12c-1.333 4-5.333 7-9 7s-7.667-3-9-7c1.333-4 5.333-7 9-7s7.667 3 9 7z'} />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="confirmNewSecretCode" className="block text-sm font-medium text-gray-700">Confirm New Secret Access Code</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type={showConfirmNewSecretCode ? 'text' : 'password'}
                            id="confirmNewSecretCode"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 pr-10"
                            placeholder="Confirm new secret access code"
                            value={confirmNewSecretCode}
                            onChange={(e) => setConfirmNewSecretCode(e.target.value)}
                            required
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                            <button type="button" onClick={() => setShowConfirmNewSecretCode(!showConfirmNewSecretCode)} className="text-gray-500 hover:text-gray-700 focus:outline-none">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showConfirmNewSecretCode ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-2.076m5.262-2.324A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 2.076m-5.262 2.324L12 12m0 0l-3.875 3.875M3 3l18 18' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'} />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showConfirmNewSecretCode ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M12 9v.01M12 12v.01M12 15v.01M21 12c-1.333 4-5.333 7-9 7s-7.667-3-9-7c1.333-4 5.333-7 9-7s7.667 3 9 7z'} />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      {secretCodeError && <p className="text-red-500 text-sm mt-1">{secretCodeError}</p>}
                      {secretCodeSuccess && <p className="text-green-500 text-sm mt-1">{secretCodeSuccess}</p>}
                      <button
                        type="submit"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition duration-200"
                        disabled={isSecretCodeChanging || !isSecretCodeFormValid()}
                      >
                        {isSecretCodeChanging ? 'Changing...' : 'Change Secret Code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCurrentSecretCodeValid(false);
                          setSecretCodeError('');
                          setSecretCodeSuccess('');
                          setCurrentSecretCode('');
                          setNewSecretCode('');
                          setConfirmNewSecretCode('');
                        }}
                        className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md shadow-sm transition duration-200 mt-2"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </div>

                {/* Logout Section */}
                <div className="bg-red-50 rounded-lg p-6 shadow mb-6 border border-red-200 mt-6">
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
        confirmText="Yes, Log Out"
        cancelText="Cancel"
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
      
      {/* Edit User Modal (reuse ConfirmationDialog) */}
      <ConfirmationDialog
        isOpen={showEditUserModal}
        onClose={() => setShowEditUserModal(false)}
        title="Edit User"
        confirmText={null}
        cancelText={null}
        type="success" // Add type prop to change color to green
        customContent={useMemo(() => (
          <form onSubmit={handleEditUser} className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required value={editUserForm.name} onChange={e => setEditUserForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile Number</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                value={editUserForm.mobileNumber}
                onChange={e => {
                  // Only allow numbers and max 10 digits
                  let value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length > 10) value = value.slice(0, 10);
                  setEditUserForm(f => ({ ...f, mobileNumber: value }));
                }}
                maxLength={10}
              />
              {/* Live validation for only numbers (handled by input) */}
              {/* Live validation for 10 digits */}
              {editUserForm.mobileNumber && editUserForm.mobileNumber.length !== 10 && (
                <p className="text-red-500 text-sm mt-1">Mobile number must be exactly 10 digits.</p>
              )}
              {/* Live validation for duplicate number */}
              {editUserForm.mobileNumber && users.some(u => u.mobileNumber === editUserForm.mobileNumber && u._id !== selectedUser?._id) && (
                <p className="text-red-500 text-sm mt-1">Already Exists</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Enter New Password</label>
              <div className="relative">
                <input
                  type={showEditUserPassword ? "text" : "password"}
                  className="w-full border rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={editUserForm.password}
                  onChange={e => setEditUserForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showEditUserPassword ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-2.076m5.262-2.324A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 2.076m-5.262 2.324L12 12m0 0l-3.875 3.875M3 3l18 18' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showEditUserPassword ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M12 9v.01M12 12v.01M12 15v.01M21 12c-1.333 4-5.333 7-9 7s-7.667-3-9-7c1.333-4 5.333-7 9-7s7.667 3 9 7z'} />
                  </svg>
                </button>
              </div>
              {editUserForm.password && editUserForm.password.length < 8 && (
                <p className="text-red-500 text-sm mt-1">Password must be at least 8 characters.</p>
              )}
            </div>
            {editUserForm.password && (
              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmEditUserPassword ? "text" : "password"}
                    className="w-full border rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={confirmEditPassword}
                    onChange={e => setConfirmEditPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmEditUserPassword(!showConfirmEditUserPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showConfirmEditUserPassword ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-2.076m5.262-2.324A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 2.076m-5.262 2.324L12 12m0 0l-3.875 3.875M3 3l18 18' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'} />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showConfirmEditUserPassword ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' : 'M12 9v.01M12 12v.01M12 15v.01M21 12c-1.333 4-5.333 7-9 7s-7.667-3-9-7c1.333-4 5.333-7 9-7s7.667 3 9 7z'} />
                    </svg>
                  </button>
                </div>
                {editUserForm.password !== confirmEditPassword && (
                  <p className="text-red-500 text-sm mt-1">New passwords do not match.</p>
                )}
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Role</label>
              <select className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={editUserForm.role} onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="worker">Worker</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={editUserForm.isActive} onChange={e => setEditUserForm(f => ({ ...f, isActive: e.target.checked }))} />
              <label htmlFor="isActive" className="text-sm">Active</label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-4">
              <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowEditUserModal(false)}>Cancel</button>
              <button type="submit" className={`px-4 py-2 rounded font-semibold shadow transition w-full md:w-auto ${isEditUserFormValid() && !editUserLoading ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-white cursor-not-allowed'}`} disabled={!isEditUserFormValid() || editUserLoading}>{editUserLoading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        ), [editUserForm, confirmEditPassword, showEditUserPassword, editUserLoading, handleEditUser, setShowEditUserModal])}
      />

      {/* Toggle User Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showToggleUserConfirm}
        onClose={cancelToggleUser}
        onConfirm={confirmToggleUser}
        title={userToToggle?.isActive ? "Disable User" : "Enable User"}
        message={userToToggle?.isActive 
          ? `Are you sure you want to disable user '${userToToggle?.name}'? This will prevent them from logging in.`
          : `Are you sure you want to enable user '${userToToggle?.name}'?`}
        confirmText={isTogglingUser ? (userToToggle?.isActive ? "Disabling..." : "Enabling...") : (userToToggle?.isActive ? "Yes, Disable" : "Yes, Enable")}
        cancelText="Cancel"
        type={userToToggle?.isActive ? "danger" : "info"}
        isLoading={isTogglingUser}
      />

    </div>
  );
};

export default Settings; 