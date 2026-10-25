import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Synchronize authentication state across multiple browser tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (!e.newValue) {
          setUser(null);
        } else {
          const savedUser = localStorage.getItem('user');
          try {
            if (savedUser) setUser(JSON.parse(savedUser));
          } catch (_) {}
        }
      } else if (e.key === 'user') {
        if (!e.newValue) {
          setUser(null);
        } else {
          try {
            setUser(JSON.parse(e.newValue));
          } catch (_) {}
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync user object to localStorage whenever it changes (e.g. avatar upload, profile update)
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await api.get('/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
          localStorage.setItem('user', JSON.stringify(res.user));
          if (res.token) {
            localStorage.setItem('token', res.token);
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (err) {
        if (!token) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password, portal) => {
    // Purge any residual or previous session state before logging in
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);

    const payload = portal ? { email, password, portal } : { email, password };
    const res = await api.post('/auth/login', payload);
    if (res.success && (res.token || res.session_token)) {
      const userRole = res.user?.role_name || res.user?.role;

      // Client-side defense-in-depth portal isolation check
      if (portal && userRole && userRole !== 'system_admin') {
        const portalAllowedRoles = {
          student: ['student'],
          institution: ['institution', 'institution_staff'],
          organization: ['hiring_organization', 'workplace_mentor', 'mentor', 'hr_staff'],
        };
        const allowedForPortal = portalAllowedRoles[portal];
        if (allowedForPortal && !allowedForPortal.includes(userRole)) {
          const portalNames = {
            student: 'Student Login Portal',
            institution: 'Institution Login Portal',
            organization: 'Hiring Organization Login Portal',
          };
          const correctPortalName =
            userRole === 'student'
              ? 'Student Login Portal (/login/student)'
              : ['institution', 'institution_staff'].includes(userRole)
                ? 'Institution Login Portal (/login/institution)'
                : 'Hiring Organization Login Portal (/login/organization)';
          try {
            await api.post('/auth/logout');
          } catch (_) {}
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          return {
            success: false,
            message: `Access Denied: This account is not authorized to sign in through the ${portalNames[portal] || portal}. Please use the ${correctPortalName}.`,
          };
        }
      }

      const activeToken = res.token || res.session_token;
      localStorage.setItem('token', activeToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
      return { success: true, user: res.user };
    }
    return { success: false, message: res.message || 'Login failed' };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const getDashboardUrl = (role) => {
    switch (role) {
      case 'student':
        return '/dashboard/student';
      case 'hiring_organization':
      case 'workplace_mentor':
      case 'mentor':
      case 'hr_staff':
        return '/dashboard/organization';
      case 'institution':
      case 'institution_staff':
        return '/dashboard/institution';
      case 'system_admin':
        return '/dashboard/admin';
      default:
        return '/dashboard/organization';
    }
  };

  const getLoginUrl = (role) => {
    switch (role) {
      case 'student':
        return '/login/student';
      case 'institution':
      case 'institution_staff':
        return '/login/institution';
      case 'hiring_organization':
      case 'workplace_mentor':
      case 'mentor':
      case 'hr_staff':
        return '/login/organization';
      default:
        return '/login/student';
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading, getDashboardUrl, getLoginUrl }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
