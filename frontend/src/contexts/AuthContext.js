import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        
        // Check if token is expired
        if (decodedToken.exp * 1000 < Date.now()) {
          logout();
        } else {
          const storedProfileImage = localStorage.getItem('userProfileImage');
          setUser({
            username: decodedToken.sub,
            role: decodedToken.role,
            profileImage: storedProfileImage || null
          });
          // Set default Authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Fetch fresh user profile (includes profileImage) to hydrate on refresh
          axios.get('/api/auth/me')
            .then(res => {
              const me = res.data?.data;
              if (me) {
                setUser(prev => ({
                  ...prev,
                  fullName: me.fullName,
                  email: me.email,
                  profileImage: me.profileImage || prev?.profileImage || null
                }));
                if (me.profileImage) {
                  localStorage.setItem('userProfileImage', me.profileImage);
                }
              }
            })
            .catch(() => {/* ignore */});
        }
      } catch (error) {
        console.error('Invalid token:', error);
        logout();
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      // Extract data from ApiResponse wrapper
  const { data: responseData } = response.data;
  const { token: newToken } = responseData;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      
      const decodedToken = jwtDecode(newToken);
      setUser({
        username: decodedToken.sub,
        role: decodedToken.role,
        fullName: responseData.fullName,
        email: responseData.email,
        // Include profile image if backend starts returning it
        profileImage: responseData.profileImage || responseData.profileImageUrl
      });

      // Persist profile image for reloads
      const img = responseData.profileImage || responseData.profileImageUrl;
      if (img) {
        localStorage.setItem('userProfileImage', img);
      } else {
        localStorage.removeItem('userProfileImage');
      }

      // Set default Authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

  return { success: true, user: { username: decodedToken.sub, role: decodedToken.role, fullName: responseData.fullName, email: responseData.email, profileImage: responseData.profileImage || responseData.profileImageUrl } };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      // If a FormData is passed, use multipart endpoint
      const isFormData = typeof FormData !== 'undefined' && userData instanceof FormData;
      const url = isFormData ? '/api/auth/register-multipart' : '/api/auth/register';
      const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;

      const response = await axios.post(url, userData, config);
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userProfileImage');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const getAuthToken = () => {
    return token;
  };

  const refreshUser = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      const me = res.data?.data;
      if (me) {
        setUser(prev => ({
          ...prev,
          username: me.username || prev?.username,
          role: me.role || prev?.role,
          fullName: me.fullName || prev?.fullName,
          email: me.email || prev?.email,
          profileImage: me.profileImage || prev?.profileImage,
        }));
        if (me.profileImage) {
          localStorage.setItem('userProfileImage', me.profileImage);
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    getAuthToken,
  refreshUser,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isCashier: user?.role === 'cashier'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};