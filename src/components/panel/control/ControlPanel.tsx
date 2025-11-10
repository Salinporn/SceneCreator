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
  onClose: () => void;
}) {
  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);

  if (!show) return null;

  const panelWidth = 0.6;
  const panelHeight = 0.8;
  const buttonWidth = 0.45;
  const buttonHeight = 0.1;

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
        position={[0, panelHeight / 2 - 0.11, 0.01]}
        fontSize={0.05}
        color="#334155"
        anchorX="center"
        anchorY="middle"
        fontWeight="semi-bold"
      >
        ☰ Control Panel
      </Text>

      {/* Save Button */}
      <group position={[0, 0.16, 0.01]}>
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
          fontSize={0.04}
          color="#334155"
          anchorX="center"
          anchorY="middle"
          fontWeight={550}
        >
          {saving ? "Saving..." : "Save"}
        </Text>
      </group>

      <group position={[0, 0.145, 0]}>
        <mesh>
          <ButtonBackground width={buttonWidth} height={buttonHeight} radius={0.03} colorTop="#000000" colorBottom="#000000" opacity={0.15} />
        </mesh>
      </group>

      {/* Instruction Button */}
      <group position={[0, 0.01, 0.01]}>
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
          fontSize={0.04}
          color="#334155"
          anchorX="center"
          anchorY="middle"
          fontWeight={550}
        >
          Help
        </Text>
      </group>

      <group position={[0, -0.005, 0]}>
        <mesh>
          <ButtonBackground width={buttonWidth} height={buttonHeight} radius={0.03} colorTop="#000000" colorBottom="#000000" opacity={0.15} />
        </mesh>
      </group>

      {/* Back Button */}
      <group position={[0, -0.14, 0.01]}>
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
          fontSize={0.04}
          color="#334155"
          anchorX="center"
          anchorY="middle"
          fontWeight={550}
        >
          Back to Home
        </Text>
      </group>

      <group position={[0, -0.155, 0]}>
        <mesh>
          <ButtonBackground width={buttonWidth} height={buttonHeight} radius={0.03} colorTop="#000000" colorBottom="#000000" opacity={0.15} />
        </mesh>
      </group>

      {/* Logout Button */}
      <group position={[0, -0.29, 0.01]}>
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
          fontSize={0.04}
          color="#334155"
          anchorX="center"
          anchorY="middle"
          fontWeight={550}
        >
          Logout
        </Text>
      </group>

      <group position={[0, -0.305, 0]}>
        <mesh>
          <ButtonBackground width={buttonWidth} height={buttonHeight} radius={0.03} colorTop="#000000" colorBottom="#000000" opacity={0.15} />
        </mesh>
      </group>
    </group>
  );
}