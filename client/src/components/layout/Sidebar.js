import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProjects } from '../../api';

const NAV = [
  { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { path: '/analytics', icon: '📊', label: 'Analytics' },
  { path: '/settings', icon: '⚙', label: 'Settings' },
];

export default function Sidebar() {
  const { dbUser, workspace, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (workspace?.id) {
      getProjects(workspace.id).then(r => setProjects(r.data)).catch(() => {});
    }
  }, [workspace]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 bg-gray-900 text-white flex flex-col h-screen transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center text-sm">✓</div>
            <span className="font-semibold text-sm truncate">{workspace?.name || 'Workspace'}</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white text-lg ml-auto">
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {NAV.map(item => (
          <Link key={item.path} to={item.path}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
              isActive(item.path) ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}>
            <span>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {/* Projects */}
        {!collapsed && (
          <div className="mt-4">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Projects</span>
              <Link to="/projects/new" className="text-gray-500 hover:text-white text-lg leading-none">+</Link>
            </div>
            {projects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  isActive(`/projects/${p.id}`) ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }}/>
                <span className="truncate">{p.name}</span>
                <span className="ml-auto text-xs text-gray-600">{p.done_tasks}/{p.total_tasks}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-gray-800 p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-medium flex-shrink-0">
            {dbUser?.name?.[0]?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{dbUser?.name}</p>
              <p className="text-xs text-gray-500 truncate">{dbUser?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="text-gray-500 hover:text-white text-sm" title="Logout">⏻</button>
          )}
        </div>
      </div>
    </aside>
  );
}
