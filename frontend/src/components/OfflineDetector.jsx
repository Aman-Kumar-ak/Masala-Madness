import React, { useState, useEffect } from 'react';

/**
 * Component to detect online/offline status and show a notification banner when offline
 */
const OfflineDetector = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Event listeners for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null; // Don't render anything when online
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-500 text-white px-4 py-2 text-center font-medium z-50">
      You are currently offline. Some features may be unavailable.
    </div>
  );
};

export default OfflineDetector; 