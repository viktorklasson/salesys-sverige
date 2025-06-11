
import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthForm, useAuth } from '@/components/Authentication';

const Login: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <AuthForm />;
};

export default Login;
