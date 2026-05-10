import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWorkspaceMembers, removeMember, sendInvite, updateWorkspace } from '../api';

export default function Settings() {
  const { workspace, dbUser, refreshUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [wsName, setWsName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const isAdmin = workspace?.role === 'admin';

  useEffect(() => {
    if (!workspace?.id) return;
    setWsName(workspace.name || '');
    loadMembers();
  }, [workspace]);

  const loadMembers = async () => {
    try {
      const res = await getWorkspaceMembers(workspace.id);
      setMembers(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg('');
    try {
      await sendInvite(workspace.id, { email: inviteEmail, role: inviteRole });
      setInviteMsg(`✓ Invite sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (err) {
      setInviteMsg(`✕ ${err.message}`);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await removeMember(workspace.id, userId);
      setMembers(prev => prev.filter(m => m.id !== userId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveName = async () => {
    if (!wsName.trim()) return;
    setSavingName(true);
    try {
      await updateWorkspace(workspace.id, { name: wsName });
      await refreshUser();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Workspace */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Workspace</h2>
        <div className="flex gap-3">
          <input
            value={wsName} onChange={e => setWsName(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!isAdmin}
          />
          {isAdmin && (
            <button onClick={handleSaveName} disabled={savingName || !wsName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition">
              {savingName ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </section>

      {/* Members */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Team Members</h2>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg"/>)}
          </div>
        ) : (
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-500 text-white text-sm font-medium flex items-center justify-center">
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name} {m.id === dbUser?.id && <span className="text-xs text-gray-400">(you)</span>}</p>
                    <p className="text-xs text-gray-400">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {m.role}
                  </span>
                  {isAdmin && m.id !== dbUser?.id && (
                    <button onClick={() => handleRemove(m.id)}
                      className="text-sm text-red-400 hover:text-red-600 transition">Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invite */}
      {isAdmin && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Invite Member</h2>
          <p className="text-sm text-gray-400 mb-4">An invite link will be sent via email.</p>
          <form onSubmit={handleInvite} className="flex gap-3 flex-wrap">
            <input
              type="email" required placeholder="colleague@example.com"
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={inviting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition">
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
          </form>
          {inviteMsg && (
            <p className={`mt-3 text-sm ${inviteMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{inviteMsg}</p>
          )}
        </section>
      )}

      {/* Profile */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
        <h2 className="font-semibold text-gray-900 mb-4">Your Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-600 text-white text-xl font-bold flex items-center justify-center">
            {dbUser?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">{dbUser?.name}</p>
            <p className="text-sm text-gray-500">{dbUser?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">Role: {workspace?.role}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
