const API_BASE_URL = import.meta.env.API_URL;

export interface AuthResponse {
  logged_in: boolean;
  username?: string;
  user_id?: number;
}

export interface LoginTokenResponse {
  message: string;
  username: string;
  user_id: number;
}

// Verify login token from Digital Home Platform
export async function verifyLoginToken(token: string): Promise<LoginTokenResponse | null> {
  try {
    const formData = new FormData();
    formData.append('token', token);

    const response = await fetch(`${API_BASE_URL}/users/verify_login_token/`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Important: send/receive cookies
    });

    if (response.ok) {
      const data: LoginTokenResponse = await response.json();
      console.log('✅ Token verified, logged in as:', data.username);
      
      // Store user info in localStorage
      localStorage.setItem('username', data.username);
      localStorage.setItem('user_id', data.user_id.toString());
      localStorage.setItem('is_authenticated', 'true');
      
      return data;
    } else {
      const error = await response.json();
      console.error('❌ Token verification failed:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error during token verification:', error);
    return null;
  }
}

// Check authentication status from server
export async function checkAuth(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/is_logged_in/`, {
      credentials: 'include',
    });
    
    if (response.ok) {
      const data: AuthResponse = await response.json();
      
      // Update localStorage based on server response
      if (data.logged_in) {
        localStorage.setItem('is_authenticated', 'true');
        if (data.username) {
          localStorage.setItem('username', data.username);
        }
      } else {
        localStorage.removeItem('is_authenticated');
        localStorage.removeItem('username');
        localStorage.removeItem('user_id');
      }
      
      return data;
    }
    
    return { logged_in: false };
  } catch (error) {
    console.error('❌ Auth check failed:', error);
    return { logged_in: false };
  }
}

// Check if user is authenticated from localStorage
export function isAuthenticated(): boolean {
  return localStorage.getItem('is_authenticated') === 'true';
}

// Get stored username
export function getUsername(): string | null {
  return localStorage.getItem('username');
}

// Logout user
export async function logout(): Promise<void> {
  try {
    console.log('📤 Sending logout request...');
    const response = await fetch(`${API_BASE_URL}/users/logout/`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    if (response.ok) {
      console.log('✅ Logout successful');
    } else {
      console.warn('⚠️ Logout request failed, but continuing...');
    }
  } catch (error) {
    console.error('❌ Logout request error:', error);
  }
  
  // Clear local storage
  localStorage.removeItem('is_authenticated');
  localStorage.removeItem('username');
  localStorage.removeItem('user_id');
  
  console.log('🧹 Local storage cleared');
}

// Make an authenticated API request
export async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      ...options.headers,
    },
  });
}