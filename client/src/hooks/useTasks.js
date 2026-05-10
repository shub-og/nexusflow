import { useState, useEffect, useCallback } from 'react';
import { getTasks, updateTask as apiUpdateTask } from '../api';

export const useTasks = (projectId, filters = {}) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getTasks(projectId, filters);
      setTasks(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  // Real-time patch from socket events
  const patchTask = useCallback((updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
  }, []);

  const addTask = useCallback((newTask) => {
    setTasks(prev => [newTask, ...prev]);
  }, []);

  const removeTask = useCallback((taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const moveTask = async (taskId, newStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await apiUpdateTask(taskId, { status: newStatus });
    } catch (err) {
      // Revert on failure
      load();
    }
  };

  return { tasks, loading, error, reload: load, patchTask, addTask, removeTask, moveTask };
};
