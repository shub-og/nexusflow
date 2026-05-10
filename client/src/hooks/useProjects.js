import { useState, useEffect, useCallback } from 'react';
import { getProjects, createProject, deleteProject } from '../api';

export const useProjects = (workspaceId) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await getProjects(workspaceId);
      setProjects(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const addProject = async (data) => {
    const res = await createProject(workspaceId, data);
    setProjects(prev => [res.data, ...prev]);
    return res.data;
  };

  const removeProject = async (id) => {
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return { projects, loading, error, reload: load, addProject, removeProject };
};
