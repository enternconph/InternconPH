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

  // Restore session from AsyncStorage (with full offline support)
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await AsyncStorage.getItem('@internconph_token');
        const storedUser = await AsyncStorage.getItem('@internconph_user');
        const storedOjtActive = await AsyncStorage.getItem('@internconph_ojt_active');
        const storedOjtStatus = await AsyncStorage.getItem('@internconph_ojt_status');
        
        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.role !== 'student') {
            await logout();
            return;
          }
          setToken(storedToken);
          setUser(parsedUser);

          // If previously active, restore immediately so offline access works
          if (storedOjtActive === 'true') {
            setIsOjtActive(true);
            setOjtStatus(storedOjtStatus || 'ongoing');
          } else if (storedOjtStatus) {
            setOjtStatus(storedOjtStatus);
          }

          // Background sync with live server if online
          checkOjtStatus().catch(() => {});
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
        const activeRec = records.find(r =>
          ['ongoing', 'active', 'starting_ojt', 'in_progress', 'deployed', 'accepted', 'hired'].includes(r.status)
        );

        if (activeRec) {
          setOjtStatus(activeRec.status);
          setIsOjtActive(true);
          setError(null);
          await AsyncStorage.setItem('@internconph_ojt_active', 'true');
          await AsyncStorage.setItem('@internconph_ojt_status', activeRec.status);
          return { active: true, record: activeRec, status: activeRec.status, data: res.data };
        } else {
          const fallbackStatus = records[0]?.status || 'pending_placement';
          setOjtStatus(fallbackStatus);
          setIsOjtActive(false);
          await AsyncStorage.setItem('@internconph_ojt_active', 'false');
          await AsyncStorage.setItem('@internconph_ojt_status', fallbackStatus);
          return { active: false, status: fallbackStatus, record: records[0], data: res.data };
        }
      }
      return { active: isOjtActive, status: ojtStatus || 'pending_placement' };
    } catch (err) {
      console.warn('OJT status check error (offline or network):', err);
      // Keep cached offline active state
      const cachedActive = (await AsyncStorage.getItem('@internconph_ojt_active')) === 'true';
      if (cachedActive) {
        setIsOjtActive(true);
      }
      return { active: cachedActive, error: err.message, networkError: true };
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

      const userData = {
        ...res.user,
        full_name: res.user.full_name || res.user.display_name || `${res.user.first_name || ''} ${res.user.last_name || ''}`.trim() || 'Student Candidate',
        student_id: res.user.student_id || res.user.studentId || res.user.id
      };

      await AsyncStorage.setItem('@internconph_token', res.token);
      await AsyncStorage.setItem('@internconph_user', JSON.stringify(userData));

      setToken(res.token);
      setUser(userData);

      // STRICT FILTER 2: Verify active OJT status
      const ojtCheck = await checkOjtStatus();

      return {
        success: true,
        user: userData,
        isOjtActive: ojtCheck.active,
        status: ojtCheck.status,
        error: ojtCheck.error
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
      await AsyncStorage.removeItem('@internconph_ojt_active');
      await AsyncStorage.removeItem('@internconph_ojt_status');
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
