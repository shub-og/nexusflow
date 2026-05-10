import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signInWithPopup,
  signOut, updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { getMe, createWorkspace } from '../api';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const res = await getMe();
          setDbUser(res.data);
          if (res.data.workspaces?.length > 0) {
            setWorkspace(res.data.workspaces[0]);
          } else {
            setWorkspace(null);
          }
        } catch (err) {
          console.error('Failed to load user:', err.message);
        }
      } else {
        setDbUser(null);
        setWorkspace(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = async (email, password, name) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    return result;
  };

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  const refreshUser = async () => {
    if (auth.currentUser) {
      try {
        const res = await getMe();
        setDbUser(res.data);
        if (res.data.workspaces?.length > 0) {
          setWorkspace(res.data.workspaces[0]);
        }
      } catch (err) {
        console.error('Refresh failed:', err.message);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user, dbUser, loading, workspace, setWorkspace,
      login, register, loginWithGoogle, logout, refreshUser,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
