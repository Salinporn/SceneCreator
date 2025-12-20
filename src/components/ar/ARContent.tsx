import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { ARSceneManager } from "../../ar/ARSceneManager";
import { ARContentLogic } from "../../ar/logic/ARContentLogic";
import { Furniture } from "../../ar/types/Furniture";

interface ARContentProps {
  onARReady?: (arManager: ARSceneManager) => void;
  onARError?: (error: Error) => void;
  onFurnitureCatalogLoaded?: (catalog: Furniture[], modelCache: Map<number, string>) => void;
  onCatalogLoadingChange?: (loading: boolean) => void;
}

export interface ARContentRef {
  startAR: () => Promise<void>;
  isInitialized: () => boolean;
  getARManager: () => ARSceneManager | null;
}

// AR Content component - for AR session management
export const ARContent = forwardRef<ARContentRef, ARContentProps>(
  ({ onARReady, onARError, onFurnitureCatalogLoaded, onCatalogLoadingChange }, ref) => {
    const { scene, gl } = useThree();
    const logicRef = useRef<ARContentLogic | null>(null);
    
    const callbacksRef = useRef({
      onARReady,
      onARError,
      onFurnitureCatalogLoaded,
      onCatalogLoadingChange
    });

    useEffect(() => {
      callbacksRef.current = {
        onARReady,
        onARError,
        onFurnitureCatalogLoaded,
        onCatalogLoadingChange
      };
      if (logicRef.current) {
        logicRef.current.updateCallbacks(callbacksRef.current);
      }
    }, [onARReady, onARError, onFurnitureCatalogLoaded, onCatalogLoadingChange]);

    useEffect(() => {
      logicRef.current = new ARContentLogic(scene, callbacksRef.current);

      logicRef.current.initializeCatalog();

      return () => {
        if (logicRef.current) {
          logicRef.current.dispose();
          logicRef.current = null;
        }
      };
    }, [scene]);

    useImperativeHandle(ref, () => ({
      startAR: async () => {
        if (logicRef.current) {
          await logicRef.current.startAR(gl);
        }
      },
      isInitialized: () => {
        return logicRef.current?.getIsInitialized() ?? false;
      },
      getARManager: () => {
        return logicRef.current?.getARManager() ?? null;
      }
    }));

    useFrame((_state, _delta, frame) => {
      if (logicRef.current && frame) {
        logicRef.current.updateFrame(frame as XRFrame);
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
