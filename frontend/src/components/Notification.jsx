import React, { useState, useEffect } from 'react';

const Notification = ({ message, type = 'info', duration = 1000, onClose, style = {} }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration) {
      // Start timer for auto-dismiss
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      // Progress bar animation - update more frequently for shorter durations
      const startTime = Date.now();
      const updateInterval = Math.min(16, duration / 60); // More frequent updates for short durations
      const intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
        
        if (remaining <= 0) {
          clearInterval(intervalId);
        }
      }, updateInterval);

      return () => {
        clearTimeout(timer);
        clearInterval(intervalId);
      };
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    // Shorter animation for quicker notifications
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 200); // Faster exit animation
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'bg-emerald-50',
          border: 'border-emerald-200',
          icon: 'bg-emerald-100 text-emerald-600',
          progress: 'bg-emerald-500',
          text: 'text-emerald-800'
        };
      case 'error':
        return {
          background: 'bg-rose-50',
          border: 'border-rose-200',
          icon: 'bg-rose-100 text-rose-600',
          progress: 'bg-rose-500',
          text: 'text-rose-800'
        };
      case 'warning':
        return {
          background: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'bg-amber-100 text-amber-600',
          progress: 'bg-amber-500',
          text: 'text-amber-800'
        };
      default:
        return {
          background: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'bg-blue-100 text-blue-600',
          progress: 'bg-blue-500',
          text: 'text-blue-800'
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

  if (!isVisible) return null;

  const styles = getTypeStyles();

  return (
    <div className="fixed left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4" style={{ top: '1rem', ...style }}>
      <div 
        className={`
          ${styles.background} 
          border
          ${styles.border}
          rounded-xl 
          shadow-lg 
          transition-all 
          duration-200 
          ease-in-out
          overflow-hidden
          ${isLeaving 
            ? 'opacity-0 transform translate-y-[-1rem]' 
            : 'opacity-100 transform translate-y-0 animate-notification-slide-down'
          }
        `}
      >
        <div className="flex items-center p-4">
          {getIcon()}
          <div className="ml-3 flex-grow">
            <p className={`text-base font-medium ${styles.text}`}>
              {message}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 -mr-1 bg-white/30 backdrop-blur-sm rounded-full p-1.5 inline-flex text-gray-400 hover:text-gray-700 hover:bg-white/50 transition-colors duration-200"
            aria-label="Dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Progress bar */}
        {duration > 0 && (
          <div className="h-1 w-full bg-gray-200">
            <div 
              className={`h-full ${styles.progress}`}
              style={{ 
                width: `${progress}%`,
                transition: `width ${Math.min(16, duration / 60)}ms linear`
              }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notification;