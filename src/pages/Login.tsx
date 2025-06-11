
import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthForm } from '@/components/Authentication';

interface LoginProps {
  isAuthenticated?: boolean;
}

const Login: React.FC<LoginProps> = ({ isAuthenticated }) => {
  const handleAuthenticated = () => {
    // Redirect will happen via the parent component
    window.location.href = '/';
  };

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <AuthForm onAuthenticated={handleAuthenticated} />;
};

export default Login;
