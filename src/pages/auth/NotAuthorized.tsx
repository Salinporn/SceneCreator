const DIGITAL_HOME_PLATFORM_BASE_URL = import.meta.env.VITE_DIGITAL_HOME_PLATFORM_URL;

export function NotAuthorized() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: 'black',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#1e293b',
        backdropFilter: 'blur(10px)',
        padding: '2rem',
        borderRadius: '16px',
        border: '1px solid #22282C',
        textAlign: 'center',
        maxWidth: '500px',
        width: '90%',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: '#f59e0b',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2.5rem',
        }}>
          🔒
        </div>
        <h1 style={{ color: 'black', marginBottom: '1rem', fontSize: '2rem' }}>
          Access Denied
        </h1>
        <p style={{ color: '#22282C', fontSize: '1rem', marginBottom: '2rem' }}>
          <>
            You need to be signed in to access this page.
            <br />
          </>
          Please sign in to continue.
        </p>
        <a
          href={DIGITAL_HOME_PLATFORM_BASE_URL}
          style={{
            display: 'inline-block',
            padding: '0.6rem 3rem',
            background: 'black',
            color: '#1e293b',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '1rem',
            fontWeight: '500',
            transition: 'background 0.2s',
            width: '80%',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#3A4248'}
          onMouseOut={(e) => e.currentTarget.style.background = 'black'}
        >
          Sign in
        </a>
      </div>
    </div>
  );
}