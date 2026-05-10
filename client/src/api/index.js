import axios from 'axios';
import { auth } from '../config/firebase';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
});

// Inject Firebase token on every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// Auth
export const getMe = () => api.get('/auth/me');
export const sendInvite = (workspaceId, data) => api.post(`/workspaces/${workspaceId}/invite`, data);
export const acceptInvite = (token) => api.post(`/invite/accept/${token}`);

// Workspaces
export const createWorkspace = (data) => api.post('/workspaces', data);
export const getWorkspace = (id) => api.get(`/workspaces/${id}`);
export const updateWorkspace = (id, data) => api.patch(`/workspaces/${id}`, data);
export const getWorkspaceMembers = (id) => api.get(`/workspaces/${id}/members`);
export const removeMember = (workspaceId, userId) => api.delete(`/workspaces/${workspaceId}/members/${userId}`);
export const getWorkspaceAnalytics = (id) => api.get(`/workspaces/${id}/analytics`);

// Projects
export const getProjects = (workspaceId) => api.get(`/workspaces/${workspaceId}/projects`);
export const createProject = (workspaceId, data) => api.post(`/workspaces/${workspaceId}/projects`, data);
export const getProject = (id) => api.get(`/projects/${id}`);
export const updateProject = (id, data) => api.patch(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const getProjectAnalytics = (id) => api.get(`/projects/${id}/analytics`);

// Tasks
export const getTasks = (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params });
export const createTask = (projectId, data) => api.post(`/projects/${projectId}/tasks`, data);
export const getTask = (id) => api.get(`/tasks/${id}`);
export const updateTask = (id, data) => api.patch(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const addComment = (taskId, data) => api.post(`/tasks/${taskId}/comments`, data);
export const getActivity = (taskId) => api.get(`/tasks/${taskId}/activity`);
export const addLabel = (taskId, data) => api.post(`/tasks/${taskId}/labels`, data);
export const removeLabel = (labelId) => api.delete(`/labels/${labelId}`);

// Time
export const startTimer = (taskId) => api.post(`/tasks/${taskId}/time/start`);
export const stopTimer = (taskId) => api.post(`/tasks/${taskId}/time/stop`);
export const addManualTime = (taskId, data) => api.post(`/tasks/${taskId}/time/manual`, data);
export const getActiveTimer = () => api.get('/time/active');
export const getProjectTimeReport = (projectId, params) => api.get(`/projects/${projectId}/time-report`, { params });

// Notifications
export const getNotifications = (params) => api.get('/notifications', { params });
export const markRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllRead = () => api.patch('/notifications/read-all');

export default api;
