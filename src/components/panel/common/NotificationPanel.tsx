import * as React from "react";
import { Text } from "@react-three/drei";
import { RoundedPlane, GradientBackground } from "./PanelElements";

interface VRNotificationPanelProps {
  show: boolean;
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

export function VRNotificationPanel({
  show,
  message,
  type = "info",
  onClose,
}: VRNotificationPanelProps) {
  const [hoveredButton, setHoveredButton] = React.useState(false);

  if (!show) return null;

  const panelWidth = 0.9;
  const panelHeight = 0.4;

  // Color scheme based on notification type
  const colors = {
    success: {
      icon: "✔",
      iconColor: "#059669",
    },
    error: {
      icon: "✖",
      iconColor: "#DC2626",
    },
    info: {
      icon: "ℹ",
      iconColor: "#2563EB",
    },
  };

  const colorScheme = colors[type];

  return (
    <group>
      {/* Main background panel */}
      <mesh position={[0, 0, -0.02]}>
        <GradientBackground
          width={panelWidth}
          height={panelHeight}
          radius={0.1}
          color1="#EAF4FA" 
          color2="#F5F7FA"
          opacity={0.95}
        />
      </mesh>

      {/* Shadow */}
      <mesh position={[0, -0.01, -0.03]}>
        <RoundedPlane width={panelWidth} height={panelHeight} radius={0.1} />
        <meshStandardMaterial
          color="#000000"
          opacity={0.2}
          transparent
          roughness={1.0}
        />
      </mesh>

      {/* Icon */}
      <group position={[0, 0.1, 0.01]}>
        <mesh>
          <circleGeometry args={[0.05, 16]} />
          <meshStandardMaterial
            color={colorScheme.iconColor}
            opacity={0.2}
            transparent
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.04}
          color={colorScheme.iconColor}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {colorScheme.icon}
        </Text>
      </group>

      {/* Message */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.04}
        color="#334155"
        anchorX="center"
        anchorY="middle"
        maxWidth={panelWidth - 0.2}
        textAlign="center"
        lineHeight={1.2}
      >
        {message}
      </Text>

      {/* OK Button */}
      <group
        position={[0, -0.12, 0.01]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHoveredButton(true);
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHoveredButton(false);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <mesh>
          <RoundedPlane width={0.25} height={0.1} radius={0.03} />
          <meshStandardMaterial
            color={hoveredButton ? "#66B9E2" : "#3FA4CE"}
            emissive={"#3FA4CE"}
            emissiveIntensity={hoveredButton ? 0.5 : 0.3}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.05}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          fontWeight="600"
        >
          OK
        </Text>
      </group>

      {/* Button shadow */}
      <group position={[0, -0.13, 0]}>
        <mesh>
          <RoundedPlane width={0.25} height={0.1} radius={0.03} />
          <meshStandardMaterial
            color="#000000"
            opacity={0.15}
            transparent
            roughness={1.0}
          />
        </mesh>
      </group>
    </group>
  );
}