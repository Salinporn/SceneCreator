import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { makeAuthenticatedRequest } from '../../utils/Auth';
import { useFloorAlignment, alignToFloor } from '../../utils/FloorAlignment';

export function HomeModel({ homeId }: { homeId: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the floor alignment hook from utilities
  useFloorAlignment(groupRef, !loading && !error);

  useEffect(() => {
    const loadHomeModel = async () => {
      try {
        const response = await makeAuthenticatedRequest(`/digitalhomes/download_digital_home/${homeId}/`);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setModelUrl(url);
        } else {
          console.error('Failed to load home model');
          setError('Failed to load home model');
        }
      } catch (error) {
        console.error('Error loading home model:', error);
        setError('Error loading home model');
      } finally {
        setLoading(false);
      }
    };

    loadHomeModel();

    return () => {
      if (modelUrl) {
        URL.revokeObjectURL(modelUrl);
      }
    };
  }, [homeId]);

  if (loading) {
    return (
      <group position={[0, 1, 0]}>
        <mesh>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshBasicMaterial color="#4CAF50" wireframe />
        </mesh>
      </group>
    );
  }

  if (error || !modelUrl) {
    return (
      <group position={[0, 1, 0]}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#f44336" />
        </mesh>
      </group>
    );
  }

  return <HomeModelContent ref={groupRef} url={modelUrl} homeId={homeId} />;
}

const HomeModelContent = React.forwardRef<THREE.Group, { url: string; homeId: string }>(
  ({ url, homeId }, ref) => {
    const internalRef = useRef<THREE.Group>(null);
    const { scene } = useGLTF(url);

    // Combine external and internal refs
    React.useImperativeHandle(ref, () => internalRef.current as THREE.Group);

    useEffect(() => {
      if (!internalRef.current) return;

      // Clone the scene to avoid modifying cached version
      const clonedScene = scene.clone();
      
      // Clear existing children
      internalRef.current.clear();
      
      // Add cloned scene
      internalRef.current.add(clonedScene);
      
      setTimeout(() => {
        if (internalRef.current) {
          alignToFloor(internalRef.current);
        }
      }, 100);
    }, [scene, homeId]);

    return <group ref={internalRef} />;
  }
);