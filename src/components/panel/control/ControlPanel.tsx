import * as React from "react";
import { Text } from "@react-three/drei";
import { RoundedPlane, GradientBackground, ButtonBackground } from "../common/PanelElements";

export function VRControlPanel({
  show,
  onSave,
  onHelp,
  onBack,
  onLogout,
  saving = false,
}: {
  show: boolean;
  onSave: () => void;
  onHelp: () => void;
  onBack: () => void;
  onLogout: () => void;
  saving?: boolean;
}) {
  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);

  if (!show) return null;

  const panelWidth = 1;
  const panelHeight = 1.15;
  const buttonWidth = 0.7;
  const buttonHeight = 0.15;

  return (
    <group>
      {/* Main background panel */}
      <mesh position={[0, 0, -0.02]}>
        <GradientBackground width={panelWidth} height={panelHeight} radius={0.1} color1="#EAF4FA" color2="#F0F2F5" opacity={0.7} />
      </mesh>

      {/** Background Shadow */}
      <mesh position={[0, 0, -0.03]}>
        <RoundedPlane width={panelWidth} height={panelHeight} radius={0.1} />
        <meshStandardMaterial
          color="#000000"
          opacity={0.15}
          transparent
          roughness={1.0}
        />
      </mesh>

      {/* Header */}
      <Text
        position={[0, panelHeight / 2 - 0.15, 0.01]}
        fontSize={0.075}
        color="#334155"
        anchorX="center"
        anchorY="middle"
        fontWeight="semi-bold"
      >
        ☰ Options
      </Text>

      {/* Save Button */}
      <group position={[0, 0.25, 0.01]}>
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
          <RoundedPlane width={buttonWidth} height={buttonHeight} radius={0.03} />
          <meshStandardMaterial
            color={
              saving
                ? "#3FA4CE"
                : hoveredButton === "save"
                  ? "#66B9E2"
                  : "#3FA4CE"
            }
            emissive={hoveredButton === "save" ? "#66B9E2" : "#66B9E2"}
            emissiveIntensity={hoveredButton === "save" ? 0.5 : 0.3}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.06}
          color="#334155"
          anchorX="center"
          anchorY="middle"
          fontWeight={550}
        >
          {saving ? "Saving..." : "Save"}
        </Text>
      </group>

      {/* Instruction Button */}
      <group position={[0, 0.05, 0.01]}>
        <mesh
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredButton("help");
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setHoveredButton(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onHelp();
          }}
        >
          <RoundedPlane width={buttonWidth} height={buttonHeight} radius={0.03} />
          <meshStandardMaterial
            color={hoveredButton === "help" ? "#A5D1E7" : "#66B9E2"}
            emissive={hoveredButton === "help" ? "#66B9E2" : "#66B9E2"}
            emissiveIntensity={hoveredButton === "help" ? 0.5 : 0.3}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.06}
          color="#334155"
          anchorX="center"
          anchorY="middle"
          fontWeight={550}
        >
          Help
        </Text>
      </group>

      {/* Back Button */}
      <group position={[0, -0.15, 0.01]}>
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
          <RoundedPlane width={buttonWidth} height={buttonHeight} radius={0.03} />
          <meshStandardMaterial
            color={hoveredButton === "back" ? "#A5D1E7" : "#66B9E2"}
            emissive={hoveredButton === "back" ? "#66B9E2" : "#66B9E2"}
            emissiveIntensity={hoveredButton === "back" ? 0.5 : 0.3}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.06}
          color="#334155"
          anchorX="center"
          anchorY="middle"
          fontWeight={550}
        >
          Back to Home
        </Text>
      </group>

      {/* Logout Button */}
      <group position={[0, -0.35, 0.01]}>
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
          <RoundedPlane width={buttonWidth} height={buttonHeight} radius={0.03} />
          <meshStandardMaterial
            color={hoveredButton === "logout" ? "#FF8F8F" : "#fd7171"}
            emissive={hoveredButton === "logout" ? "#fd7171" : "#fd7171"}
            emissiveIntensity={hoveredButton === "logout" ? 0.5 : 0.3}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.06}
          color="#334155"
          anchorX="center"
          anchorY="middle"
          fontWeight={550}
        >
          Logout
        </Text>
      </group>

      {/* Helper text */}
      <Text
        position={[0, -panelHeight / 2 + 0.1, 0.01]}
        fontSize={0.045}
        color="#334155"
        anchorX="center"
        anchorY="middle"
      >
        Press X/A to close
      </Text>
    </group>
  );
}