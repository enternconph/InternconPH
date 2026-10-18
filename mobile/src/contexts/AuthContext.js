import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ojtStatus, setOjtStatus] = useState(null);
  const [isOjtActive, setIsOjtActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore session from AsyncStorage
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await AsyncStorage.getItem('@internconph_token');
        const storedUser = await AsyncStorage.getItem('@internconph_user');
        
        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.role !== 'student') {
            await logout();
            return;
          }
          setToken(storedToken);
          setUser(parsedUser);
          await checkOjtStatus();
        }
      } catch (err) {
        console.warn('Failed restoring stored session', err);
      } finally {
        setLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  // Validate student's active OJT status from deployed server
  const checkOjtStatus = async () => {
    try {
      const res = await api.get('/student/ojt');
      if (res.success && res.data) {
        const records = res.data.records || [];
        const activeRec = records.find(r => r.status === 'ongoing' || r.status === 'active' || r.status === 'starting_ojt');
        
        if (activeRec) {
          setOjtStatus(activeRec.status);
          setIsOjtActive(true);
          return { active: true, record: activeRec, data: res.data };
        } else {
          const fallbackStatus = records[0]?.status || 'pending_placement';
          setOjtStatus(fallbackStatus);
          setIsOjtActive(false);
          return { active: false, status: fallbackStatus, data: res.data };
        }
      }
      setIsOjtActive(false);
      return { active: false, status: 'no_ojt_record' };
    } catch (err) {
      console.warn('OJT status check error:', err);
      return { active: false, error: err.message };
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      
      if (!res.success || !res.token) {
        throw new Error(res.message || 'Login failed. Please verify your credentials.');
      }

      // STRICT FILTER 1: Must be a student account
      if (res.user?.role !== 'student') {
        throw new Error('Access Denied: This mobile app is exclusively for students. Mentors, Coordinators, and Employers must use the web system.');
      }

      await AsyncStorage.setItem('@internconph_token', res.token);
      await AsyncStorage.setItem('@internconph_user', JSON.stringify(res.user));

      setToken(res.token);
      setUser(res.user);

      // STRICT FILTER 2: Verify active OJT status
      const ojtCheck = await checkOjtStatus();

      return {
        success: true,
        user: res.user,
        isOjtActive: ojtCheck.active,
        status: ojtCheck.status
      };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@internconph_token');
      await AsyncStorage.removeItem('@internconph_user');
    } catch (_) {}
    setUser(null);
    setToken(null);
    setOjtStatus(null);
    setIsOjtActive(false);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        ojtStatus,
        isOjtActive,
        loading,
        error,
        login,
        logout,
        checkOjtStatus,
        refreshOjt: checkOjtStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
export default AuthContext;
