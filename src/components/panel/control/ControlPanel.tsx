import * as React from "react";
import { Text } from "@react-three/drei";

export function VRControlPanel({
  show,
  onSave,
  onBack,
  onLogout,
  saving = false,
}: {
  show: boolean;
  onSave: () => void;
  onBack: () => void;
  onLogout: () => void;
  saving?: boolean;
}) {
  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);

  if (!show) return null;

  const panelWidth = 1.8;
  const panelHeight = 1.0;
  const buttonWidth = 0.6;
  const buttonHeight = 0.15;

  return (
    <group>
      {/* Main background panel */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[panelWidth, panelHeight]} />
        <meshStandardMaterial
          color="#1e293b"
          opacity={0.95}
          transparent
          roughness={0.7}
        />
      </mesh>

      {/* Header */}
      <Text
        position={[0, panelHeight / 2 - 0.15, 0.01]}
        fontSize={0.08}
        color="#f1f5f9"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        Scene Controls
      </Text>

      {/* Save Button */}
      <group position={[0, 0.15, 0.01]}>
        <mesh
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredButton("save");
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setHoveredButton(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (!saving) onSave();
          }}
        >
          <planeGeometry args={[buttonWidth, buttonHeight]} />
          <meshStandardMaterial
            color={
              saving
                ? "#64748b"
                : hoveredButton === "save"
                ? "#22c55e"
                : "#10b981"
            }
            emissive={hoveredButton === "save" ? "#16a34a" : "#000000"}
            emissiveIntensity={hoveredButton === "save" ? 0.5 : 0}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.06}
          color="white"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {saving ? "Saving..." : "💾 Save"}
        </Text>
      </group>

      {/* Back Button */}
      <group position={[0, -0.05, 0.01]}>
        <mesh
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredButton("back");
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setHoveredButton(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onBack();
          }}
        >
          <planeGeometry args={[buttonWidth, buttonHeight]} />
          <meshStandardMaterial
            color={hoveredButton === "back" ? "#3b82f6" : "#2563eb"}
            emissive={hoveredButton === "back" ? "#1d4ed8" : "#000000"}
            emissiveIntensity={hoveredButton === "back" ? 0.5 : 0}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.06}
          color="white"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          ← Back to Home
        </Text>
      </group>

      {/* Logout Button */}
      <group position={[0, -0.25, 0.01]}>
        <mesh
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredButton("logout");
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setHoveredButton(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onLogout();
          }}
        >
          <planeGeometry args={[buttonWidth, buttonHeight]} />
          <meshStandardMaterial
            color={hoveredButton === "logout" ? "#dc2626" : "#ef4444"}
            emissive={hoveredButton === "logout" ? "#b91c1c" : "#000000"}
            emissiveIntensity={hoveredButton === "logout" ? 0.5 : 0}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.06}
          color="white"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          🚪 Logout
        </Text>
      </group>

      {/* Helper text */}
      <Text
        position={[0, -panelHeight / 2 + 0.1, 0.01]}
        fontSize={0.04}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        Press X/A to close
      </Text>
    </group>
  );
}