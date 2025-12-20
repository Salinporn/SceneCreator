import { useEffect, useRef } from "react";
import { useXR } from "@react-three/xr";
import { ARSceneManager } from "../../ar/ARSceneManager";
import { ARHitTestResult } from "../../ar/types";
import * as THREE from "three";
import { ARPlacementControllerLogic } from "../../ar/logic/ARPlacementControllerLogic";
import { SelectedFurniture } from "../../ar/types/ARSceneTypes";

interface ARPlacementControllerProps {
  arManager: ARSceneManager | null;
  selectedFurniture: SelectedFurniture | null;
  onPlaceObject?: (hitResult: ARHitTestResult, object: THREE.Object3D) => void;
  onObjectPlaced?: (objectId: string) => void;
}

// AR Placement Controller component - for object placement
export function ARPlacementController({
  arManager,
  selectedFurniture,
  onPlaceObject,
  onObjectPlaced
}: ARPlacementControllerProps) {
  const { session } = useXR();
  const logicRef = useRef<ARPlacementControllerLogic | null>(null);
  const callbacksRef = useRef({ onPlaceObject, onObjectPlaced });

  useEffect(() => {
    callbacksRef.current = { onPlaceObject, onObjectPlaced };
    if (logicRef.current) {
      logicRef.current.updateCallbacks(callbacksRef.current);
    }
  }, [onPlaceObject, onObjectPlaced]);

  useEffect(() => {
    logicRef.current = new ARPlacementControllerLogic(arManager, selectedFurniture, callbacksRef.current);

    if (arManager) {
      logicRef.current.setARManager(arManager);
    }

    return () => {
      if (logicRef.current) {
        logicRef.current.cleanup();
        logicRef.current = null;
      }
    };
  }, [arManager, selectedFurniture]);

  // Update AR manager when it changes
  useEffect(() => {
    if (logicRef.current) {
      logicRef.current.setARManager(arManager);
    }
  }, [arManager]);

  // Update selected furniture when it changes
  useEffect(() => {
    if (logicRef.current) {
      logicRef.current.setSelectedFurniture(selectedFurniture);
    }
  }, [selectedFurniture]);

  useEffect(() => {
    if (logicRef.current) {
      logicRef.current.setupSessionListeners(session ?? null);
    }

    return () => {
      if (logicRef.current) {
        logicRef.current.setupSessionListeners(null);
      }
    };
  }, [session, arManager, selectedFurniture]);

  useEffect(() => {
    if (!arManager || !logicRef.current) return;

    arManager.setFrameCallback((frame: XRFrame) => {
      logicRef.current?.setFrameCallback(frame);
    });
  }, [arManager]);

  return null;
}
