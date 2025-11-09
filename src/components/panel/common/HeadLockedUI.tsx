import * as React from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

// A UI panel that stays locked in front of the user's view in VR
export function HeadLockedUI({
  children,
  distance = 1.5,
  horizontalOffset = 0,
  verticalOffset = 0,
  enabled = true,
}: {
  children: React.ReactNode;
  distance?: number;
  horizontalOffset?: number;
  verticalOffset?: number;
  enabled?: boolean;
}) {
  const groupRef = React.useRef<THREE.Group>(null);
  const camera = useThree((state) => state.camera);

  useFrame(() => {
    if (!enabled || !groupRef.current) return;

    // Get camera world position
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);

    // Get camera forward direction (where the camera is looking)
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    // Get camera right direction for horizontal offset
    const cameraRight = new THREE.Vector3();
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
    cameraRight.normalize();

    // Position the UI in front of the camera
    const uiPosition = cameraPosition.clone();
    uiPosition.addScaledVector(cameraDirection, distance);
    
    // Apply horizontal offset (left/right)
    uiPosition.addScaledVector(cameraRight, horizontalOffset);
    
    // Apply vertical offset (up/down)
    uiPosition.y += verticalOffset;

    groupRef.current.position.copy(uiPosition);

    groupRef.current.lookAt(cameraPosition);
  });

  if (!enabled) return null;

  return <group ref={groupRef}>{children}</group>;
}