{ /*

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
      
      <mesh position={[0, 0, -0.01]}>
        <GradientBackground width={0.5} height={0.15} radius={0.04} color1="#EAF4FA" color2="#F5F7FA" opacity={0.9} />
      </mesh>

  
      <group
        position={[0.21, 0.03, 0.01]}
        onPointerEnter={(e) => { e.stopPropagation(); setHoveredButton("close"); }}
        onPointerLeave={(e) => { e.stopPropagation(); setHoveredButton(null); }}
        onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
      >
        <mesh>
          <RoundedPlane width={0.05} height={0.05} radius={0.02} />
          <meshStandardMaterial
            color={hoveredButton === "close" ? "#1E40AF" : "#334155"}
            emissive={hoveredButton === "close" ? "#66B9E2" : "#ccc"}
            emissiveIntensity={hoveredButton === "close" ? 0.6 : 0.4}
          />
        </mesh>
        <Text
          position={[-0.002, -0.005, 0.01]}
          fontSize={0.03}
          color="#334155"
          anchorX="center"
          anchorY="middle"
        >
          ✕
        </Text>
      </group>

      
      <Text position={[0, 0.02, 0]} fontSize={0.03} color="#334155" anchorX="center" anchorY="middle">
        {label}: {displayValue}
      </Text>

     
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
        <boxGeometry args={[0.4, 0.015, 0.01]} />
        <meshStandardMaterial color="#A5D1E7" />
      </mesh>

     
      <mesh position={[sliderPosition, -0.03, 0.01]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial
          color={isDragging ? "#66B9E2" : "#C7E4FA"}
          emissive={isDragging ? "#66B9E2" : "#C7E4FA"}
          emissiveIntensity={isDragging ? 0.5 : 0.2}
        />
      </mesh>
    </group>
  );
}

*/}


import * as React from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import { GradientBackground, RoundedPlane } from "./common/PanelElements";

// ===== VRSLIDER COMPONENT (Original) =====
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
        <GradientBackground width={0.5} height={0.15} radius={0.04} color1="#EAF4FA" color2="#F5F7FA" opacity={0.9} />
      </mesh>
      
      {/* Close Button */}
      <group
        position={[0.21, 0.03, 0.01]}
        onPointerEnter={(e) => { e.stopPropagation(); setHoveredButton("close"); }}
        onPointerLeave={(e) => { e.stopPropagation(); setHoveredButton(null); }}
        onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
      >
        <mesh>
          <RoundedPlane width={0.05} height={0.05} radius={0.02} />
          <meshStandardMaterial
            color={hoveredButton === "close" ? "#1E40AF" : "#334155"}
            emissive={hoveredButton === "close" ? "#66B9E2" : "#ccc"}
            emissiveIntensity={hoveredButton === "close" ? 0.6 : 0.4}
          />
        </mesh>
        <Text
          position={[-0.002, -0.005, 0.01]}
          fontSize={0.03}
          color="#334155"
          anchorX="center"
          anchorY="middle"
        >
          ✕
        </Text>
      </group>
      
      {/* Label */}
      <Text position={[0, 0.02, 0]} fontSize={0.03} color="#334155" anchorX="center" anchorY="middle">
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
        <boxGeometry args={[0.4, 0.015, 0.01]} />
        <meshStandardMaterial color="#A5D1E7" />
      </mesh>
      
      {/* Slider Handle */}
      <mesh position={[sliderPosition, -0.03, 0.01]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial
          color={isDragging ? "#66B9E2" : "#C7E4FA"}
          emissive={isDragging ? "#66B9E2" : "#C7E4FA"}
          emissiveIntensity={isDragging ? 0.5 : 0.2}
        />
      </mesh>
    </group>
  );
}

// ===== SCALECONTROLPANEL COMPONENT (New) =====
interface ScaleControlPanelProps {
  show: boolean;
  currentScale: number;
  position?: [number, number, number];
  onScaleChange: (newScale: number) => void;
  onClose: () => void;
}

