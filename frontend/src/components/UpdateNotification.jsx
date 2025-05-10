import React, { useState, useEffect } from 'react';

const UpdateNotification = () => {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [newVersion, setNewVersion] = useState(null);

  useEffect(() => {
    // Listen for service worker messages
    const handleServiceWorkerMessage = (event) => {
      if (event.data) {
        if (event.data.type === 'CACHE_UPDATED') {
          setShowUpdateNotification(true);
          setNewVersion(event.data.version);
        }
      }
    };

    // Check for updates when the app loads
    const checkForUpdates = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            // Get current version from service worker
            const response = await fetch('/version.json');
            const data = await response.json();
            setCurrentVersion(data.version);

            // Check for updates
            await registration.update();
          }
        } catch (error) {
          console.error('Error checking for updates:', error);
        }
      }
    };

    // Add event listeners
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    checkForUpdates();

    // Cleanup
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const handleUpdate = () => {
    // Reload the page to apply updates
    window.location.reload();
  };

  if (!showUpdateNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-orange-500 text-white px-4 py-3 text-center font-medium z-50 flex items-center justify-center gap-4">
      <div>
        {newVersion ? (
          <p>A new version ({newVersion}) is available!</p>
        ) : (
          <p>A new version is available!</p>
        )}
      </div>
      <button
        onClick={handleUpdate}
        className="bg-white text-orange-500 px-4 py-1 rounded-md font-semibold hover:bg-orange-50 transition-colors"
      >
        Update Now
      </button>
    </div>
  );
};

export default UpdateNotification; 