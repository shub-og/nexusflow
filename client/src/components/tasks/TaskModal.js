import React, { useState, useEffect } from 'react';
import { getTask, updateTask, addComment, addLabel, removeLabel, startTimer, stopTimer, addManualTime, getActiveTimer } from '../../api';
import { format, isPast, formatDistanceToNow } from 'date-fns';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];
const STATUS_OPTIONS = ['todo', 'in_progress', 'in_review', 'done'];
const PRIORITY_BADGE = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};
const LABEL_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];

export default function TaskModal({ taskId, onClose, onUpdate }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('details');
  const [editing, setEditing] = useState({});
  const [labelInput, setLabelInput] = useState('');
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[0]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [manualMin, setManualMin] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    loadTimer();
  }, [taskId]);

  // Live timer tick
  useEffect(() => {
    if (!activeTimer) return;
    const start = new Date(activeTimer.started_at).getTime();
    const tick = setInterval(() => {
      setTimerSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [activeTimer]);

  const load = async () => {
    try {
      const res = await getTask(taskId);
      setTask(res.data);
    } finally {
      setLoading(false);
    }
  };

  const loadTimer = async () => {
    try {
      const res = await getActiveTimer();
      if (res.data?.task_id === taskId) {
        setActiveTimer(res.data);
        setTimerSeconds(Math.floor((Date.now() - new Date(res.data.started_at)) / 1000));
      }
    } catch {}
  };

  const save = async (field, value) => {
    setSaving(true);
    try {
      const res = await updateTask(taskId, { [field]: value });
      setTask(prev => ({ ...prev, ...res.data }));
      setEditing({});
      onUpdate?.();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await addComment(taskId, { body: comment });
      setTask(prev => ({ ...prev, comments: [...(prev.comments || []), res.data] }));
      setComment('');
    } catch (err) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  const handleAddLabel = async () => {
    if (!labelInput.trim()) return;
    try {
      const res = await addLabel(taskId, { label: labelInput.trim(), color: labelColor });
      setTask(prev => ({ ...prev, labels: [...(prev.labels || []), res.data] }));
      setLabelInput('');
    } catch (err) { alert(err.message); }
  };

  const handleRemoveLabel = async (labelId) => {
    try {
      await removeLabel(labelId);
      setTask(prev => ({ ...prev, labels: prev.labels.filter(l => l.id !== labelId) }));
    } catch (err) { alert(err.message); }
  };

  const handleStartTimer = async () => {
    try {
      const res = await startTimer(taskId);
      setActiveTimer(res.data);
      setTimerSeconds(0);
    } catch (err) { alert(err.message); }
  };

  const handleStopTimer = async () => {
    try {
      await stopTimer(taskId);
      setActiveTimer(null);
      setTimerSeconds(0);
      load();
    } catch (err) { alert(err.message); }
  };

  const handleManualTime = async () => {
    if (!manualMin || isNaN(manualMin)) return;
    try {
      await addManualTime(taskId, { durationMinutes: parseInt(manualMin) });
      setManualMin('');
      load();
    } catch (err) { alert(err.message); }
  };

  const fmtSeconds = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${sec}s`;
  };

  const fmtDuration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"/>
    </div>
  );

  if (!task) return null;
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-3xl sm:rounded-2xl shadow-2xl max-h-screen sm:max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex-1 mr-4">
            {editing.title ? (
              <input
                autoFocus defaultValue={task.title}
                className="w-full text-xl font-semibold text-gray-900 border-b-2 border-indigo-500 focus:outline-none pb-1"
                onBlur={e => save('title', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing({}); }}
              />
            ) : (
              <h2
                className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-indigo-600 transition"
                onClick={() => setEditing({ title: true })}
              >{task.title}</h2>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{task.status?.replace('_', ' ')}</span>
              {isOverdue && <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 font-medium">⚠ Overdue</span>}
              {task.labels?.map(l => (
                <span key={l.id} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: l.color + '20', color: l.color }}>
                  {l.label}
                  <button onClick={() => handleRemoveLabel(l.id)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {['details', 'comments', 'activity', 'time'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-3 px-4 text-sm font-medium capitalize border-b-2 transition ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t} {t === 'comments' && task.comments?.length > 0 ? `(${task.comments.length})` : ''}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* DETAILS */}
          {tab === 'details' && (
            <div className="p-6 grid sm:grid-cols-3 gap-6">
              <div className="sm:col-span-2 space-y-5">
                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Description</label>
                  {editing.description ? (
                    <textarea
                      autoFocus defaultValue={task.description || ''}
                      rows={4}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onBlur={e => save('description', e.target.value)}
                    />
                  ) : (
                    <p
                      className="text-sm text-gray-600 cursor-pointer hover:bg-gray-50 rounded p-2 min-h-16"
                      onClick={() => setEditing({ description: true })}
                    >{task.description || <span className="text-gray-300 italic">Click to add description…</span>}</p>
                  )}
                </div>

                {/* Labels */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Labels</label>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      value={labelInput} onChange={e => setLabelInput(e.target.value)}
                      placeholder="Add label…"
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32"
                      onKeyDown={e => { if (e.key === 'Enter') handleAddLabel(); }}
                    />
                    <div className="flex gap-1">
                      {LABEL_COLORS.map(c => (
                        <button key={c} onClick={() => setLabelColor(c)}
                          className={`w-5 h-5 rounded-full border-2 ${labelColor === c ? 'border-gray-900' : 'border-transparent'}`}
                          style={{ background: c }}/>
                      ))}
                    </div>
                    <button onClick={handleAddLabel} className="text-sm text-indigo-600 hover:underline">Add</button>
                  </div>
                </div>
              </div>

              {/* Sidebar fields */}
              <div className="space-y-4">
                <Field label="Status">
                  <select value={task.status} onChange={e => save('status', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </Field>
                <Field label="Priority">
                  <select value={task.priority} onChange={e => save('priority', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Due Date">
                  <input type="date"
                    value={task.due_date ? task.due_date.split('T')[0] : ''}
                    onChange={e => save('dueDate', e.target.value || null)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </Field>
                <Field label="Assignee">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {task.assignee_name ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">{task.assignee_name[0]}</div>
                        {task.assignee_name}
                      </>
                    ) : <span className="text-gray-400">Unassigned</span>}
                  </div>
                </Field>
                <Field label="Created by">
                  <p className="text-sm text-gray-600">{task.created_by_name || '—'}</p>
                </Field>
                <Field label="Created">
                  <p className="text-sm text-gray-500">{task.created_at ? format(new Date(task.created_at), 'MMM d, yyyy') : '—'}</p>
                </Field>
                <Field label="Time logged">
                  <p className="text-sm text-gray-700 font-medium">{fmtDuration(task.total_time_seconds || 0)}</p>
                </Field>
              </div>
            </div>
          )}

          {/* COMMENTS */}
          {tab === 'comments' && (
            <div className="p-6 space-y-4">
              {task.comments?.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No comments yet. Be the first!</p>}
              {task.comments?.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 text-white text-sm flex items-center justify-center flex-shrink-0">{c.user_name?.[0]}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{c.user_name}</span>
                      <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{c.body}</p>
                  </div>
                </div>
              ))}
              <form onSubmit={handleComment} className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <textarea
                  value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment…" rows={2}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <button type="submit" disabled={submitting || !comment.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 self-end transition">
                  {submitting ? '…' : 'Send'}
                </button>
              </form>
            </div>
          )}

          {/* ACTIVITY */}
          {tab === 'activity' && (
            <div className="p-6 space-y-3">
              {task.activity?.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No activity yet.</p>}
              {task.activity?.map(a => (
                <div key={a.id} className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center flex-shrink-0">{a.user_name?.[0] || '?'}</div>
                  <div>
                    <span className="text-sm text-gray-700"><strong>{a.user_name}</strong> {formatActivity(a)}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TIME TRACKING */}
          {tab === 'time' && (
            <div className="p-6 space-y-6">
              {/* Timer */}
              <div className="bg-gray-50 rounded-xl p-5 text-center">
                <p className="text-4xl font-mono font-bold text-gray-900 mb-4">{fmtSeconds(timerSeconds)}</p>
                {activeTimer?.task_id === taskId ? (
                  <button onClick={handleStopTimer}
                    className="px-6 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition">
                    ⏹ Stop Timer
                  </button>
                ) : (
                  <button onClick={handleStartTimer}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
                    ▶ Start Timer
                  </button>
                )}
              </div>

              {/* Manual entry */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Manual Entry</label>
                <div className="flex gap-2">
                  <input
                    type="number" min="1" placeholder="Minutes"
                    value={manualMin} onChange={e => setManualMin(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32"
                  />
                  <button onClick={handleManualTime}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 transition">
                    Log time
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Total logged: <strong className="text-gray-900">{fmtDuration(task.total_time_seconds || 0)}</strong></p>
              </div>
            </div>
          )}
        </div>

        {saving && (
          <div className="absolute bottom-4 right-4 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-full">Saving…</div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function formatActivity(a) {
  switch (a.action) {
    case 'created': return `created this task`;
    case 'updated':
      if (a.meta?.status) return `changed status from "${a.meta.status.from}" to "${a.meta.status.to}"`;
      if (a.meta?.priority) return `changed priority from "${a.meta.priority.from}" to "${a.meta.priority.to}"`;
      if (a.meta?.assignee) return `changed the assignee`;
      return `updated the task`;
    case 'commented': return `commented: "${a.meta?.preview}"`;
    default: return a.action;
  }
}
