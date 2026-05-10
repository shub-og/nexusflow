import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { acceptInvite } from '../api';

export default function InvitePage() {
  const { token } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }
    const accept = async () => {
      try {
        await acceptInvite(token);
        await refreshUser();
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    };
    accept();
  }, [user, token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-sm w-full">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"/>
            <p className="text-gray-600">Accepting your invitation…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome aboard!</h2>
            <p className="text-gray-500 text-sm">You've joined the workspace. Redirecting you to your dashboard…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation failed</h2>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button onClick={() => navigate('/dashboard')} className="text-indigo-600 text-sm hover:underline">Go to dashboard</button>
          </>
        )}
      </div>
    </div>
  );
}
