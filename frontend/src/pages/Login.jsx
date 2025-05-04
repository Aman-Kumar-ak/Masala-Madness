import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // If already authenticated, redirect to home page
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message);
        // Show recovery instructions if we get an indication that admin user doesn't exist
        if (result.message.includes('credentials') || result.message.includes('not found')) {
          setShowRecovery(true);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
      setShowRecovery(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to handle the login button click
  const handleLoginClick = () => {
    setShowForm(true);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 overflow-hidden">
      <div className="w-full max-w-md p-8 space-y-8">
        <AnimatePresence>
          {!showForm ? (
            // Logo splash screen with login button
            <motion.div 
              key="splash"
              className="flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -100, scale: 0.5 }}
              transition={{ duration: 0.5 }}
            >
              <motion.img 
                src="/images/m_logo.png" 
                alt="Masala Madness Logo" 
                className="w-64 h-64 object-contain mb-8"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              />
              <motion.button
                onClick={handleLoginClick}
                className="mt-8 px-6 py-3 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Admin Login
              </motion.button>
            </motion.div>
          ) : (
            // Login form
            <motion.div 
              key="form"
              className="bg-white rounded-lg shadow-xl overflow-hidden"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="p-8">
                <motion.div 
                  className="flex justify-center mb-6"
                  initial={{ y: -100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <img 
                    src="/images/m_logo.png" 
                    alt="Masala Madness Logo" 
                    className="w-24 h-24 object-contain"
                  />
                </motion.div>
                
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-extrabold text-gray-900">Masala Madness</h1>
                  <h2 className="mt-1 text-lg font-semibold text-gray-700">Admin Login</h2>
                </div>
                
                {error && (
                  <motion.div 
                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" 
                    role="alert"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="block sm:inline">{error}</span>
                  </motion.div>
                )}
                
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <button
                      type="submit"
                      className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                        isLoading ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                    
                    <button
                      type="button"
                      className="mt-3 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      onClick={() => setShowForm(false)}
                    >
                      Go Back
                    </button>
                  </motion.div>
                </form>
                
                {showRecovery && (
                  <motion.div 
                    className="mt-6 bg-blue-50 border border-blue-300 text-blue-800 px-4 py-3 rounded"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="font-semibold text-blue-900 mb-2">Account Recovery Instructions</h3>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li>The admin collection might have been deleted.</li>
                      <li>Run the admin recovery script on the server:</li>
                      <li><code className="bg-blue-100 px-1 py-0.5 rounded">cd backend && node scripts/reset-admin-password.js</code></li>
                      <li>This will recreate the admin account with default credentials.</li>
                      <li>Default username: <strong>admin</strong></li>
                      <li>Default password: <strong>MasalaMadness2024!</strong></li>
                    </ul>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login; 