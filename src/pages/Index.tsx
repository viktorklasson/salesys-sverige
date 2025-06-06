
import React, { useState, useEffect } from 'react';
import { salesysApi } from '@/services/salesysApi';
import AuthForm from '@/components/AuthForm';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const token = salesysApi.getBearerToken();
    if (token) {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleStatisticsClick = (statType: 'avtal' | 'samtal' | 'ordrar') => {
    console.log('Statistics clicked:', statType);
    // TODO: Navigate to statistics view or handle statistics display
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Laddar...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm onAuthenticated={handleAuthenticated} />;
  }

  return <Dashboard onStatisticsClick={handleStatisticsClick} />;
};

export default Index;
