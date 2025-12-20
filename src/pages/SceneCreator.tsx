import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import { makeAuthenticatedRequest } from "../utils/Auth";
import { SceneContent } from "../components/scene/SceneContent";
import { ARContent, ARContentRef } from "../components/ar/ARContent";
import { ARPlacementController } from "../components/ar/ARPlacementController";
import { ARSceneManager } from "../ar/ARSceneManager";

const xrStore = createXRStore();

interface DigitalHome {
  id: number;
  name: string;
  home_id: number;
  deployedItems: Array<{ id: string; is_container: boolean }>;
  spatialData: {
    id: number;
    positions: any;
    rotation: any;
    scale: any;
    boundary: {
      min_x: number;
      max_x: number;
      min_y: number;
      max_y: number;
      min_z: number;
      max_z: number;
    };
  };
  texture_id: number | null;
  created_at: string;
  updated_at: string;
}

type XRMode = "vr" | "ar";

export function SceneCreator() {
  const { homeId } = useParams<{ homeId: string }>();
  const navigate = useNavigate();
  const [digitalHome, setDigitalHome] = useState<DigitalHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xrMode, setXRMode] = useState<XRMode>("vr");
  const [arManager, setARManager] = useState<ARSceneManager | null>(null);
  const [arSupported, setARSupported] = useState<boolean | null>(null);
  const arContentRef = useRef<ARContentRef>(null);

  useEffect(() => {
    if (!homeId) {
      navigate('/');
      return;
    }

    const loadDigitalHome = async () => {
      try {
        const response = await makeAuthenticatedRequest(`/digitalhomes/get_digital_home/${homeId}/`);
        
        if (response.ok) {
          const data = await response.json();
          setDigitalHome(data.digital_home);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load digital home');
        }
      } catch (error) {
        console.error('Error loading digital home:', error);
        setError(error instanceof Error ? error.message : 'Failed to load digital home');
      } finally {
        setLoading(false);
      }
    };

    loadDigitalHome();
  }, [homeId, navigate]);

  // Check AR support
  useEffect(() => {
    const checkARSupport = async () => {
      if (navigator.xr && navigator.xr.isSessionSupported) {
        try {
          const supported = await navigator.xr.isSessionSupported("immersive-ar");
          setARSupported(supported);
        } catch (error) {
          console.warn("AR support check failed:", error);
          setARSupported(false);
        }
      } else {
        setARSupported(false);
      }
    };

    checkARSupport();
  }, []);

  const handleARReady = (manager: ARSceneManager) => {
    setARManager(manager);
  };

  const handleARError = (error: Error) => {
    console.error("AR Error:", error);
    setError(`AR Error: ${error.message}`);
  };

  // Handle mode toggle
  const handleEnterVR = () => {
    setXRMode("vr");
    xrStore.enterVR().catch((err) => console.warn("Failed to enter VR:", err));
  };

  const handleEnterAR = async () => {
    setXRMode("ar");
    try {
      if (arContentRef.current) {
        await arContentRef.current.startAR();
      }
    } catch (error) {
      console.error("Failed to start AR:", error);
      setError(error instanceof Error ? error.message : "Failed to start AR");
    }
  };

  if (loading) {
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
            margin: '0 auto 1rem',
          }} />
          <p>Loading scene editor...</p>
        </div>
      </div>
    );
  }

  if (error || !digitalHome) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        color: '#1e293b',
        flexDirection: 'column',
      }}>
        <h2 style={{ color: '#f87171', marginBottom: '1rem' }}>Error Loading Scene</h2>
        <p style={{ marginBottom: '2rem' }}>{error || 'Digital home not found'}</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '8px',
            color: '#1e293b',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas 
        style={{ width: "100vw", height: "100vh", position: "fixed" }}
        gl={{ 
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: true
        }}
        onCreated={({ gl }) => {
          const originalSetSize = gl.setSize.bind(gl);
          gl.setSize = function(width: number, height: number, updateStyle?: boolean) {
            if (!gl.xr.isPresenting) {
              return originalSetSize(width, height, updateStyle);
            }
            return;
          };
        }}
      >
        <XR store={xrStore}>
          {xrMode === "vr" && homeId && (
            <SceneContent homeId={homeId} digitalHome={digitalHome} />
          )}
          {xrMode === "ar" && homeId && (
            <>
              <ARContent 
                ref={arContentRef}
                homeId={homeId} 
                onARReady={handleARReady}
                onARError={handleARError}
              />
              <ARPlacementController arManager={arManager} />
            </>
          )}
        </XR>
      </Canvas>

      <div style={{ 
        position: "fixed", 
        width: "100vw", 
        height: "100vh", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "flex-end", 
        gap: "10px",
        pointerEvents: "none" 
      }}>
        <button
          style={{ 
            marginBottom: 20, 
            padding: "12px 24px", 
            backgroundColor: xrMode === "vr" ? "#4CAF50" : "#666", 
            color: "#1e293b", 
            border: "none", 
            borderRadius: 8, 
            cursor: "pointer", 
            pointerEvents: "auto",
            fontWeight: xrMode === "vr" ? "bold" : "normal"
          }}
          onClick={handleEnterVR}
        >
          Enter VR
        </button>
        {arSupported && (
          <button
            style={{ 
              marginBottom: 20, 
              padding: "12px 24px", 
              backgroundColor: xrMode === "ar" ? "#2196F3" : "#666", 
              color: "#fff", 
              border: "none", 
              borderRadius: 8, 
              cursor: "pointer", 
              pointerEvents: "auto",
              fontWeight: xrMode === "ar" ? "bold" : "normal"
            }}
            onClick={handleEnterAR}
          >
            Enter AR
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}