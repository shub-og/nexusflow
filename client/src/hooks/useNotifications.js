import { useState, useEffect, useCallback } from 'react';
import { getNotifications, markRead as apiMarkRead, markAllRead as apiMarkAllRead } from '../api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ limit: 30 });
      setNotifications(res.data.notifications);
      setUnread(res.data.unread);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addNotification = useCallback((n) => {
    setNotifications(prev => [n, ...prev]);
    setUnread(prev => prev + 1);
  }, []);

  const markRead = async (id) => {
    await apiMarkRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await apiMarkAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  return { notifications, unread, loading, addNotification, markRead, markAllRead };
};
