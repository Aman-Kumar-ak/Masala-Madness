import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = 'https://masala-madness.onrender.com'; // Backend WebSocket endpoint

const RefreshContext = createContext();

export const useRefresh = () => useContext(RefreshContext);

// Helper to wake up backend before connecting socket, with timeout
async function wakeUpBackendWithTimeout(timeoutMs = 2000) {
  return Promise.race([
    fetch('https://masala-madness.onrender.com/api/ping', { cache: 'no-store' }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Backend wakeup timeout')), timeoutMs))
  ]);
}

// Helper to refresh token using deviceToken
async function refreshTokenWithDeviceToken() {
  const deviceToken = localStorage.getItem('deviceToken');
  if (!deviceToken) return null;
  try {
    const res = await fetch('https://masala-madness.onrender.com/api/auth/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceToken })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.token) {
      sessionStorage.setItem('token', data.token);
      localStorage.setItem('token', data.token);
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

export const RefreshProvider = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const getToken = () =>
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('deviceToken');

  const [refresh, setRefresh] = useState(0);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let newSocket;
    let connectionTimeout;
    let socketConnectResolved = false;

    async function connectSocketWithFastRecovery() {
      // 1. Wake up backend (max 2s)
      try {
        await wakeUpBackendWithTimeout(2000);
      } catch (e) {
        // Backend may still be waking, proceed anyway
      }
      // 2. Try to connect socket with current token
      let token = getToken();
      let triedRefresh = false;
      let startTime = Date.now();
      let maxTotalTime = 10000; // 10s max
      let socketConnectPromise;
      function createSocket(tokenToUse) {
        if (newSocket) newSocket.disconnect();
        return io(SOCKET_URL, {
          reconnection: false,
          timeout: Math.max(1000, maxTotalTime - (Date.now() - startTime)),
          autoConnect: true,
          transports: ['websocket', 'polling'],
          pingTimeout: 8000,
          pingInterval: 4000,
          auth: tokenToUse ? { token: tokenToUse } : undefined,
        });
      }
      async function tryConnect(tokenToUse) {
        return new Promise((resolve, reject) => {
          const s = createSocket(tokenToUse);
          let resolved = false;
          s.on('connect', () => {
            if (!resolved) {
              resolved = true;
              resolve(s);
            }
          });
          s.on('connect_error', async (error) => {
            if (!resolved) {
              resolved = true;
              s.disconnect();
              reject(error);
            }
          });
        });
      }
      // Try with current token
      try {
        newSocket = await tryConnect(token);
        socketConnectResolved = true;
      } catch (err) {
        // If auth error and not yet tried refresh, try refresh
        if (!triedRefresh && err && err.message && err.message.toLowerCase().includes('authentication')) {
          triedRefresh = true;
          token = await refreshTokenWithDeviceToken();
          if (token) {
            try {
              newSocket = await tryConnect(token);
              socketConnectResolved = true;
            } catch (err2) {
              // Final fail
            }
          }
        }
      }
      // If still not connected, show error
      if (!socketConnectResolved) {
        setConnected(false);
        setSocket(null);
        return;
      }
      setSocket(newSocket);
      setConnected(true);
      // Attach listeners
      newSocket.on('disconnect', (reason) => {
        setConnected(false);
      });
      newSocket.on('order-update', (data) => {
        triggerRefresh();
      });
      newSocket.on('reconnect', () => {
        setConnected(true);
        triggerRefresh();
      });
    }
    connectSocketWithFastRecovery();
    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [isAuthenticated, loading, getToken()]);

  const triggerRefresh = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <RefreshContext.Provider value={{ refresh, triggerRefresh, socket, connected }}>
      {children}
    </RefreshContext.Provider>
  );
};