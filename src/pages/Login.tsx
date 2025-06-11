
import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthForm } from '@/components/Authentication';

interface LoginProps {
  isAuthenticated?: boolean;
}

const Login: React.FC<LoginProps> = ({ isAuthenticated }) => {
  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <AuthForm />;
};

export default Login;
