
// SaleSys API and Authentication Module
// This module provides a complete integration with the SaleSys platform

// Export API service and types
export { salesysApi } from './api';
export type {
  Offer,
  Call,
  Order,
  DialGroup,
  DialGroupSummary,
  Tag,
  StatisticsData,
  User,
  Team,
  Dashboard,
  DashboardResult
} from './api';

// Export authentication service and types
export { salesysAuth } from './auth';
export type {
  LoginCredentials,
  LoginResponse
} from './auth';
