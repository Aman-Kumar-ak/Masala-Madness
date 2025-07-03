import React, { createContext, useContext, useState, useCallback } from 'react';

// Dummy Bluetooth context for compatibility after removing BLE logic
const BluetoothContext = createContext();

export function BluetoothProvider({ children }) {
  // Always not connected, since printing is now handled natively in Android
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState(null);
  const [error, setError] = useState(null);

  // Dummy connect/disconnect functions
  const connect = useCallback(() => {
    setIsConnected(false);
    setDeviceName(null);
    setError(null);
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setDeviceName(null);
    setError(null);
  }, []);

  const setConnectionError = useCallback((errMsg) => {
    setIsConnected(false);
    setDeviceName(null);
    setError(errMsg || 'Connection failed');
  }, []);

  return (
    <BluetoothContext.Provider value={{
      isConnected,
      deviceName,
      error,
      connect,
      disconnect,
      setConnectionError
    }}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  return useContext(BluetoothContext);
} 