import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, markAllRead } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { formatDistanceToNow } from 'date-fns';

export default function AppLayout() {
  const { dbUser } = useAuth();
  const { connected } = useSocket();
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const { on, off } = useSocket();

  useEffect(() => {
    loadNotifs();
  }, []);

  useEffect(() => {
    const handler = (n) => {
      setNotifs(prev => [n, ...prev]);
      setUnread(prev => prev + 1);
    };
    on('notification:new', handler);
    return () => off('notification:new', handler);
  }, [on, off]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadNotifs = async () => {
    try {
      const res = await getNotifications({ limit: 20 });
      setNotifs(res.data.notifications);
      setUnread(res.data.unread);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`} title={connected ? 'Live' : 'Offline'} />
            
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                🔔
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-medium text-sm">Notifications</span>
                    {unread > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No notifications</p>
                    ) : notifs.map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? 'bg-indigo-50' : ''}`}>
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
              {dbUser?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
