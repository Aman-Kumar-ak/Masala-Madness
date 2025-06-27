import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = 'https://masala-madness.onrender.com'; // Backend WebSocket endpoint

const RefreshContext = createContext();

export const useRefresh = () => useContext(RefreshContext);

// Helper to wake up backend before connecting socket
async function wakeUpBackend() {
  try {
    await fetch('https://masala-madness.onrender.com/api/ping', { cache: 'no-store' });
  } catch (err) {
    // Ignore errors, just try to wake up
  }
}

export const RefreshProvider = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  // Helper to get the latest token
  const getToken = () =>
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('deviceToken');

  const [refresh, setRefresh] = useState(0);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  // Re-initialize Socket.IO connection on auth/token change
  useEffect(() => {
    let isMounted = true;
    let newSocket;
    // Connect immediately, don't wait for backend wakeup
    const token = getToken();
    if (socket) {
      socket.disconnect();
    }
    newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 20, // More attempts for reliability
      reconnectionDelay: 1000,  // Try every 1s for faster recovery
      timeout: 10000,           // Fail fast if can't connect in 10s
      autoConnect: true,
      transports: ['websocket', 'polling'],
      pingTimeout: 15000,       // Faster detection of dead connection
      pingInterval: 7000,       // Ping more frequently
      auth: token ? { token } : undefined,
    });
    setSocket(newSocket);

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
      triggerRefresh();
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Attempting to reconnect: attempt #${attemptNumber}`);
    });

    newSocket.on('order-update', (data) => {
      console.log('Received order update:', data.type);
      triggerRefresh();
    });

    // Wake up backend in background (doesn't block socket connect)
    wakeUpBackend();

    return () => {
      isMounted = false;
      if (newSocket) {
        newSocket.disconnect();
      }
    };
    // Re-run when authentication or token changes
  }, [isAuthenticated, loading, getToken()]);

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