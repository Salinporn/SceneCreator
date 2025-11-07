import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyLoginToken } from '../../utils/Auth';
const DIGITAL_HOME_PLATFORM_BASE_URL = import.meta.env.VITE_DIGITAL_HOME_PLATFORM_URL;

export function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying authentication...');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('No authentication token provided');
      return;
    }

    console.log('🔐 Verifying token...');
    
    verifyLoginToken(token).then((result) => {
      if (result) {
        setStatus('success');
        setMessage(`Welcome, ${result.username}!`);
        
        // Redirect to main app after 1.5 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
      } else {
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
      }
    });
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        padding: '3rem',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '90%',
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(59, 130, 246, 0.3)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }} />
            <h2 style={{ color: '#1e293b', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
              Authenticating
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem' }}>
              {message}
            </p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              fontSize: '2rem',
            }}>
              ✓
            </div>
            <h2 style={{ color: '#1e293b', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
              Success!
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem' }}>
              {message}
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', marginTop: '1rem' }}>
              Redirecting to  My Home...
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              fontSize: '2rem',
              color: '#1e293b',
            }}>
              ✕
            </div>
            <h2 style={{ color: '#1e293b', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
              Authentication Failed
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              {message}
            </p>
            <a
              href={DIGITAL_HOME_PLATFORM_BASE_URL}
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: '#3b82f6',
                color: '#1e293b',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              Return to Digital Home
            </a>
          </>
        )}
        
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}