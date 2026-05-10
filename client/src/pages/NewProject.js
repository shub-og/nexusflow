import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createProject } from '../api';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

export default function NewProject() {
  const { workspace } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await createProject(workspace.id, form);
      navigate(`/projects/${res.data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Project</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project name *</label>
            <input
              autoFocus required
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Website Redesign"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What is this project about?"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full border-2 transition ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: form.color }}>
              {form.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-medium text-gray-900">{form.name || 'Project Name'}</p>
              <p className="text-xs text-gray-400">{form.description || 'No description'}</p>
            </div>
          </div>

          <button type="submit" disabled={loading || !form.name.trim()}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {loading ? 'Creating…' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
}
