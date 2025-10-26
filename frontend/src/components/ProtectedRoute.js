import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    // Special handling: customer-only routes should block admin and cashier explicitly
    if (requiredRole === 'customer') {
      if (user?.role === 'admin' || user?.role === 'cashier') {
        return <Navigate to="/" replace />;
      }
      // For customer routes, any authenticated non-admin, non-cashier user is allowed
      return children;
    }

    // Default behavior: Allow admin to access all other protected routes
    if (user?.role === 'admin') {
      return children;
    }

    // Check if user has the required role
    if (user?.role !== requiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;