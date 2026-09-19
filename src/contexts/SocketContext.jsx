import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    let activeSocket = null;
    let isMounted = true;

    // Disconnect if user logs out
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    async function initSocketConnection() {
      try {
        // 1. Fetch cross-origin WebSocket JWT token
        const res = await fetch('/api/auth/socket-token', {
          credentials: 'include',
          cache: 'no-store'
        });
        const data = await res.json().catch(() => ({ success: false }));
        const token = data.success ? data.token : null;

        if (!isMounted) return;

        // In local dev, VITE_SOCKET_URL is unset, so io(undefined) connects through Vite proxy
        // In production on Vercel, VITE_SOCKET_URL points directly to Render backend
        const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;

        activeSocket = io(socketUrl, {
          transports: ['websocket'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          auth: { token }
        });

        // Refresh token on reconnect attempts or connection errors
        const refreshToken = async () => {
          try {
            const r = await fetch('/api/auth/socket-token', {
              credentials: 'include',
              cache: 'no-store'
            });
            const d = await r.json().catch(() => ({ success: false }));
            if (d.success && d.token && activeSocket) {
              activeSocket.auth = { token: d.token };
            }
          } catch (_) {}
        };

        activeSocket.on('reconnect_attempt', refreshToken);
        activeSocket.on('connect_error', refreshToken);

        activeSocket.on('connect', () => {
          if (user) {
            if (user.institution_id) activeSocket.emit('join_room', `inst_${user.institution_id}`);
            if (user.org_id) activeSocket.emit('join_room', `org_${user.org_id}`);
            if (user.user_id) activeSocket.emit('join_room', `user_${user.user_id}`);
            if (user.student_id) activeSocket.emit('join_room', `student_${user.student_id}`);
          }
        });

        activeSocket.on('data_updated', (eventData) => {
          setLastEvent(eventData);
        });

        if (isMounted) {
          setSocket(activeSocket);
        }
      } catch (err) {
        console.warn('[Socket Init Error]', err);
      }
    }

    initSocketConnection();

    return () => {
      isMounted = false;
      if (activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, [user?.user_id]);

  return (
    <SocketContext.Provider value={{ socket, lastEvent }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

/**
 * Custom hook to automatically trigger a refresh callback whenever realtime events occur
 * @param {Function} refreshFn - The data fetching / state update function
 * @param {Array<string>} [filterTypes] - Optional array of specific event types to react to
 */
export const useRealtimeRefresh = (refreshFn, filterTypes = null) => {
  const { lastEvent } = useSocket() || {};

  useEffect(() => {
    if (!lastEvent || typeof refreshFn !== 'function') return;

    if (!filterTypes || filterTypes.length === 0) {
      refreshFn();
    } else if (filterTypes.includes(lastEvent.type)) {
      refreshFn();
    }
  }, [lastEvent]);
};
