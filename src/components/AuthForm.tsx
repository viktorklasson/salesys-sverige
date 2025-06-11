
import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuthFormProps {
  onAuthenticated: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onAuthenticated }) => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Login form state
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  
  // Password reset form state
  const [resetData, setResetData] = useState({
    email: '',
    lastIdentityNumberDigits: ''
  });

  // Check if user is already logged in by checking cookies
  useEffect(() => {
    const checkAuthStatus = () => {
      const cookies = document.cookie.split(';');
      const hasAuthCookie = cookies.some(cookie => 
        cookie.trim().startsWith('s2_utoken=') || 
        cookie.trim().startsWith('s2_uid=')
      );
      setIsLoggedIn(hasAuthCookie);
      if (hasAuthCookie) {
        onAuthenticated();
        navigate('/');
      }
    };
    
    checkAuthStatus();
  }, [onAuthenticated, navigate]);

  // Simple proxy function using query parameter
  const makeProxyRequest = async (endpoint: string, data?: any, method = 'POST') => {
    const proxyUrl = `https://salesys.se/api/v2/proxy.php?url=${encodeURIComponent(endpoint)}`;
    
    try {
      const response = await fetch(proxyUrl, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include' // Important for cookies
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error('Proxy request failed:', error);
      throw error;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await makeProxyRequest(
        'https://app.salesys.se/api/users/login-v1',
        loginData
      );
      
      if (response.ok) {
        // The proxy should forward the Set-Cookie headers
        // The browser will automatically set the cookies
        setIsLoggedIn(true);
        setSuccess('Successfully logged in!');
        setLoginData({ username: '', password: '' });
        onAuthenticated();
        navigate('/');
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (error) {
      setError('Login failed. Please check your connection and try again.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await makeProxyRequest(
        'https://app.salesys.se/api/users/password-reset-v1/request',
        resetData
      );
      
      if (response.ok) {
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
    // Clear all auth cookies
    const cookies = ['s2_utoken', 's2_uid', 's2_uname'];
    cookies.forEach(cookieName => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    setIsLoggedIn(false);
    setSuccess('Successfully logged out!');
    navigate('/login');
  };

  // If user is logged in, show logged in state
  if (isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md border" style={{fontFamily: 'Nunito, sans-serif', padding: '2rem 3rem'}}>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-light text-gray-900 mb-2">Välkommen tillbaka!</h2>
            <p className="text-gray-600 mb-6 font-light">Du är inloggad.</p>
            
            <button
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
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md border" style={{fontFamily: 'Nunito, sans-serif', padding: '2rem 3rem'}}>
        {/* Header */}
        <div className="text-center mb-6">
          <img 
            src="https://salesys.se/wp-content/uploads/2021/09/cropped-salesys-512.png" 
            alt="Salesys Logo" 
            className="w-8 h-8 mx-auto mb-4 border-0"
          />
          <h2 className="text-2xl font-light text-gray-900">
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

export default AuthForm;
