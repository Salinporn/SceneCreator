import * as React from "react";
import { useEffect, useRef } from "react";
import { useXR } from "@react-three/xr";
import * as THREE from "three";
import { ARSceneManager } from "../../ar/ARSceneManager";
import { ARHitTestResult } from "../../ar/types";

interface ARPlacementControllerProps {
  arManager: ARSceneManager | null;
  onPlaceObject?: (hitResult: ARHitTestResult, object: THREE.Object3D) => void;
  testObject?: THREE.Object3D;
}

/**
 * AR Placement Controller
 * Handles object placement via tap/click in AR mode
 */
export function ARPlacementController({
  arManager,
  onPlaceObject,
  testObject
}: ARPlacementControllerProps) {
  const { session } = useXR();
  const currentFrameRef = useRef<XRFrame | null>(null);
  const lastSelectTimeRef = useRef<number>(0);

  // Create a simple test cube if not provided
  const defaultTestObject = React.useMemo(() => {
    if (testObject) return testObject;
    
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.name = "ARTestCube";
    return cube;
  }, [testObject]);

  // Store current frame from AR manager
  useEffect(() => {
    if (!arManager) return;

    // Set up frame callback to store current frame
    arManager.setFrameCallback((frame: XRFrame) => {
      currentFrameRef.current = frame;
    });
  }, [arManager]);

  // Handle tap/click for object placement
  useEffect(() => {
    if (!arManager || !session) return;

    const handleSelect = () => {
      if (!arManager || !currentFrameRef.current) {
        return;
      }

      // Prevent rapid repeated placements
      const now = Date.now();
      if (now - lastSelectTimeRef.current < 500) {
        return;
      }
      lastSelectTimeRef.current = now;

      // Perform hit test using current frame
      const hitResult = arManager.getFirstHitTestResult(currentFrameRef.current);
      if (!hitResult) {
        return;
      }

      // Place test object
      const objectId = `ar-object-${Date.now()}`;
      const placed = arManager.placeObject(hitResult, defaultTestObject, objectId);
      
      if (placed && onPlaceObject) {
        onPlaceObject(hitResult, placed);
      }
    };

    // Listen for select events (tap/click)
    session.addEventListener("select", handleSelect);

    // Also listen for selectstart for better responsiveness
    session.addEventListener("selectstart", () => {
      // Could show visual feedback here
    });

    return () => {
      session.removeEventListener("select", handleSelect);
      session.removeEventListener("selectstart", () => {});
    };
  }, [arManager, session, defaultTestObject, onPlaceObject]);

  return null;
}

