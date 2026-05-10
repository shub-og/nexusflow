import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWorkspaceAnalytics, getProjects, getProjectAnalytics, getProjectTimeReport } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';

const STATUS_COLORS = { todo: '#94a3b8', in_progress: '#6366f1', in_review: '#f59e0b', done: '#22c55e' };
const MEMBER_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

export default function Analytics() {
  const { workspace } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [wsAnalytics, setWsAnalytics] = useState(null);
  const [projAnalytics, setProjAnalytics] = useState(null);
  const [timeReport, setTimeReport] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id) return;
    const load = async () => {
      try {
        const [wsRes, projRes] = await Promise.all([
          getWorkspaceAnalytics(workspace.id),
          getProjects(workspace.id),
        ]);
        setWsAnalytics(wsRes.data);
        setProjects(projRes.data);
        if (projRes.data.length > 0) {
          setSelectedProject(projRes.data[0].id);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspace]);

  useEffect(() => {
    if (!selectedProject) return;
    const load = async () => {
      const [analyticsRes, timeRes] = await Promise.all([
        getProjectAnalytics(selectedProject),
        getProjectTimeReport(selectedProject),
      ]);
      setProjAnalytics(analyticsRes.data);
      setTimeReport(timeRes.data);
    };
    load();
  }, [selectedProject]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"/></div>;

  const taskStatusData = projAnalytics
    ? Object.entries(STATUS_COLORS).map(([status, color]) => ({
        name: status.replace('_', ' '), value: projAnalytics.tasks[status] || 0, color,
      })).filter(d => d.value > 0)
    : [];

  const workloadData = (wsAnalytics?.memberWorkload || []).map(m => ({
    name: m.name.split(' ')[0], tasks: parseInt(m.task_count),
  }));

  const progressData = (wsAnalytics?.projectProgress || []).map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    progress: p.progress,
    color: p.color,
  }));

  const timeData = timeReport.map(m => ({
    name: m.name.split(' ')[0],
    hours: parseFloat((parseInt(m.total_seconds) / 3600).toFixed(1)),
  }));

  const weeklyData = (projAnalytics?.weekly || []).reverse().map(w => ({
    week: new Date(w.week).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    created: parseInt(w.created),
    completed: parseInt(w.completed),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-0.5">Workspace and project insights</p>
        </div>
        <select
          value={selectedProject || ''}
          onChange={e => setSelectedProject(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Projects" value={projects.filter(p => p.status === 'active').length} color="indigo" />
        <StatCard label="Overdue Tasks" value={wsAnalytics?.overdueCount || 0} color="red" />
        <StatCard
          label="Project Progress"
          value={projAnalytics ? `${projAnalytics.progress}%` : '—'}
          color="green"
        />
        <StatCard
          label="Time Tracked"
          value={projAnalytics ? fmtHours(projAnalytics.totalTime) : '—'}
          color="purple"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Task status pie */}
        <ChartCard title="Task Status Breakdown" subtitle={`Project: ${projects.find(p => p.id === selectedProject)?.name || ''}`}>
          {taskStatusData.length === 0
            ? <Empty />
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {taskStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        {/* Member workload */}
        <ChartCard title="Team Workload" subtitle="Open tasks per member">
          {workloadData.length === 0
            ? <Empty />
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={workloadData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="tasks" name="Tasks" radius={[4, 4, 0, 0]}>
                    {workloadData.map((_, i) => <Cell key={i} fill={MEMBER_COLORS[i % MEMBER_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        {/* Project progress bars */}
        <ChartCard title="Project Completion" subtitle="All active projects">
          {progressData.length === 0
            ? <Empty />
            : <div className="space-y-4 pt-2">
                {progressData.map(p => (
                  <div key={p.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-700">{p.name}</span>
                      <span className="text-sm font-medium text-gray-900">{p.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${p.progress}%`, background: p.color }}/>
                    </div>
                  </div>
                ))}
              </div>
          }
        </ChartCard>

        {/* Time tracked per member */}
        <ChartCard title="Time Tracked" subtitle="Hours per team member (this project)">
          {timeData.length === 0 || timeData.every(d => d.hours === 0)
            ? <Empty text="No time entries yet" />
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={timeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="h" />
                  <Tooltip formatter={(v) => [`${v}h`, 'Time']} />
                  <Bar dataKey="hours" name="Hours" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {timeData.map((_, i) => <Cell key={i} fill={MEMBER_COLORS[i % MEMBER_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>
      </div>

      {/* Weekly trend */}
      {weeklyData.length > 0 && (
        <ChartCard title="Weekly Task Trend" subtitle="Tasks created vs completed over time">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2} dot={false} name="Created" />
              <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={false} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Member time table */}
      {timeReport.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Time Report</h3>
            <p className="text-sm text-gray-500 mt-0.5">Detailed breakdown per team member</p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Member', 'Tasks Tracked', 'Total Time', 'Avg per Task'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {timeReport.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">{m.name[0]}</div>
                      <span className="text-sm font-medium text-gray-900">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{m.tasks_tracked}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmtHours(parseInt(m.total_seconds))}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {m.tasks_tracked > 0 ? fmtHours(Math.floor(m.total_seconds / m.tasks_tracked)) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = { indigo: 'text-indigo-600', red: 'text-red-500', green: 'text-green-600', purple: 'text-purple-600' };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Empty({ text = 'No data yet' }) {
  return <div className="flex items-center justify-center h-32 text-gray-300 text-sm">{text}</div>;
}

function fmtHours(seconds) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
