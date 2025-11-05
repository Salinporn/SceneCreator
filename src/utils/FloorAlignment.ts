import { useEffect } from 'react';
import * as THREE from 'three';

export function useFloorAlignment(
  modelRef: React.RefObject<THREE.Group | THREE.Object3D | null>,
  enabled = true
) {
  useEffect(() => {
    if (!enabled || !modelRef.current) return;

    const timer = setTimeout(() => {
      if (!modelRef.current) return;

      // Calculate the bounding box of the entire model
      const box = new THREE.Box3().setFromObject(modelRef.current);
      
      // Get the minimum Y value (bottom of the model)
      const minY = box.min.y;
      
      // Adjust the position so the bottom is at y=0
      modelRef.current.position.y -= minY;
      
    }, 100);

    return () => clearTimeout(timer);
  }, [enabled, modelRef]);
}

export function getBottomY(object: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(object);
  return box.min.y;
}

export function alignToFloor(object: THREE.Object3D): number {
  const minY = getBottomY(object);
  object.position.y -= minY;
  return minY;
}

export function getObjectHeight(object: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(object);
  return box.max.y - box.min.y;
}

export function getObjectDimensions(object: THREE.Object3D): {
  width: number;
  height: number;
  depth: number;
} {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  
  return {
    width: size.x,
    height: size.y,
    depth: size.z
  };
}