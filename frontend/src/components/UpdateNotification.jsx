import React, { useState, useEffect } from 'react';
import ConfirmationDialog from './ConfirmationDialog';
import { useAuth } from '../contexts/AuthContext';

const UpdateNotification = () => {
  const { user } = useAuth();
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [newVersion, setNewVersion] = useState(null);
  const [buildDate, setBuildDate] = useState(null);
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);

  // Format date to IST
  const formatISTDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Check for pending updates on component mount
  useEffect(() => {
    const checkPendingUpdates = async () => {
      try {
        const pendingUpdate = localStorage.getItem('pendingUpdate');
        if (pendingUpdate) {
          const { version, timestamp, buildDate } = JSON.parse(pendingUpdate);
          setNewVersion(version);
          setBuildDate(buildDate);
          setIsUpdateRequired(true);
          setShowUpdateNotification(true);
        }
      } catch (error) {
        console.error('Error checking pending updates:', error);
      }
    };

    checkPendingUpdates();
  }, []);

  useEffect(() => {
    // Listen for service worker messages
    const handleServiceWorkerMessage = (event) => {
      if (event.data) {
        if (event.data.type === 'CACHE_UPDATED') {
          setShowUpdateNotification(true);
          setNewVersion(event.data.version);
          setBuildDate(event.data.buildDate);
          
          // If user is admin, make update mandatory and store in localStorage
          if (user?.role === 'admin') {
            setIsUpdateRequired(true);
            // Store update requirement in localStorage
            localStorage.setItem('pendingUpdate', JSON.stringify({
              version: event.data.version,
              timestamp: new Date().toISOString(),
              buildDate: event.data.buildDate
            }));
          }
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
            setBuildDate(data.buildDate);

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
  }, [user]);

  const handleUpdate = () => {
    // Clear pending update from localStorage
    localStorage.removeItem('pendingUpdate');
    // Reload the page to apply updates
    window.location.reload();
  };

  // If update is required for admin, prevent app usage
  if (isUpdateRequired) {
    return (
      <ConfirmationDialog
        isOpen={true}
        onClose={() => {}} // Prevent closing
        onConfirm={handleUpdate}
        title="Update Required"
        message={`A new version (${newVersion}) is available and must be installed to continue using the application.`}
        confirmText="Update Now"
        cancelText={null} // Remove cancel button
        type="warning"
        customContent={
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-orange-800 mb-2">Important Notice</h4>
            <p className="text-orange-700 text-sm">
              As an administrator, you must update to the latest version to ensure system security and functionality.
              The application will be unavailable until the update is completed.
            </p>
            <p className="text-orange-700 text-sm mt-2">
              This update prompt will persist until you complete the update, even if you close and reopen the application.
            </p>
            {buildDate && (
              <p className="text-orange-700 text-sm mt-2">
                Build Date: {formatISTDate(buildDate)} (IST)
              </p>
            )}
          </div>
        }
      />
    );
  }

  // For non-admin users, show regular update notification
  if (!showUpdateNotification) {
    return null;
  }

  return (
    <ConfirmationDialog
      isOpen={showUpdateNotification}
      onClose={() => setShowUpdateNotification(false)}
      onConfirm={handleUpdate}
      title="Update Available"
      message={`A new version (${newVersion}) is available. Would you like to update now?`}
      confirmText="Update Now"
      cancelText="Later"
      type="info"
      customContent={
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-blue-800 mb-2">What's New?</h4>
          <p className="text-blue-700 text-sm">
            This update includes new features and improvements. Updating now will ensure you have the best experience.
          </p>
          {buildDate && (
            <p className="text-blue-700 text-sm mt-2">
              Build Date: {formatISTDate(buildDate)} (IST)
            </p>
          )}
        </div>
      }
    />
  );
};

export default UpdateNotification; 