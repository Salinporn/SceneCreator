import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { checkAuth, isAuthenticated } from '../../utils/Auth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // First check localStorage for quick response
    const localAuth = isAuthenticated();
    
    if (!localAuth) {
      setChecking(false);
      setAuthenticated(false);
      return;
    }
    
    // Then verify with server
    checkAuth().then((result) => {
      setAuthenticated(result.logged_in);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        color: '#1e293b',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(59, 130, 246, 0.3)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }} />
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}