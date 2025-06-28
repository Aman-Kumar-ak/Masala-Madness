import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../components/NotificationContext';
import useKeyboardScrollAdjustment from "../hooks/useKeyboardScrollAdjustment";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { preloadImages } from '../utils/imageOptimizations';
import api from '../utils/api';

const Login = () => {
  useKeyboardScrollAdjustment();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [showForm, setShowForm] = useState(false);
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  
  const { login, isAuthenticated, logout, user, setUser, setIsAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const initialCheckRef = useRef(false);
  
  // New states for disabled account dialog
  const [showDisabledAccountDialog, setShowDisabledAccountDialog] = useState(false);
  const [disabledAccountMessage, setDisabledAccountMessage] = useState('');
  
  // --- Quick Login Helpers ---
  const ACCOUNTS_KEY = 'savedAccounts';
  function getSavedAccounts() {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
  }
  function saveAccount(username, deviceToken) {
    const accounts = getSavedAccounts();
    // Remove any existing entry for this username
    const filtered = accounts.filter(acc => acc.username !== username);
    filtered.push({ username, deviceToken });
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));
  }
  function removeAccount(username) {
    const accounts = getSavedAccounts().filter(acc => acc.username !== username);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
  // --- Quick Login State ---
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [showAccountList, setShowAccountList] = useState(false);
  const [quickLoginUser, setQuickLoginUser] = useState(null);
  const [quickLoginError, setQuickLoginError] = useState('');
  const [forceShowForm, setForceShowForm] = useState(false);
  
  // Add state at the top of the component:
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState(null);
  
  // Add state to track quick login loading
  const [isQuickLoginLoading, setIsQuickLoginLoading] = useState(false);
  
  // Initial check for tokens to prevent login page flash
  useEffect(() => {
    const checkForExistingTokens = async () => {
      if (initialCheckRef.current) return;
      initialCheckRef.current = true;
      
      const jwtToken = sessionStorage.getItem('token');
      const deviceToken = localStorage.getItem('deviceToken');
      
      if (jwtToken || deviceToken) {
        return;
      }
      
      setIsLoading(false);
      setInitialCheckComplete(true);
    };
    
    checkForExistingTokens();
    
    // Preload specific images for the login page
    preloadImages(['/images/m_logo.png', '/images/login.png']);

  }, []);
  
  // If already authenticated after initial check, redirect to home page
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'worker') {
        navigate('/worker-home');
      } else {
        navigate('/home');
      }
    } else if (initialCheckComplete) {
      setIsLoading(false);
    }
  }, [isAuthenticated, navigate, initialCheckComplete, user]);
  
  // Show logout success notification if redirected from logout
  useEffect(() => {
    const logoutSuccess = sessionStorage.getItem('logoutSuccess');
    if (logoutSuccess === 'true') {
      sessionStorage.removeItem('logoutSuccess');
      showSuccess('Logged out successfully!');
    }
  }, [showSuccess]);
  
  // On mount: Load saved accounts and always show splash if none
  useEffect(() => {
    const accounts = getSavedAccounts();
    setSavedAccounts(accounts);
    setShowAccountList(accounts.length > 0);
    setForceShowForm(false); // Always show splash first if no accounts
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      setShowForm(true); // Always keep the form open on error
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const deviceToken = rememberDevice ? localStorage.getItem('deviceToken') : null;
      // Use suppressAuthRedirect=true for login
      const result = await login(username, password, rememberDevice, deviceToken, true);
      
      if (result.success) {
        if (rememberDevice && result.deviceToken) {
          saveAccount(result.user.username, result.deviceToken);
        }
        if (result.deviceToken && rememberDevice) {
          localStorage.setItem('deviceToken', result.deviceToken);
        }
        
        // Delay navigation slightly to allow notification to be seen
        setTimeout(() => {
          // Check user role and navigate accordingly
          if (result.user && result.user.role === 'worker') {
            navigate('/worker-home');
          } else {
            navigate('/home');
          }
        }, 800);
      } else {
        if (result.message.toLowerCase().includes('disabled')) {
          setDisabledAccountMessage('Your account is disabled. Please contact the administrator.');
          setShowDisabledAccountDialog(true);
        } else if (result.message.toLowerCase().includes('invalid') || result.message.toLowerCase().includes('credentials')) {
          setError('Invalid credentials. Please try again.');
        } else {
          setError(result.message);
        }
        // Show recovery instructions if we get an indication that admin user doesn't exist
        if (result.message.includes('credentials') || result.message.includes('not found')) {
          setShowRecovery(true);
        }
        setShowForm(true); // Always keep the form open on error
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setShowRecovery(true);
      setShowForm(true); // Always keep the form open on error
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to handle the login button click
  const handleLoginClick = () => {
    setIsTransitioning(true);
    // Delay showing the form slightly to allow exit animations to complete
    setTimeout(() => {
      setShowForm(true);
      setIsTransitioning(false);
    }, 600);
  };
  
  // Shine animation variant - modified to work with hover state
  const shineVariants = {
    initial: {
      x: "-100%",
      opacity: 0
    },
    animate: {
      x: ["-100%", "400%"],
      opacity: [0, 1, 0],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut"
      }
    },
    hover: {
      x: ["0%", "100%"],
      opacity: 0.5,
      transition: {
        duration: 1,
        delay: 0.2, // Slight delay after the gradient fill starts
        ease: "easeInOut"
      }
    }
  };

  // --- Quick Login Handler (deviceToken) ---
  const handleQuickLogin = async (account) => {
    setIsQuickLoginLoading(true);
    setQuickLoginError('');
    // Block refresh
    const blockRefresh = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', blockRefresh);
    const blockF5 = (e) => {
      if ((e.key === 'F5') || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', blockF5);
    try {
      const response = await api.post('/auth/refresh-token', { deviceToken: account.deviceToken });
      if (response && response.token && response.user) {
        // Set tokens and user in storage
        sessionStorage.setItem('token', response.token);
        sessionStorage.setItem('user', JSON.stringify(response.user));
        sessionStorage.setItem('jwtVerified', 'true');
        localStorage.setItem('deviceToken', response.deviceToken);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('jwtVerified', 'true');
        setUser(response.user);
        setIsAuthenticated(true);
        setQuickLoginUser(null);
        setQuickLoginError('');
        setTimeout(() => {
          window.removeEventListener('beforeunload', blockRefresh);
          window.removeEventListener('keydown', blockF5);
          setIsQuickLoginLoading(false);
          if (response.user && response.user.role === 'worker') {
            navigate('/worker-home');
          } else {
            navigate('/home');
          }
        }, 800);
      } else {
        setQuickLoginError('Session expired. Please log in again.');
        removeAccount(account.username);
        const updated = getSavedAccounts();
        setSavedAccounts(updated);
        if (updated.length === 0) {
          setShowAccountList(false);
          setForceShowForm(false); // Show splash, not login form
        }
        window.removeEventListener('beforeunload', blockRefresh);
        window.removeEventListener('keydown', blockF5);
        setIsQuickLoginLoading(false);
      }
    } catch (err) {
      // Handle disabled account (403 or error message)
      if ((err?.response?.status === 403) || (err?.message && err.message.toLowerCase().includes('disabled'))) {
        setQuickLoginError('Your account is disabled. Please contact the administrator.');
        if (typeof showError === 'function') showError('Your account is disabled. Please contact the administrator.');
        removeAccount(account.username);
        const updated = getSavedAccounts();
        setSavedAccounts(updated);
        if (updated.length === 0) {
          setShowAccountList(false);
          setForceShowForm(false); // Show splash, not login form
        }
      } else {
      setQuickLoginError('Session expired. Please log in again.');
      removeAccount(account.username);
      const updated = getSavedAccounts();
      setSavedAccounts(updated);
        if (updated.length === 0) {
          setShowAccountList(false);
          setForceShowForm(false); // Show splash, not login form
        }
      }
      window.removeEventListener('beforeunload', blockRefresh);
      window.removeEventListener('keydown', blockF5);
      setIsQuickLoginLoading(false);
    }
  };

  const handleSignInClick = () => {
    setIsFilling(true);
    setTimeout(() => {
      setForceShowForm(true);
      setIsFilling(false);
    }, 700); // Duration matches animation
  };

  // If still in initial loading state, show a loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Masala Madness...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-orange-100 to-red-50">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Top circles */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-to-br from-red-200 to-orange-300 rounded-full opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-20 right-10 w-40 h-40 bg-gradient-to-bl from-yellow-200 to-orange-300 rounded-full opacity-30"></div>
        
        {/* Bottom circles */}
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-tl from-red-300 to-yellow-200 rounded-full opacity-20 translate-x-1/3 translate-y-1/2"></div>
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-gradient-to-tr from-orange-200 to-yellow-300 rounded-full opacity-30"></div>
        
        {/* Spice pattern - stylized elements */}
        <div className="absolute top-1/3 left-10 w-8 h-8 border-2 border-orange-300 opacity-30 rotate-45"></div>
        <div className="absolute top-1/4 right-20 w-6 h-6 border-2 border-red-300 opacity-20 rotate-12"></div>
        <div className="absolute bottom-1/3 left-1/4 w-10 h-10 border-2 border-yellow-400 opacity-20 -rotate-12"></div>
        <div className="absolute bottom-1/4 right-1/3 w-7 h-7 border-2 border-orange-400 opacity-20 rotate-30"></div>
        
        {/* Additional decorative spice patterns */}
        <motion.div 
          className="absolute top-1/2 left-20 w-3 h-10 bg-red-400/20 rounded-full"
          animate={{ 
            y: ["-5px", "5px"],
            opacity: [0.5, 0.7]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        ></motion.div>
        <motion.div 
          className="absolute bottom-1/2 right-24 w-3 h-10 bg-orange-400/20 rounded-full"
          animate={{ 
            y: ["5px", "-5px"],
            opacity: [0.5, 0.7]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        ></motion.div>
      </div>
      
      {/* Main content, hidden during quick login loading */}
      {!isQuickLoginLoading && (
        <>
      {showAccountList ? (
            <div className="w-full max-w-md p-8 space-y-8 z-10 relative mx-auto">
              {/* Decorative background for account selection */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-100 via-yellow-50 to-red-50 opacity-80 blur-sm -z-10"></div>
              {/* Logo and tagline */}
              <div className="flex flex-col items-center mb-4">
                <div className="relative bg-white p-2 rounded-full shadow-xl border-4 border-orange-200 mb-2" style={{ boxShadow: '0 8px 32px 0 rgba(251, 113, 32, 0.15)' }}>
                  <img 
                    src="/images/m_logo.png" 
                    alt="Masala Madness Logo" 
                    className="w-20 h-20 object-contain rounded-full animate-pulse"
                    style={{ filter: "drop-shadow(0 6px 16px rgba(251, 113, 32, 0.25))" }}
                  />
                </div>
                <div className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500 mb-1">Masala Madness</div>
                <div className="text-xs text-orange-600 font-semibold tracking-wide mb-2">Quick Account Login</div>
              </div>
              <h2 className="text-lg font-bold mb-4 text-center text-orange-700 flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 01-8 0" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7m0 0H9m3 0h3" /></svg>
                Saved accounts  
              </h2>
              <div className="space-y-3">
            {savedAccounts.map(account => (
              <div
                key={account.username}
                    className="flex items-center justify-between bg-white border rounded-xl px-5 py-4 shadow-lg cursor-pointer hover:bg-orange-100 hover:shadow-xl transition group relative overflow-hidden"
                onClick={() => handleQuickLogin(account)}
                    style={{ position: 'relative' }}
              >
                    {/* Username only, no avatar/circle */}
                    <span className="font-semibold text-gray-800 text-base tracking-wide group-hover:text-orange-600 transition">{account.username}</span>
                    {/* Delete button with tooltip */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                        setAccountToRemove(account.username);
                        setShowRemoveDialog(true);
                  }}
                  aria-label="Delete account"
                      tabIndex={0}
                      type="button"
                >
                      {/* Trash can icon for remove */}
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                  </svg>
                </button>
                    {/* Ripple effect */}
                    <span className="absolute inset-0 rounded-xl bg-orange-100 opacity-0 group-active:opacity-30 transition duration-200 pointer-events-none"></span>
              </div>
            ))}
          </div>
          {quickLoginError && (
            <div className="text-red-500 text-center mt-2">{quickLoginError}</div>
          )}
          <button
                className="mt-6 w-full py-3 rounded-xl border-none text-white font-bold bg-gradient-to-r from-orange-500 to-red-500 shadow-lg hover:from-red-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group"
                style={{ boxShadow: '0 4px 16px 0 rgba(251, 113, 32, 0.15)' }}
            onClick={() => {
              setShowAccountList(false);
              setForceShowForm(true);
            }}
          >
                <svg className="w-5 h-5 mr-2 text-white group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
            Login with another account
                <span className="absolute left-0 top-0 w-full h-full bg-white opacity-0 group-hover:opacity-10 transition duration-300 pointer-events-none"></span>
          </button>
        </div>
      ) : forceShowForm ? (
        <div className="w-full max-w-md p-8 space-y-8 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key="form"
              className="bg-white/70 rounded-2xl shadow-2xl overflow-hidden border border-orange-100 backdrop-blur-md w-full max-w-md mx-auto z-10"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                boxShadow: "0 25px 50px -12px rgba(251, 113, 32, 0.15), 0 0 0 1px rgba(251, 113, 32, 0.05)",
                backdropFilter: "blur(16px)"
              }}
            >
              {/* Header with glass morphism effect */}
              <div className="w-full rounded-t-2xl bg-gradient-to-r from-red-600 to-orange-400 px-4 py-3 flex items-center justify-center mb-0">
                <svg className="w-7 h-7 mr-2 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span className="text-white text-xl font-extrabold tracking-wide">Admin Dashboard</span>
              </div>
              
              <div className="p-8">
                <motion.div 
                  className="flex flex-col items-center mt-[-1.5rem] mb-2 relative z-10">
                  <div className="relative flex items-center justify-center mb-1" style={{ width: '6.5rem', height: '6.5rem' }}>
                    <motion.div
                      className="absolute inset-0 z-0"
                      style={{ borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,113,32,0.25) 0%, rgba(251,113,32,0.10) 70%, transparent 100%)' }}
                      animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
                    />
                    <div className="relative bg-white p-0.5 rounded-full shadow-xl border-4 border-orange-200 z-10" style={{ boxShadow: '0 8px 32px 0 rgba(251, 113, 32, 0.15)' }}>
                      <img 
                        src="/images/m_logo.png" 
                        alt="Masala Madness Logo" 
                        className="w-20 h-20 object-contain rounded-full"
                        style={{ filter: "drop-shadow(0 6px 16px rgba(251, 113, 32, 0.25))" }}
                      />
                    </div>
                  </div>
                </motion.div>
                
                <div className="text-2xl font-extrabold text-orange-600 text-center mb-4">Masala Madness</div>
                
                {error && (
                  <motion.div 
                    className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg" 
                    role="alert"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 100 }}
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <input
                          id="username"
                          name="username"
                          type="text"
                          required
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                          placeholder="Enter your username"
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setError(''); }}
                          disabled={isLoading}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck="false"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          required
                          className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(''); }}
                          disabled={isLoading}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 bg-transparent border-none outline-none focus:outline-none"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          style={{ boxShadow: 'none', background: 'none', padding: 0 }}
                        >
                          {showPassword ? (
                            // Hide password (eye with slash)
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M9.88 9.88A3 3 0 0112 9c1.66 0 3 1.34 3 3 0 .53-.14 1.03-.38 1.46M6.53 6.53A9.97 9.97 0 003 12c0 2.97 4 7 9 7 1.13 0 2.19-.37 3.13-1.03m2.1-2.1A9.97 9.97 0 0021 12c0-2.97-4-7-9-7-1.13 0-2.19.37-3.13 1.03" />
                            </svg>
                          ) : (
                            // Show password (provided SVG)
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v.01M12 12v.01M12 15v.01M21 12c-1.333 4-5.333 7-9 7s-7.667-3-9-7c1.333-4 5.333-7 9-7s7.667 3 9 7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-3 px-2 py-2 rounded-lg bg-orange-50 border border-orange-200 w-full">
                      <input
                        id="rememberDevice"
                        name="rememberDevice"
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={e => setRememberDevice(e.target.checked)}
                        className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded transition-all duration-200"
                      />
                      <label htmlFor="rememberDevice" className="text-base text-gray-700 select-none cursor-pointer font-medium">
                        Remember this device
                      </label>
                    </div>  
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
                    className="space-y-3"
                  >
                        <div className="w-full flex justify-center items-center mt-2">
                          <motion.button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 rounded-xl shadow-md text-base font-bold text-white bg-gradient-to-r from-red-600 to-orange-400 hover:from-red-700 hover:to-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 transition-all duration-300 items-center gap-2 mb-2"
                            disabled={isLoading}
                          >
                            <svg className="w-6 h-6 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01-8 0" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7m0 0H9m3 0h3" /></svg>
                            Sign in to Dashboard
                          </motion.button>
                        </div>
                    
                    <button
                      type="button"
                      className="w-full flex justify-center py-2.5 px-4 border-2 border-gray-300 rounded-xl shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all duration-200 items-center gap-2"
                      onClick={() => {
                        if (savedAccounts.length > 0) {
                          setShowAccountList(true);
                          setForceShowForm(false);
                        } else {
                          setShowForm(false);
                          setForceShowForm(false);
                        }
                      }}
                    >
                      <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Return
                    </button>
                  </motion.div>
                </form>
                
                {showRecovery && (
                  <motion.div 
                    className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m-1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Account Access Issue</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>Unable to access your account? Please contact your system administrator for assistance.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
            <div className="w-full max-w-md p-8 space-y-8 z-10 relative mx-auto flex flex-col items-center justify-center">
              {/* Animated floating background element */}
                <motion.div 
                className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-br from-orange-200 via-yellow-100 to-red-100 rounded-full opacity-30 blur-2xl z-0"
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 6, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
              />
              <div className="flex flex-col items-center mb-8 relative z-10">
                {/* Container for logo and animated glow */}
                <div className="relative flex items-center justify-center mb-4" style={{ width: '12rem', height: '12rem' }}>
                  {/* Animated orange glow behind logo */}
                  <motion.div 
                    className="absolute inset-0 z-0"
                    style={{ borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,113,32,0.25) 0%, rgba(251,113,32,0.10) 70%, transparent 100%)' }}
                    animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
                  />
                  {/* Logo (in foreground) */}
                  <div className="relative bg-white p-1 rounded-full shadow-xl border-4 border-orange-200 z-10" style={{ boxShadow: '0 8px 32px 0 rgba(251, 113, 32, 0.15)' }}>
                        <img 
                          src="/images/m_logo.png" 
                          alt="Masala Madness Logo" 
                      className="w-44 h-44 object-contain rounded-full"
                      style={{ filter: "drop-shadow(0 6px 16px rgba(251, 113, 32, 0.25))" }}
                        />
                      </div>
                    </div>
                {/* Animated title and subtitle */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
                  className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500 mb-2 text-center"
                    >
                      Masala Madness
                </motion.div>
                    <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
                  className="text-lg text-gray-700 font-medium mb-6 text-center"
                >
                  Restaurant Management System
                    </motion.div>
              </div>
              {/* Fixed position Sign In button (no y animation) */}
              <div className="w-full flex justify-center items-center mt-2">
                <motion.button
                  className="w-full py-3 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 overflow-hidden shadow-lg border-2 border-red-500 bg-white relative"
                  style={{
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 100%)',
                    color: '#e11d48',
                    boxShadow: '0 4px 16px 0 rgba(251, 113, 32, 0.10)'
                  }}
                  onClick={handleSignInClick}
                  disabled={isFilling}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
                  whileHover={{ scale: 1.04, boxShadow: '0 8px 32px 0 rgba(251, 113, 32, 0.18)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Animated fill overlay, perfectly matching button shape */}
                  <AnimatePresence>
                    {isFilling && (
                      <motion.span
                        className="absolute left-0 top-0 h-full w-full rounded-2xl z-10"
                        style={{ background: 'linear-gradient(90deg, #fb7120 0%, #ff512f 100%)' }}
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        exit={{ width: '100%', opacity: 0 }}
                        transition={{ duration: 0.7, ease: 'easeInOut' }}
                      />
                    )}
                  </AnimatePresence>
                  {/* Button content */}
                  <span className="flex items-center gap-2 relative z-20" style={{ color: isFilling ? 'white' : '#e11d48', transition: 'color 0.2s' }}>
                    <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01-8 0" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7m0 0H9m3 0h3" /></svg>
                    Sign In
                  </span>
                </motion.button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Disabled Account Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDisabledAccountDialog}
        onClose={() => {
          setShowDisabledAccountDialog(false);
          setDisabledAccountMessage('');
          logout({ isSilentLogout: true });
        }}
        onConfirm={() => {
          setShowDisabledAccountDialog(false);
          setDisabledAccountMessage('');
          logout({ isSilentLogout: true });
        }}
        title="Account Disabled"
        message={disabledAccountMessage}
        confirmText="Ok, I understand"
        cancelText={null}
      />

      {/* Remove Account Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showRemoveDialog}
        onClose={() => setShowRemoveDialog(false)}
        onCancel={() => setShowRemoveDialog(false)}
        onConfirm={() => {
          removeAccount(accountToRemove);
          const updated = getSavedAccounts();
          setSavedAccounts(updated);
          setShowRemoveDialog(false);
          setAccountToRemove(null);
          if (updated.length === 0) {
            setShowAccountList(false);
            setForceShowForm(false); // Show splash, not login form
          }
        }}
        title="Remove Saved Account?"
        message={`Are you sure you want to remove the saved account${accountToRemove ? `: ${accountToRemove}` : ''}? This cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
      />

      {/* Quick Login Loading Overlay */}
      {isQuickLoginLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 cursor-wait">
          <div className="bg-white rounded-xl shadow-lg px-8 py-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
            <div className="text-orange-700 font-semibold text-lg">Logging in...</div>
            <div className="text-gray-500 text-sm mt-2">Please wait, do not refresh the page.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;