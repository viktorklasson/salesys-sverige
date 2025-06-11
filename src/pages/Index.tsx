
import React from 'react';
import { AuthForm, useAuth } from '@/components/Authentication';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  const { isAuthenticated, isCheckingAuth } = useAuth();

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
    return <AuthForm />;
  }

  return <Dashboard onStatisticsClick={handleStatisticsClick} />;
};

export default Index;
