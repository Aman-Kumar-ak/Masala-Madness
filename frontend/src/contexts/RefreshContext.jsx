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
    (async () => {
      await wakeUpBackend();
      if (!isMounted) return;
      const token = getToken();
      if (socket) {
        socket.disconnect();
      }
      newSocket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 30000,
        autoConnect: true,
        transports: ['websocket', 'polling'],
        pingTimeout: 30000,
        pingInterval: 10000,
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
    })();
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