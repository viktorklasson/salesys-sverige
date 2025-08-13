
import React from 'react';
import Dashboard from '@/components/Dashboard';
import { AudioIndicator } from '@/components/AudioIndicator';

const Index = () => {
  const handleStatisticsClick = (statType: 'avtal' | 'samtal' | 'ordrar') => {
    console.log('Statistics clicked:', statType);
    // TODO: Navigate to statistics view or handle statistics display
  };

  return (
    <>
      <Dashboard onStatisticsClick={handleStatisticsClick} />
      <AudioIndicator />
    </>
  );
};

export default Index;
