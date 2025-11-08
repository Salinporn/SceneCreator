import * as React from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";

export function VRSlider({ 
  show, 
  value, 
  onChange, 
  label, 
  min = 0, 
  max = 1, 
  position = [0, 0, 0], 
  showDegrees = false 
}: any) {
  const [isDragging, setIsDragging] = React.useState(false);
  const trackRef = React.useRef<THREE.Mesh>(null);
  if (!show) return null;

  const handleSliderInteraction = (e: ThreeEvent<PointerEvent>) => {
    if (!trackRef.current || !e.point) return;
    const trackMatrix = trackRef.current.matrixWorld;
    const inverseTrackMatrix = new THREE.Matrix4().copy(trackMatrix).invert();
    const localPoint = e.point.clone().applyMatrix4(inverseTrackMatrix);
    const normalizedX = (localPoint.x + 0.4) / 0.8;
    const clampedX = Math.max(0, Math.min(1, normalizedX));
    const newValue = min + clampedX * (max - min);
    onChange(newValue);
  };

  const sliderPosition = ((value - min) / (max - min)) * 0.8 - 0.4;
  const displayValue = showDegrees ? ((value * 180) / Math.PI).toFixed(0) + "°" : value.toFixed(2);

  return (
    <group position={position}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1, 0.3]} />
        <meshStandardMaterial color="#2c3e50" opacity={0.9} transparent />
      </mesh>

      <Text position={[0, 0.1, 0]} fontSize={0.04} color="#ffffff" anchorX="center" anchorY="middle">
        {label}: {displayValue}
      </Text>

      <mesh
        ref={trackRef}
        position={[0, -0.05, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsDragging(true);
          handleSliderInteraction(e);
        }}
        onPointerUp={() => setIsDragging(false)}
        onPointerMove={(e) => {
          if (isDragging) {
            e.stopPropagation();
            handleSliderInteraction(e);
          }
        }}
        onPointerLeave={() => setIsDragging(false)}
      >
        <boxGeometry args={[0.8, 0.02, 0.01]} />
        <meshStandardMaterial color="#34495e" />
      </mesh>

      <mesh position={[sliderPosition, -0.05, 0.01]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#3498db" />
      </mesh>
    </group>
  );
}