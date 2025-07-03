import React, { createContext, useContext, useState, useCallback } from 'react';

const BluetoothContext = createContext();

export function BluetoothProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState(null);
  const [error, setError] = useState(null);

  const connect = useCallback((name) => {
    setIsConnected(true);
    setDeviceName(name || null);
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