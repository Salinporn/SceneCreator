import * as React from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import { GradientBackground, RoundedPlane } from "./common/PanelElements";

export function VRSlider({
  show,
  value,
  onChange,
  label,
  min = 0,
  max = 1,
  position = [0, 0, 0],
  showDegrees = false,
  onClose
}: any) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);
  const trackRef = React.useRef<THREE.Mesh>(null);

  if (!show) return null;

  const handleSliderInteraction = (e: ThreeEvent<PointerEvent>) => {
    if (!trackRef.current || !e.point) return;
    const trackMatrix = trackRef.current.matrixWorld;
    const inverseTrackMatrix = new THREE.Matrix4().copy(trackMatrix).invert();
    const localPoint = e.point.clone().applyMatrix4(inverseTrackMatrix);
    const normalizedX = (localPoint.x + 0.25) / 0.5;
    const clampedX = Math.max(0, Math.min(1, normalizedX));
    const newValue = min + clampedX * (max - min);
    onChange(newValue);
  };

  const sliderPosition = ((value - min) / (max - min)) * 0.5 - 0.25;
  const clampedValue = Math.max(min, Math.min(max, value));
  const displayValue = showDegrees
    ? Math.round(clampedValue * 180 / Math.PI) + "°"
    : clampedValue.toFixed(2);

  return (
    <group position={position}>
      {/* Background */}
      <mesh position={[0, 0, -0.01]}>
        <GradientBackground width={0.65} height={0.25} radius={0.05} color1="#EAF4FA" color2="#F5F7FA" opacity={0.9} />
      </mesh>

      {/* Close Button */}
      <group
        position={[0.3, 0.1, 0.01]}
        onPointerEnter={(e) => { e.stopPropagation(); setHoveredButton("close"); }}
        onPointerLeave={(e) => { e.stopPropagation(); setHoveredButton(null); }}
        onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
      >
        <mesh>
          <RoundedPlane width={0.08} height={0.08} radius={0.04} />
          <meshStandardMaterial
            color={hoveredButton === "close" ? "#1E40AF" : "#334155"}
            emissive={hoveredButton === "close" ? "#66B9E2" : "#ccc"}
            emissiveIntensity={hoveredButton === "close" ? 0.6 : 0.4}
          />
        </mesh>
        <Text
          position={[-0.002, -0.01, 0.01]}
          fontSize={0.045}
          color="#334155"
          anchorX="center"
          anchorY="middle"
        >
          ✕
        </Text>
      </group>

      {/* Label */}
      <Text position={[0, 0.05, 0]} fontSize={0.04} color="#334155" anchorX="center" anchorY="middle">
        {label}: {displayValue}
      </Text>

      {/* Track */}
      <mesh
        ref={trackRef}
        position={[0, -0.03, 0]}
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
        <boxGeometry args={[0.5, 0.02, 0.01]} />
        <meshStandardMaterial color="#A5D1E7" />
      </mesh>

      {/* Slider Handle */}
      <mesh position={[sliderPosition, -0.03, 0.01]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial
          color={isDragging ? "#66B9E2" : "#C7E4FA"}
          emissive={isDragging ? "#66B9E2" : "#C7E4FA"}
          emissiveIntensity={isDragging ? 0.5 : 0.2}
        />
      </mesh>
    </group>
  );
}
