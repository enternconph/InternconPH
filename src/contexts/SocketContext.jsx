import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    const defaultDevUrl =
      typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : undefined;
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || defaultDevUrl;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      if (user) {
        if (user.institution_id) newSocket.emit('join_room', `inst_${user.institution_id}`);
        if (user.org_id) newSocket.emit('join_room', `org_${user.org_id}`);
        if (user.user_id) newSocket.emit('join_room', `user_${user.user_id}`);
        if (user.student_id) newSocket.emit('join_room', `student_${user.student_id}`);
      }
    });

    newSocket.on('data_updated', (eventData) => {
      setLastEvent(eventData);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
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