export function ScaleControlPanel({
  show,
  currentScale,
  position = [0.5, 0, 0],
  onScaleChange,
  onClose,
}: ScaleControlPanelProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);
  const trackRef = React.useRef<THREE.Mesh>(null);

  if (!show) return null;

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  const handleSliderInteraction = (e: ThreeEvent<PointerEvent>) => {
    if (!trackRef.current || !e.point) return;

    const trackMatrix = trackRef.current.matrixWorld;
    const inverseTrackMatrix = new THREE.Matrix4().copy(trackMatrix).invert();
    const localPoint = e.point.clone().applyMatrix4(inverseTrackMatrix);

    const normalizedX = (localPoint.x + 0.25) / 0.5;
    const clampedX = Math.max(0, Math.min(1, normalizedX));
    const newValue = MIN_SCALE + clampedX * (MAX_SCALE - MIN_SCALE);

    onScaleChange(newValue);
  };

  const handleIncrement = () => {
    onScaleChange(Math.min(currentScale + 0.1, MAX_SCALE));
  };

  const handleDecrement = () => {
    onScaleChange(Math.max(currentScale - 0.1, MIN_SCALE));
  };

  const handleReset = () => {
    onScaleChange(1);
  };

  const sliderPosition = ((currentScale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 0.5 - 0.25;
  const clampedValue = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentScale));
  const displayValue = clampedValue.toFixed(2);

  return (
    <group position={position}>
      {/* Main Panel Background */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshBasicMaterial color="#0F172A" opacity={0.9} transparent />
      </mesh>

      {/* Panel Border with pink accent */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[0.62, 0.32]} />
        <meshBasicMaterial color="#EC4899" opacity={0.5} transparent />
      </mesh>

      {/* Title */}
      <Text
        position={[0, 0.13, 0.01]}
        fontSize={0.04}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
      >
        Scale Furniture
      </Text>

      {/* Scale Display Value */}
      <Text
        position={[0, 0.07, 0.01]}
        fontSize={0.04}
        color="#EC4899"
        anchorX="center"
        anchorY="middle"
      >
        {displayValue}x
      </Text>

      {/* Decrease Button (−) */}
      <group
        position={[-0.15, 0, 0.01]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHoveredButton("decrease");
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHoveredButton(null);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          handleDecrement();
        }}
      >
        <mesh>
          <RoundedPlane width={0.08} height={0.08} radius={0.015} />
          <meshStandardMaterial
            color={hoveredButton === "decrease" ? "#EC4899" : "#1E293B"}
            emissive={hoveredButton === "decrease" ? "#EC4899" : "#000000"}
            emissiveIntensity={hoveredButton === "decrease" ? 0.3 : 0}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.04}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          −
        </Text>
      </group>

      {/* Increase Button (+) */}
      <group
        position={[0.15, 0, 0.01]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHoveredButton("increase");
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHoveredButton(null);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          handleIncrement();
        }}
      >
        <mesh>
          <RoundedPlane width={0.08} height={0.08} radius={0.015} />
          <meshStandardMaterial
            color={hoveredButton === "increase" ? "#EC4899" : "#1E293B"}
            emissive={hoveredButton === "increase" ? "#EC4899" : "#000000"}
            emissiveIntensity={hoveredButton === "increase" ? 0.3 : 0}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.04}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          +
        </Text>
      </group>

      {/* Slider Track */}
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
        <boxGeometry args={[0.4, 0.015, 0.01]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Slider Handle */}
      <mesh position={[sliderPosition, -0.05, 0.01]}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshStandardMaterial
          color={isDragging ? "#EC4899" : "#C7E4FA"}
          emissive={isDragging ? "#EC4899" : "#C7E4FA"}
          emissiveIntensity={isDragging ? 0.5 : 0.2}
        />
      </mesh>

      {/* Reset Button */}
      <group
        position={[0, -0.12, 0.01]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHoveredButton("reset");
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHoveredButton(null);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          handleReset();
        }}
      >
        <mesh>
          <RoundedPlane width={0.2} height={0.06} radius={0.01} />
          <meshStandardMaterial
            color={hoveredButton === "reset" ? "#F59E0B" : "#1E293B"}
            emissive={hoveredButton === "reset" ? "#F59E0B" : "#000000"}
            emissiveIntensity={hoveredButton === "reset" ? 0.3 : 0}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.025}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          Reset (1.0x)
        </Text>
      </group>

      {/* Close Button */}
      <group
        position={[0.28, 0.13, 0.01]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHoveredButton("close");
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHoveredButton(null);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <mesh>
          <RoundedPlane width={0.06} height={0.06} radius={0.01} />
          <meshStandardMaterial
            color={hoveredButton === "close" ? "#EF4444" : "#1E293B"}
            emissive={hoveredButton === "close" ? "#EF4444" : "#000000"}
            emissiveIntensity={hoveredButton === "close" ? 0.3 : 0}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.035}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          ✕
        </Text>
      </group>

      {/* Scale Range Labels */}
      <Text
        position={[-0.22, -0.09, 0.01]}
        fontSize={0.018}
        color="#94A3B8"
        anchorX="center"
        anchorY="middle"
      >
        0.5x
      </Text>

      <Text
        position={[0.22, -0.09, 0.01]}
        fontSize={0.018}
        color="#94A3B8"
        anchorX="center"
        anchorY="middle"
      >
        3x
      </Text>
    </group>
  );
}