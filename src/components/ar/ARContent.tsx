import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { ARSceneManager } from "../../ar/ARSceneManager";

interface ARContentProps {
  onARReady?: (arManager: ARSceneManager) => void;
  onARError?: (error: Error) => void;
}

export interface ARContentRef {
  startAR: () => Promise<void>;
  isInitialized: () => boolean;
}

export const ARContent = forwardRef<ARContentRef, ARContentProps>(
  ({ onARReady, onARError }, ref) => {
    const { scene, gl } = useThree();
    const arManagerRef = useRef<ARSceneManager | null>(null);
    const isInitializedRef = useRef(false);
    const isInitializingRef = useRef(false);
    const currentFrameRef = useRef<XRFrame | null>(null);

    useImperativeHandle(ref, () => ({
      startAR: async () => {
        if (isInitializedRef.current || isInitializingRef.current) {
          console.warn("AR session already initialized or initializing");
          return;
        }

        isInitializingRef.current = true;

        try {
          if (!navigator.xr || !navigator.xr.isSessionSupported) {
            throw new Error("WebXR AR is not supported in this browser");
          }

          const isSupported = await navigator.xr.isSessionSupported("immersive-ar");
          if (!isSupported) {
            throw new Error("AR sessions are not supported on this device");
          }

          if (!arManagerRef.current) {
            arManagerRef.current = new ARSceneManager(scene);
          }

          await arManagerRef.current.initialize(gl);

          arManagerRef.current.setFrameCallback((frame: XRFrame) => {
            currentFrameRef.current = frame;
          });

          isInitializedRef.current = true;
          isInitializingRef.current = false;

          if (onARReady && arManagerRef.current) {
            onARReady(arManagerRef.current);
          }

          const objectGroup = arManagerRef.current.getObjectGroup();
          if (!scene.getObjectByName("ARPlacedObjects")) {
            scene.add(objectGroup);
          }
        } catch (error) {
          isInitializingRef.current = false;
          console.error("Failed to initialize AR:", error);
          if (onARError) {
            onARError(error instanceof Error ? error : new Error(String(error)));
          }
          throw error;
        }
      },
      isInitialized: () => isInitializedRef.current
    }));

    useEffect(() => {
      return () => {
        if (arManagerRef.current) {
          arManagerRef.current.dispose();
          arManagerRef.current = null;
          isInitializedRef.current = false;
          isInitializingRef.current = false;
        }
      };
    }, []);

    useFrame((_state, _delta, frame) => {
      if (arManagerRef.current && frame) {
        arManagerRef.current.updateFrame(frame as XRFrame);
      }
    });

    return (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
      </>
    );
  }
);

