import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import { API_URL } from "../utils/config";

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RefreshContext = createContext();

export const useRefresh = () => useContext(RefreshContext);

export const RefreshProvider = ({ children }) => {
  const [refresh, setRefresh] = useState(0);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  // Initialize Socket.IO connection
  useEffect(() => {
    // Configure socket with reconnection settings
    const newSocket = io(API_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true,
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);

    // Socket.IO event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server socket:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server socket. Reason:', reason);
      setConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected to server socket after ${attemptNumber} attempts`);
      setConnected(true);
      // Trigger refresh on reconnect to ensure data is current
      triggerRefresh();
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Attempting to reconnect: attempt #${attemptNumber}`);
    });

    newSocket.on('order-update', (data) => {
      console.log('Received order update:', data.type);
      triggerRefresh(); // Trigger refresh when any order update is received
    });

    // Clean up on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
        console.log('Disconnected from server socket');
      }
    };
  }, []);

  // Function to manually trigger a refresh
  const triggerRefresh = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <RefreshContext.Provider value={{ refresh, triggerRefresh, socket, connected }}>
      {children}
    </RefreshContext.Provider>
  );
}; 