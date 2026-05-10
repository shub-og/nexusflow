import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWorkspaceAnalytics, getProjects } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PRIORITY_COLORS = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
const STATUS_COLORS = { todo: '#94a3b8', in_progress: '#6366f1', in_review: '#f59e0b', done: '#22c55e' };

export default function Dashboard() {
  const { workspace, dbUser } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id) return;
    const load = async () => {
      try {
        const [analyticsRes, projectsRes] = await Promise.all([
          getWorkspaceAnalytics(workspace.id),
          getProjects(workspace.id),
        ]);
        setAnalytics(analyticsRes.data);
        setProjects(projectsRes.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspace]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"/></div>;

  const workloadData = analytics?.memberWorkload?.map(m => ({ name: m.name.split(' ')[0], tasks: parseInt(m.task_count) })) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Good {getGreeting()}, {dbUser?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 mt-1">Here's what's happening in your workspace</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Projects" value={projects.filter(p => p.status === 'active').length} icon="📁" color="indigo" />
        <StatCard label="Overdue Tasks" value={analytics?.overdueCount || 0} icon="⚠" color="red" />
        <StatCard label="Team Members" value={analytics?.memberWorkload?.length || 0} icon="👥" color="green" />
        <StatCard label="Completion Rate" value={`${getAvgProgress(analytics?.projectProgress)}%`} icon="✓" color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Projects progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Project Progress</h2>
            <Link to="/projects/new" className="text-sm text-indigo-600 hover:underline">+ New</Link>
          </div>
          {projects.length === 0 ? (
            <EmptyState text="No projects yet" sub="Create your first project" link="/projects/new" linkText="Create project" />
          ) : (
            <div className="space-y-4">
              {projects.slice(0, 6).map(p => {
                const progress = p.total_tasks > 0 ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0;
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} className="block group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
                        <span className="text-sm font-medium text-gray-800 group-hover:text-indigo-600">{p.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{p.done_tasks}/{p.total_tasks} tasks</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: p.color }}/>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Member workload chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Team Workload</h2>
          {workloadData.length === 0 ? (
            <EmptyState text="No team data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={workloadData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tasks" radius={[4, 4, 0, 0]}>
                  {workloadData.map((_, i) => <Cell key={i} fill={['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Project cards grid */}
      {projects.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-gray-900 mb-4">All Projects</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ background: p.color }}>
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 group-hover:text-indigo-600 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.total_tasks} tasks</p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                  <div className="h-1.5 rounded-full" style={{
                    width: `${p.total_tasks > 0 ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0}%`,
                    background: p.color,
                  }}/>
                </div>
                <p className="text-xs text-gray-400 text-right">
                  {p.total_tasks > 0 ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0}% complete
                </p>
              </Link>
            ))}
            <Link to="/projects/new" className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 transition group">
              <span className="text-2xl text-gray-400 group-hover:text-indigo-400">+</span>
              <span className="text-sm text-gray-400 group-hover:text-indigo-500">New project</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    red: 'bg-red-50 text-red-500',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function EmptyState({ text, sub, link, linkText }) {
  return (
    <div className="text-center py-8">
      <p className="text-gray-400 text-sm">{text}</p>
      {sub && <p className="text-gray-300 text-xs mt-1">{sub}</p>}
      {link && <Link to={link} className="text-indigo-600 text-sm mt-2 inline-block hover:underline">{linkText}</Link>}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getAvgProgress(projects = []) {
  if (!projects.length) return 0;
  const avg = projects.reduce((sum, p) => sum + (p.total > 0 ? Math.round((p.done / p.total) * 100) : 0), 0) / projects.length;
  return Math.round(avg);
}
