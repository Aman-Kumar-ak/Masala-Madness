import React, { useState, useEffect } from 'react';

const Notification = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300); // Match this with the CSS transition duration
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'error':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-sky-50 text-sky-800 border-sky-200';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div 
        className={`
          ${getTypeStyles()} 
          border-2 
          rounded-xl 
          shadow-xl 
          transition-all 
          duration-300 
          ease-in-out
          ${isLeaving 
            ? 'opacity-0 transform translate-y-[-1rem]' 
            : 'opacity-100 transform translate-y-0 animate-notification-slide-down'
          }
        `}
      >
        <div className="flex items-center p-6">
          <div className={`flex-shrink-0 mr-4 text-2xl`}>
            {getIcon()}
          </div>
          <p className="text-base md:text-lg font-medium flex-grow">
            {message}
          </p>
          <button
            onClick={handleClose}
            className="ml-4 -mx-1.5 -my-1.5 rounded-lg p-2 inline-flex text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Dismiss"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;