import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ConfirmationDialog from './ConfirmationDialog';
import { useAuth } from '../contexts/AuthContext';

// Constants for localStorage keys
const STORAGE_KEYS = {
  PENDING_UPDATE: 'pendingUpdate'
};

// Constants for message types
const MESSAGE_TYPES = {
  CACHE_UPDATED: 'CACHE_UPDATED'
};

const UpdateNotification = () => {
  const { user } = useAuth();
  const [updateState, setUpdateState] = useState({
    showNotification: false,
    currentVersion: null,
    newVersion: null,
    buildDate: null,
    isUpdateRequired: false
  });

  // Memoized date formatter
  const formatISTDate = useCallback((dateString) => {
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
  }, []);

  // Handle update action
  const handleUpdate = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.PENDING_UPDATE);
    window.location.reload();
  }, []);

  // Check for pending updates
  const checkPendingUpdates = useCallback(async () => {
    try {
      const pendingUpdate = localStorage.getItem(STORAGE_KEYS.PENDING_UPDATE);
      if (pendingUpdate) {
        const { version, buildDate } = JSON.parse(pendingUpdate);
        setUpdateState(prev => ({
          ...prev,
          newVersion: version,
          buildDate,
          isUpdateRequired: true,
          showNotification: true
        }));
      }
    } catch (error) {
      console.error('Error checking pending updates:', error);
    }
  }, []);

  // Handle service worker messages
  const handleServiceWorkerMessage = useCallback((event) => {
    if (event.data?.type === MESSAGE_TYPES.CACHE_UPDATED) {
      setUpdateState(prev => ({
        ...prev,
        showNotification: true,
        newVersion: event.data.version,
        buildDate: event.data.buildDate,
        isUpdateRequired: user?.role === 'admin'
      }));

      if (user?.role === 'admin') {
        localStorage.setItem(STORAGE_KEYS.PENDING_UPDATE, JSON.stringify({
          version: event.data.version,
          timestamp: new Date().toISOString(),
          buildDate: event.data.buildDate
        }));
      }
    }
  }, [user?.role]);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const response = await fetch('/version.json');
          const data = await response.json();
          setUpdateState(prev => ({
            ...prev,
            currentVersion: data.version,
            buildDate: data.buildDate
          }));
          await registration.update();
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }
  }, []);

  // Initialize service worker listeners
  useEffect(() => {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    checkPendingUpdates();
    checkForUpdates();

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [handleServiceWorkerMessage, checkPendingUpdates, checkForUpdates]);

  // Memoized admin update dialog
  const adminUpdateDialog = useMemo(() => (
    <ConfirmationDialog
      isOpen={true}
      onClose={() => {}} // Prevent closing
      onConfirm={handleUpdate}
      title="Update Required"
      message={`A new version (${updateState.newVersion}) is available and must be installed to continue using the application.`}
      confirmText="Update Now"
      cancelText={null}
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
          {updateState.buildDate && (
            <p className="text-orange-700 text-sm mt-2">
              Build Date: {formatISTDate(updateState.buildDate)} (IST)
            </p>
          )}
        </div>
      }
    />
  ), [updateState.newVersion, updateState.buildDate, handleUpdate, formatISTDate]);

  // Memoized regular update dialog
  const regularUpdateDialog = useMemo(() => (
    <ConfirmationDialog
      isOpen={updateState.showNotification}
      onClose={() => setUpdateState(prev => ({ ...prev, showNotification: false }))}
      onConfirm={handleUpdate}
      title="Update Available"
      message={`A new version (${updateState.newVersion}) is available. Would you like to update now?`}
      confirmText="Update Now"
      cancelText="Later"
      type="info"
      customContent={
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-blue-800 mb-2">What's New?</h4>
          <p className="text-blue-700 text-sm">
            This update includes new features and improvements. Updating now will ensure you have the best experience.
          </p>
          {updateState.buildDate && (
            <p className="text-blue-700 text-sm mt-2">
              Build Date: {formatISTDate(updateState.buildDate)} (IST)
            </p>
          )}
        </div>
      }
    />
  ), [updateState.showNotification, updateState.newVersion, updateState.buildDate, handleUpdate, formatISTDate]);

  if (updateState.isUpdateRequired) {
    return adminUpdateDialog;
  }

  if (!updateState.showNotification) {
    return null;
  }

  return regularUpdateDialog;
};

export default UpdateNotification; 