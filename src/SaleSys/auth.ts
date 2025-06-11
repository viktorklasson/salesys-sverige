
const PROXY_URL = 'https://salesys.se/api/v2/proxy.php';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    fullName: string;
    organizationId: string;
    teamId: string;
  };
  error?: string;
}

class SalesysAuth {
  // Make proxy request using new proxy endpoint
  private async makeProxyRequest(endpoint: string, data: any): Promise<any> {
    const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(endpoint)}`;
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Check if user is authenticated by checking cookies
  isAuthenticated(): boolean {
    // Check for SaleSys session cookie
    const cookies = document.cookie.split(';');
    return cookies.some(cookie => 
      cookie.trim().startsWith('s2_utoken=') && 
      cookie.trim().length > 's2_utoken='.length
    );
  }

  // Get current user info from cookies/session
  getCurrentUser(): any {
    if (!this.isAuthenticated()) {
      return null;
    }

    // Try to get user info from localStorage (if stored during login)
    const userInfo = localStorage.getItem('salesys_user_info');
    if (userInfo) {
      try {
        return JSON.parse(userInfo);
      } catch (e) {
        console.error('Error parsing user info from localStorage:', e);
      }
    }

    return { authenticated: true }; // Basic auth state
  }

  // Login method
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const loginUrl = 'https://app.salesys.se/api/users/login-v1';
      
      const response = await this.makeProxyRequest(loginUrl, {
        username: credentials.username,
        password: credentials.password
      });

      if (response && response.user) {
        // Store user info in localStorage for easy access
        localStorage.setItem('salesys_user_info', JSON.stringify(response.user));
        
        return {
          success: true,
          user: response.user
        };
      } else {
        return {
          success: false,
          error: 'Ogiltiga inloggningsuppgifter'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Inloggning misslyckades. Kontrollera dina uppgifter och försök igen.'
      };
    }
  }

  // Logout method
  async logout(): Promise<void> {
    try {
      // Clear localStorage
      localStorage.removeItem('salesys_user_info');
      localStorage.removeItem('salesys_bearer_token');

      // Clear cookies by setting them to expire
      document.cookie = 's2_utoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.salesys.se;';
      document.cookie = 's2_utoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

      // Optional: Make logout API call if available
      // const logoutUrl = 'https://app.salesys.se/api/users/logout-v1';
      // await this.makeProxyRequest(logoutUrl, {});

    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    }
  }
}

export const salesysAuth = new SalesysAuth();
