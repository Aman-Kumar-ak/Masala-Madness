import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationAnimation } from '../utils/animations';

const Notification = ({ message, type = 'info', duration = 1500, onClose, style = {} }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration) {
      // Progress bar animation
      const startTime = Date.now();
      const updateInterval = Math.min(16, duration / 60);
      const intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
        
        if (remaining <= 0) {
          clearInterval(intervalId);
          if (onClose) setTimeout(onClose, 200);
        }
      }, updateInterval);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'bg-emerald-50',
          border: 'border-emerald-200',
          icon: 'bg-emerald-100 text-emerald-600',
          progress: 'bg-emerald-500',
          text: 'text-emerald-800',
          title: 'Success'
        };
      case 'error':
        return {
          background: 'bg-rose-50',
          border: 'border-rose-200',
          icon: 'bg-rose-100 text-rose-600',
          progress: 'bg-rose-500',
          text: 'text-rose-800',
          title: 'Error'
        };
      case 'warning':
        return {
          background: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'bg-amber-100 text-amber-600',
          progress: 'bg-amber-500',
          text: 'text-amber-800',
          title: 'Warning'
        };
      case 'info':
        return {
          background: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'bg-blue-100 text-blue-600',
          progress: 'bg-blue-500',
          text: 'text-blue-800',
          title: 'Info'
        };
      case 'delete':
        return {
          background: 'bg-red-50',
          border: 'border-red-200',
          icon: 'bg-red-100 text-red-600',
          progress: 'bg-red-500',
          text: 'text-red-800',
          title: 'Deleted'
        };
      case 'update':
        return {
          background: 'bg-indigo-50',
          border: 'border-indigo-200',
          icon: 'bg-indigo-100 text-indigo-600',
          progress: 'bg-indigo-500',
          text: 'text-indigo-800',
          title: 'Updated'
        };
      default:
        return {
          background: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'bg-gray-100 text-gray-600',
          progress: 'bg-gray-500',
          text: 'text-gray-800',
          title: 'Notification'
        };
    }
  };

  const getIcon = () => {
    const styles = getTypeStyles();
    
    switch (type) {
      case 'success':
        return (
          <div className={`w-10 h-10 rounded-full ${styles.icon} flex items-center justify-center flex-shrink-0`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className={`w-10 h-10 rounded-full ${styles.icon} flex items-center justify-center flex-shrink-0`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className={`w-10 h-10 rounded-full ${styles.icon} flex items-center justify-center flex-shrink-0`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'delete':
        return (
          <div className={`w-10 h-10 rounded-full ${styles.icon} flex items-center justify-center flex-shrink-0`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m4-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        );
      case 'update':
        return (
          <div className={`w-10 h-10 rounded-full ${styles.icon} flex items-center justify-center flex-shrink-0`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className={`w-10 h-10 rounded-full ${styles.icon} flex items-center justify-center flex-shrink-0`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed left-1/2 transform -translate-x-1/2 z-[999] w-full max-w-md px-4" style={{ top: '1rem', ...style }}>
      <motion.div 
        className={`
          ${styles.background} 
          border
          ${styles.border}
          rounded-xl 
          shadow-lg 
          overflow-hidden
        `}
        {...notificationAnimation}
      >
        <div className="flex items-center p-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
          >
            {getIcon()}
          </motion.div>
          <motion.div 
            className="ml-3 flex-grow"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className={`text-sm font-semibold ${styles.text}`}>
              {styles.title}
            </h3>
            <p className={`text-sm ${styles.text}`}>
              {message}
            </p>
          </motion.div>
          <motion.button
            onClick={onClose}
            className="ml-4 -mr-1 bg-white/30 backdrop-blur-sm rounded-full p-1.5 inline-flex text-gray-400 hover:text-gray-700 hover:bg-white/50 transition-colors duration-200"
            aria-label="Dismiss"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </div>
        
        {/* Progress bar */}
        {duration > 0 && (
          <div className="h-1 w-full bg-gray-200">
            <motion.div 
              className={`h-full ${styles.progress}`}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ 
                duration: duration / 1000, 
                ease: "linear"
              }}
            ></motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Notification;