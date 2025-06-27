import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../components/NotificationContext';
import useKeyboardScrollAdjustment from "../hooks/useKeyboardScrollAdjustment";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { preloadImages } from '../utils/imageOptimizations';

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
  
  const { login, isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const initialCheckRef = useRef(false);
  
  // New states for disabled account dialog
  const [showDisabledAccountDialog, setShowDisabledAccountDialog] = useState(false);
  const [disabledAccountMessage, setDisabledAccountMessage] = useState('');
  
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
      
      <div className="w-full max-w-md p-8 space-y-8 z-10">
        <AnimatePresence mode="wait">
          {!showForm ? (
            <>
              <motion.div 
                key="splash"
                className="flex flex-col items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: -100,
                  scale: 0.5,
                  transition: { duration: 0.5 }
                }}
              >
                <div className="relative">
                  <motion.div 
                    className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-red-500 rounded-full opacity-75 blur-sm"
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ 
                      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                      scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                  ></motion.div>
                  <div className="relative bg-white p-1 rounded-full">
                    <motion.img 
                      src="/images/m_logo.png" 
                      alt="Masala Madness Logo" 
                      className="w-64 h-64 object-contain rounded-full"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ 
                        duration: 1.2,
                        ease: "easeOut"
                      }}
                      style={{ filter: "drop-shadow(0 10px 15px rgba(0, 0, 0, 0.2))" }}
                    />
                  </div>
                </div>
              </motion.div>
              <motion.h1 
                className="text-3xl font-bold text-gray-800 mb-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                exit={{
                  opacity: 0,
                  y: -100,
                  scale: 0.5,
                  transition: { duration: 0.5 }
                }}
              >
                <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                  Masala Madness
                </span>
              </motion.h1>
              <motion.p 
                className="text-gray-600 mb-8 text-center text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.5 }
                }}
              >
                Restaurant Management System
              </motion.p>
              <motion.button
                onClick={handleLoginClick}
                className="relative flex items-center overflow-hidden px-10 py-4 rounded-2xl bg-white border-2 border-orange-500 shadow-lg group hover:border-red-600 disabled:opacity-70 mx-auto"
                whileHover={{ 
                  scale: 1.03,
                  boxShadow: "0 15px 30px rgba(0, 0, 0, 0.2)"
                }}
                whileTap={{ 
                  scale: 0.96,
                  boxShadow: "0 5px 10px rgba(0, 0, 0, 0.1)",
                  backgroundColor: "rgba(254, 215, 170, 0.5)"
                }}
                disabled={isTransitioning}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.5 }
                }}
              >
                {/* Decorative elements */}
                <div className="absolute inset-0 bg-gradient-to-tr from-red-500 to-orange-500 transform origin-left -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-400 to-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 blur-sm"></div>
                {/* Animated shine effect */}
                <motion.span 
                  className="absolute top-0 left-0 w-16 h-full bg-white opacity-0 transform -skew-x-20"
                  variants={shineVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                ></motion.span>
                {/* Custom shine effect that follows the gradient fill */}
                <motion.span
                  className="absolute top-0 left-0 w-20 h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 transform -skew-x-20"
                  initial={{ x: "-100%" }}
                  whileHover={{
                    x: "200%",
                    opacity: 0.3,
                    transition: {
                      delay: 0.3,
                      duration: 0.8,
                      ease: "easeOut"
                    }
                  }}
                  whileTap={{
                    opacity: 0.6,
                    x: "100%",
                    transition: {
                      duration: 0.2
                    }
                  }}
                ></motion.span>
                {/* Press effect overlay */}
                <motion.div 
                  className="absolute inset-0 bg-orange-600 opacity-0"
                  whileTap={{
                    opacity: 0.15,
                    transition: { duration: 0.1 }
                  }}
                ></motion.div>
                {/* Button content */}
                <div className="relative flex items-center">
                  {/* Fork and spoon icon */}
                  <svg className="w-6 h-6 mr-3 text-red-600 group-hover:text-white transition-colors duration-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 5V19M7 5C7 3.89543 6.10457 3 5 3C3.89543 3 3 3.89543 3 5M7 5C7 3.89543 7.89543 3 9 3C10.1046 3 11 3.89543 11 5M3 5V9C3 11.1217 4.26522 13.1566 7 14M11 5V9C11 11.1217 9.73478 13.1566 7 14M21 3V11.2C21 12.8802 21 13.7202 20.673 14.362C20.3854 14.9265 19.9265 15.3854 19.362 15.673C18.7202 16 17.8802 16 16.2 16H15.5M14 21L17.5 16L14 11" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {/* Text with transition */}
                  <span className="font-bold text-lg text-red-600 group-hover:text-white transition-colors duration-300">
                    Sign In to Admin
                  </span>
                </div>
              </motion.button>
            </>
          ) : (
            // Enhanced login form
            <motion.div 
              key="form"
              className="bg-white rounded-xl shadow-2xl overflow-hidden border border-orange-100"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 100, 
                damping: 15,
                delay: 0.3
              }}
              style={{
                backdropFilter: "blur(10px)",
                boxShadow: "0 25px 50px -12px rgba(251, 113, 32, 0.15), 0 0 0 1px rgba(251, 113, 32, 0.05)"
              }}
            >
              {/* Header with glass morphism effect */}
              <div className="relative bg-gradient-to-r from-red-600 to-orange-500 px-6 py-5 overflow-hidden">
                {/* Animated spice illustrations */}
                <motion.div 
                  className="absolute top-2 right-5 w-8 h-8 rounded-full bg-white/10"
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
                  className="absolute bottom-2 left-10 w-6 h-6 rounded-full bg-white/10"
                  animate={{ 
                    y: ["3px", "-3px"],
                    opacity: [0.5, 0.7]
                  }}
                  transition={{ 
                    duration: 2.5,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  }}
                ></motion.div>
                
                <h2 className="text-2xl font-bold text-white flex items-center justify-center">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center"
                  >
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Admin Dashboard
                  </motion.span>
                </h2>
              </div>
              
              <div className="p-8">
                <motion.div 
                  className="flex justify-center mb-6"
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 200, 
                    damping: 20,
                    delay: 0.5
                  }}
                >
                  <div className="relative">
                    <motion.div 
                      className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-red-500 rounded-full opacity-75 blur-sm"
                      animate={{ 
                        rotate: [0, 360],
                        scale: [1, 1.05, 1],
                      }}
                      transition={{ 
                        rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                        scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                      }}
                    ></motion.div>
                    <div className="relative bg-white p-1 rounded-full">
                      <img 
                        src="/images/m_logo.png" 
                        alt="Masala Madness Logo" 
                        className="w-24 h-24 object-contain rounded-full"
                        style={{ filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))" }}
                      />
                    </div>
                  </div>
                </motion.div>
                
                <div className="text-center mb-8">
                  <motion.h1 
                    className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    Masala Madness
                  </motion.h1>
                </div>
                
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
                          autoComplete="new-password"
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
                    transition={{ delay: 0.9 }}
                    className="space-y-3"
                  >
                    <button
                      type="submit"
                      className={`relative w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 ${
                        isLoading ? 'opacity-70 cursor-not-allowed' : ''
                      } overflow-hidden group`}
                      disabled={isLoading}
                    >
                      {/* Button shine effect */}
                      <span className="absolute inset-0 overflow-hidden rounded-lg">
                        <motion.span
                          className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 transform -skew-x-12"
                          animate={isLoading ? {} : {
                            x: ["-100%", "100%"],
                            opacity: [0, 0.3, 0]
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            repeatDelay: 3,
                          }}
                        />
                      </span>
                      
                      {/* Button content */}
                      <span className="relative flex items-center">
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-2 transform group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            <span>Sign in to Dashboard</span>
                          </>
                        )}
                      </span>
                    </button>
                    
                    <button
                      type="button"
                      className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                      onClick={() => setShowForm(false)}
                    >
                      <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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
          )}
        </AnimatePresence>
      </div>

      {/* Disabled Account Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDisabledAccountDialog}
        onClose={() => {
          setShowDisabledAccountDialog(false);
          setDisabledAccountMessage('');
          logout({ isSilentLogout: true }); // Silent logout on dialog close
        }}
        onConfirm={() => {
          setShowDisabledAccountDialog(false);
          setDisabledAccountMessage('');
          logout({ isSilentLogout: true }); // Silent logout on dialog confirm
        }}
        title="Account Disabled"
        message={disabledAccountMessage}
        confirmText="Ok, I understand"
        cancelText={null} // No cancel button as logout is automatic
      />
    </div>
  );
};

export default Login;