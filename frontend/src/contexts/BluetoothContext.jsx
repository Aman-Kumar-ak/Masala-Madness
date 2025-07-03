import React, { createContext, useContext, useState, useCallback } from 'react';
import { connectToPrinter, disconnectPrinter, isPrinterConnected } from '../utils/bluetoothPrinter';

const BluetoothContext = createContext();

export function BluetoothProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState(null);
  const [error, setError] = useState(null);

  // Real connect logic
  const connect = useCallback(async () => {
    try {
      const success = await connectToPrinter();
      if (success) {
        setIsConnected(true);
        setDeviceName('MPT-II');
        setError(null);
      } else {
        setIsConnected(false);
        setDeviceName(null);
        setError('Connection failed');
      }
    } catch (err) {
      setIsConnected(false);
      setDeviceName(null);
      setError('Connection failed');
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectPrinter();
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