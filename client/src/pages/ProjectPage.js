import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getProject, getTasks, updateTask, createTask, deleteTask } from '../api';
import { useSocket } from '../context/SocketContext';
import { format, isPast } from 'date-fns';
import TaskModal from '../components/tasks/TaskModal';
import CreateTaskModal from '../components/tasks/CreateTaskModal';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: '#94a3b8' },
  { id: 'in_progress', label: 'In Progress', color: '#6366f1' },
  { id: 'in_review', label: 'In Review', color: '#f59e0b' },
  { id: 'done', label: 'Done', color: '#22c55e' },
];

const PRIORITY_BADGE = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState('kanban');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createStatus, setCreateStatus] = useState('todo');
  const [filterPriority, setFilterPriority] = useState('');
  const { joinProject, leaveProject, on, off } = useSocket();

  const loadTasks = useCallback(async () => {
    const res = await getTasks(projectId, filterPriority ? { priority: filterPriority } : {});
    setTasks(res.data);
  }, [projectId, filterPriority]);

  useEffect(() => {
    const load = async () => {
      try {
        const [projRes] = await Promise.all([getProject(projectId), loadTasks()]);
        setProject(projRes.data);
      } catch {
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
    joinProject(projectId);
    return () => leaveProject(projectId);
  }, [projectId]);

  useEffect(() => { loadTasks(); }, [filterPriority]);

  // Real-time updates
  useEffect(() => {
    const onCreate = (t) => setTasks(prev => [t, ...prev]);
    const onUpdate = (t) => setTasks(prev => prev.map(p => p.id === t.id ? { ...p, ...t } : p));
    const onDelete = ({ taskId }) => setTasks(prev => prev.filter(p => p.id !== taskId));
    on('task:created', onCreate); on('task:updated', onUpdate); on('task:deleted', onDelete);
    return () => { off('task:created', onCreate); off('task:updated', onUpdate); off('task:deleted', onDelete); };
  }, [on, off]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t));
    try { await updateTask(draggableId, { status: newStatus }); } catch {}
  };

  const handleCreateTask = async (data) => {
    try {
      await createTask(projectId, { ...data, status: createStatus });
      setShowCreate(false);
    } catch (err) { alert(err.message); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await deleteTask(taskId);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"/></div>;

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: project?.color }}>
            {project?.name?.[0]}
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">{project?.name}</h1>
            <p className="text-xs text-gray-400">{tasks.length} tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('kanban')} className={`px-3 py-1 rounded text-sm transition ${view === 'kanban' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Board</button>
            <button onClick={() => setView('list')} className={`px-3 py-1 rounded text-sm transition ${view === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>List</button>
          </div>
          <button onClick={() => { setShowCreate(true); setCreateStatus('todo'); }}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition">
            + Task
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      {view === 'kanban' && (
        <div className="flex-1 overflow-x-auto p-6">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full min-w-max">
              {COLUMNS.map(col => (
                <div key={col.id} className="w-72 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }}/>
                      <span className="text-sm font-medium text-gray-700">{col.label}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{tasksByStatus[col.id]?.length || 0}</span>
                    </div>
                    <button onClick={() => { setShowCreate(true); setCreateStatus(col.id); }}
                      className="text-gray-400 hover:text-gray-600 text-lg w-6 h-6 flex items-center justify-center">+</button>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 rounded-xl p-2 min-h-24 transition ${snapshot.isDraggingOver ? 'bg-indigo-50 border-2 border-dashed border-indigo-300' : 'bg-gray-100'}`}
                      >
                        {tasksByStatus[col.id]?.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setSelectedTask(task.id)}
                                className={`bg-white rounded-lg p-3 mb-2 cursor-pointer hover:shadow-md transition border border-gray-100 ${snapshot.isDragging ? 'shadow-lg rotate-1' : ''}`}
                              >
                                <TaskCard task={task} onDelete={handleDeleteTask} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Task', 'Assignee', 'Priority', 'Status', 'Due Date', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTask(task.id)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      {task.labels?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {task.labels.map(l => (
                            <span key={l.id} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: l.color + '20', color: l.color }}>{l.label}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {task.assignee_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs">{task.assignee_name[0]}</div>
                          <span className="text-sm text-gray-600">{task.assignee_name}</span>
                        </div>
                      ) : <span className="text-sm text-gray-300">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{task.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      {task.due_date ? (
                        <span className={`text-xs ${isPast(new Date(task.due_date)) && task.status !== 'done' ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          {format(new Date(task.due_date), 'MMM d')}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleDeleteTask(task.id)} className="text-gray-300 hover:text-red-400 text-sm">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">No tasks yet.</p>
                <button onClick={() => setShowCreate(true)} className="mt-2 text-indigo-600 text-sm hover:underline">Create your first task</button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTask && <TaskModal taskId={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={loadTasks} />}
      {showCreate && <CreateTaskModal projectId={projectId} status={createStatus} members={project?.members || []} onClose={() => setShowCreate(false)} onCreate={handleCreateTask} />}
    </div>
  );
}

function TaskCard({ task, onDelete }) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
  return (
    <div>
      <p className="text-sm font-medium text-gray-900 mb-2">{task.title}</p>
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map(l => (
            <span key={l.id} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: l.color + '20', color: l.color }}>{l.label}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>
        <div className="flex items-center gap-1">
          {task.due_date && (
            <span className={`text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
              {isOverdue ? '⚠ ' : ''}{format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          {task.assignee_name && (
            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs ml-1">
              {task.assignee_name[0]}
            </div>
          )}
        </div>
      </div>
      {task.comment_count > 0 && <p className="text-xs text-gray-400 mt-2">💬 {task.comment_count}</p>}
    </div>
  );
}
