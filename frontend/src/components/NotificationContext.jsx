import React, { createContext, useContext, useState } from 'react';
import Notification from './Notification';

// Create a context for notifications
const NotificationContext = createContext();

// Custom hook to use the notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Provider component that will wrap the app
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Function to show a notification
  const showNotification = (message, type = 'info', duration = 1000) => {
    const id = Date.now(); // Create a unique ID for the notification
    
    // Replace any existing notifications with the new one to prevent overlap
    setNotifications([{ id, message, type, duration }]);
    
    // Auto-remove the notification after its duration plus a small buffer
    if (duration) {
      setTimeout(() => {
        removeNotification(id);
      }, duration + 500); // Add 500ms buffer for animations
    }
    
    return id; // Return the ID so it can be used to dismiss the notification manually
  };

  // Function to remove a notification by ID
  const removeNotification = (id) => {
    setNotifications(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id)
    );
  };

  // Queue-based notification system to ensure one notification at a time
  const queueNotification = (message, type, duration = 1000) => {
    // If already showing a notification, wait before showing this one
    if (notifications.length > 0 || isProcessing) {
      // Clear existing notifications first
      setNotifications([]);
      
      // Add small delay before showing the new one
      setIsProcessing(true);
      setTimeout(() => {
        showNotification(message, type, duration);
        setIsProcessing(false);
      }, 300);
    } else {
      // Show immediately if no notifications are active
      showNotification(message, type, duration);
    }
  };

  // Convenience methods for different notification types
  const showSuccess = (message, duration = 1000) => queueNotification(message, 'success', duration);
  const showError = (message, duration = 1500) => queueNotification(message, 'error', duration);
  const showWarning = (message, duration = 1000) => queueNotification(message, 'warning', duration);
  const showInfo = (message, duration = 1000) => queueNotification(message, 'info', duration);

  // The value object that will be provided to consumers
  const contextValue = {
    notifications,
    showNotification: queueNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Render the active notification (only one at a time) */}
      <div className="notification-container">
        {notifications.length > 0 && (
          <Notification
            key={notifications[0].id}
            message={notifications[0].message}
            type={notifications[0].type}
            duration={notifications[0].duration}
            onClose={() => removeNotification(notifications[0].id)}
            style={{ top: '1rem' }}
          />
        )}
      </div>
    </NotificationContext.Provider>
  );
}; 