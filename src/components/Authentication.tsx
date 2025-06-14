import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface AuthFormProps {
  onAuthenticated: () => void;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

interface LoginData {
  username: string;
  password: string;
}

interface ResetData {
  email: string;
  lastIdentityNumberDigits: string;
}

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

export class AuthUtils {
  // Extract bearer token from cookies
  static getBearerToken(): string | null {
    const cookies = document.cookie.split(';');
    console.log('Raw cookies:', document.cookie);
    
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith('s2_utoken=')) {
        const token = trimmed.substring('s2_utoken='.length);
        console.log('Found bearer token:', token.substring(0, 20) + '...');
        return token;
      }
    }
    
    console.log('No bearer token found in cookies');
    return null;
  }

  // Check if user is authenticated by checking for bearer token
  static checkAuthStatus(): boolean {
    const token = this.getBearerToken();
    const hasToken = !!token;
    console.log('Auth status:', hasToken);
    return hasToken;
  }

  // Clear all authentication cookies
  static clearAuthCookies(): void {
    const cookies = ['s2_utoken', 's2_uid', 's2_uname'];
    cookies.forEach(cookieName => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
  }

  // Use Supabase Edge Function for proxy requests
  static async makeProxyRequest(endpoint: string, data?: any, method = 'POST'): Promise<any> {
    try {
      console.log('Making proxy request to:', endpoint, 'with data:', data);
      
      const response = await supabase.functions.invoke('salesys-proxy', {
        body: {
          url: endpoint,
          method: method,
          data: data,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      });
      
      console.log('Edge function response:', response);
      
      if (response.error) {
        console.error('Edge function error:', response.error);
        throw new Error(`Proxy request failed: ${response.error.message}`);
      }
      
      return response.data;
      
    } catch (error) {
      console.error('Proxy request failed:', error);
      throw error;
    }
  }

  // Login function
  static async login(loginData: LoginData): Promise<boolean> {
    try {
      console.log('Attempting login with:', loginData.username);
      
      const response = await supabase.functions.invoke('salesys-proxy', {
        body: {
          url: 'https://app.salesys.se/api/users/login-v1',
          method: 'POST',
          data: loginData,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      });
      
      console.log('Login response:', response);
      
      if (response.error) {
        console.error('Login error:', response.error);
        throw new Error(`Login failed: ${response.error.message}`);
      }
      
      // Try to parse response data as JSON first (for login with bearer token)
      let responseData = response.data;
      let bearerToken = null;
      
      try {
        const parsedData = JSON.parse(response.data);
        if (parsedData.status && parsedData.bearerToken) {
          responseData = parsedData.status;
          bearerToken = parsedData.bearerToken;
          console.log('Bearer token found in response data:', bearerToken.substring(0, 20) + '...');
        }
      } catch (e) {
        // Response is not JSON, use as is
        console.log('Response is not JSON, using as string');
      }
      
      // Check if we got a successful response
      if (responseData === "OK") {
        console.log('Login response was OK, checking for bearer token...');
        
        if (bearerToken) {
          localStorage.setItem('salesys_bearer_token', bearerToken);
          return true;
        } else {
          console.log('No bearer token in response data, waiting for cookies...');
          
          // Wait for cookies to be set and try to extract token
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const token = this.getBearerToken();
          if (token) {
            localStorage.setItem('salesys_bearer_token', token);
            console.log('Bearer token extracted from cookies and stored');
            return true;
          } else {
            console.log('No bearer token found in cookies either');
            return false;
          }
        }
      } else {
        console.log('Login failed - response was not OK:', responseData);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Password reset function
  static async resetPassword(resetData: ResetData): Promise<boolean> {
    try {
      const responseData = await this.makeProxyRequest(
        'https://app.salesys.se/api/users/password-reset-v1/request',
        resetData
      );
      
      return !!responseData; // Convert to boolean
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }
}

// ============================================================================
// PROTECTED ROUTE COMPONENT
// ============================================================================

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// ============================================================================
// MAIN AUTH FORM COMPONENT
// ============================================================================

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthenticated }) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Login form state
  const [loginData, setLoginData] = useState<LoginData>({
    username: '',
    password: ''
  });
  
  // Password reset form state
  const [resetData, setResetData] = useState<ResetData>({
    email: '',
    lastIdentityNumberDigits: ''
  });

  // Only check auth status on mount - no interval checks
  useEffect(() => {
    const hasAuthToken = AuthUtils.checkAuthStatus();
    console.log('Initial auth check:', hasAuthToken);
    setIsLoggedIn(hasAuthToken);
    if (hasAuthToken) {
      onAuthenticated();
      navigate('/');
    }
  }, [onAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return; // Prevent double submissions
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Attempting login...');
      const success = await AuthUtils.login(loginData);
      
      if (success) {
        console.log('Login successful with bearer token detected');
        setIsLoggedIn(true);
        setSuccess('Successfully logged in!');
        setLoginData({ username: '', password: '' });
        
        // Call onAuthenticated and navigate immediately
        onAuthenticated();
        navigate('/', { replace: true });
      } else {
        console.log('Login failed - no bearer token detected');
        setError('Login failed. Authentication token could not be obtained. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      const success = await AuthUtils.resetPassword(resetData);
      
      if (success) {
        setSuccess('Password reset email sent! Please check your inbox.');
        setResetData({ email: '', lastIdentityNumberDigits: '' });
        setShowResetPassword(false);
        setShowLogin(true);
      } else {
        setError('Password reset failed. Please check your details.');
      }
    } catch (error) {
      setError('Password reset failed. Please try again.');
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    AuthUtils.clearAuthCookies();
    localStorage.removeItem('salesys_bearer_token');
    setIsLoggedIn(false);
    setSuccess('Successfully logged out!');
    navigate('/login');
  };

  // If user is logged in, show logged in state
  if (isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md min-w-80 mx-auto bg-white rounded-xl shadow-md border" style={{fontFamily: 'Nunito, sans-serif', padding: '2rem 3rem'}}>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-light text-gray-900 mb-2" style={{ fontSize: window.innerWidth < 768 ? '1.4rem' : undefined }}>Välkommen tillbaka!</h2>
            <p className="text-gray-600 mb-6 font-light">Du är inloggad.</p>
            
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleLogout}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition duration-200"
            >
              Logga ut
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md min-w-80 mx-auto bg-white rounded-xl shadow-md border" style={{fontFamily: 'Nunito, sans-serif', padding: '2rem 3rem'}}>
        {/* Header */}
        <div className="text-center mb-6">
          <img 
            src="https://salesys.se/wp-content/uploads/2021/09/cropped-salesys-512.png" 
            alt="Salesys Logo" 
            className="w-8 h-8 mx-auto mb-4 border-0"
          />
          <h2 className="text-xl md:text-2xl font-light text-gray-900" style={{ fontSize: window.innerWidth < 768 ? '1.4rem' : undefined }}>
            {showResetPassword ? 'Återställ lösenord' : 'Välkommen till SaleSys'}
          </h2>
          <p className="text-gray-600 mt-2 font-light">
            {showResetPassword 
              ? 'Ange din e-post och organisationsnummer' 
              : 'Logga in på ditt konto'
            }
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Login Form */}
        {showLogin && !showResetPassword && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Användarnamn
              </label>
              <input
                type="text"
                id="username"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Lösenord
              </label>
              <input
                type="password"
                id="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !loginData.username || !loginData.password}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>
        )}

        {/* Password Reset Form */}
        {showResetPassword && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-post
              </label>
              <input
                type="email"
                id="email"
                value={resetData.email}
                onChange={(e) => setResetData({...resetData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                placeholder="E-post"
              />
            </div>
            
            <div>
              <label htmlFor="digits" className="block text-sm font-medium text-gray-700 mb-1">
                Sista 5 siffror av organisationsnummer
              </label>
              <input
                type="text"
                id="digits"
                value={resetData.lastIdentityNumberDigits}
                onChange={(e) => setResetData({...resetData, lastIdentityNumberDigits: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                placeholder="00000"
                maxLength={5}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !resetData.email || !resetData.lastIdentityNumberDigits}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? 'Skickar...' : 'Skicka återställning'}
            </button>
          </form>
        )}

        {/* Toggle between forms */}
        <div className="mt-6 text-center">
          {!showResetPassword ? (
            <button
              type="button"
              onClick={() => {
                setShowResetPassword(true);
                setError('');
                setSuccess('');
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Glömt lösenord?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowResetPassword(false);
                setError('');
                setSuccess('');
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Tillbaka till inloggning
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// AUTHENTICATION HOOK
// ============================================================================

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Only check once on mount
    const hasAuthToken = AuthUtils.checkAuthStatus();
    console.log('useAuth hook - Initial auth status:', hasAuthToken);
    setIsAuthenticated(hasAuthToken);
    setIsCheckingAuth(false);
  }, []);

  const handleAuthenticated = () => {
    console.log('handleAuthenticated called');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isCheckingAuth,
    handleAuthenticated,
    handleLogout
  };
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default AuthForm;

// EOF
