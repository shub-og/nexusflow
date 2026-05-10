import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { dbUser } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!dbUser) return;

    const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || '', {
      auth: { userId: dbUser.id },
      transports: ['websocket'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;
    return () => socket.disconnect();
  }, [dbUser]);

  const joinProject = (projectId) => socketRef.current?.emit('join:project', projectId);
  const leaveProject = (projectId) => socketRef.current?.emit('leave:project', projectId);
  const on = (event, cb) => { socketRef.current?.on(event, cb); };
  const off = (event, cb) => { socketRef.current?.off(event, cb); };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, joinProject, leaveProject, on, off }}>
      {children}
    </SocketContext.Provider>
  );
};
