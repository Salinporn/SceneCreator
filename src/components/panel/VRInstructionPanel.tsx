import { Text } from "@react-three/drei";
import { GradientBackground, RoundedPlane } from "./common/PanelElements";
import { useState } from "react";

const sections = [
  {
    title: "Menu Controls",
    color: "#1E40AF",
    content: [
      "Y or B button: Toggle furniture menu",
      "X or A button: Toggle control panel",
    ],
  },
  {
    title: "Navigation Mode",
    color: "#0b818a",
    content: [
      "Hold Grip on either controller to activate navigation mode",
      "To rotate camera, move left/right on left thumbstick",
      "To walk, move forward/back on right thumbstick",
    ],
  },
  {
    title: "Furniture Editing Mode",
    color: "#7C3AED",
    content: [
      "Trigger: Select furniture from menu or scene",
      "Right Thumbstick: Move selected item",
      "Left Thumbstick: Rotate selected item",
      "Use sliders to adjust scale & rotation",
    ],
  },
];

export function VRInstructionPanel({ show, onClose }: { show: boolean; onClose: () => void }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);


  if (!show) return null;

  const section = sections[sectionIndex];

  return (
    <group>
      {/* Background */}
      <mesh>
        <GradientBackground width={1.3} height={1} radius={0.1} color1="#EAF4FA" color2="#F5F7FA" opacity={0.7} />
      </mesh>

      {/* Header */}
      <Text position={[0, 0.4, 0.01]} fontSize={0.08} color="#334155" anchorX="center" anchorY="middle" fontWeight="semi-bold">
        Instructions
      </Text>

      {/* Close Button */}
      <group
        position={[0.55, 0.4, 0.01]}
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
          <RoundedPlane width={0.1} height={0.1} radius={0.05} />
          <meshStandardMaterial
            color={hoveredButton === "close" ? "##334155" : "#334155"}
            emissive={hoveredButton === "close" ? "#ccc" : "#ccc"}
            emissiveIntensity={hoveredButton === "close" ? 0.6 : 0.4}
          />
        </mesh>
        <Text
          position={[-0.005, -0.01, 0.01]}
          fontSize={0.055}
          color="#fff"
          anchorX="center"
          anchorY="middle"
        >
          ✕
        </Text>
      </group>

      {/* Separator */}
      <mesh position={[0, 0.3, 0.01]}>
        <planeGeometry args={[1.2, 0.005]} />
        <meshBasicMaterial color="#A5D1E7" />
      </mesh>

      {/* Section Title */}
      <Text position={[0, 0.18, 0.01]} fontSize={0.06} color={section.color} anchorX="center" anchorY="middle" fontWeight={500}>
        {section.title}
      </Text>

      {/* Section Content */}
      {section.content.map((line, i) => (
        <Text key={i} position={[0, 0.05 - i * 0.1, 0.01]} fontSize={0.043} color="#334155" anchorX="center" anchorY="middle">
          {line}
        </Text>
      ))}

      {sectionIndex > 0 && (
        <group
          position={[-0.55, -0.4, 0.01]}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredButton("prev");
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setHoveredButton(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (sectionIndex > 0) setSectionIndex(sectionIndex - 1);
          }}
        >
          <mesh>
            <RoundedPlane width={0.09} height={0.09} radius={0.05} />
            <meshStandardMaterial
              color={hoveredButton === "prev" ? "#C7E4FA" : "#A5D1E7"}
              emissive={hoveredButton === "prev" ? "#A5D1E7" : "#000000"}
              emissiveIntensity={hoveredButton === "prev" ? 0.4 : 0}
            />
          </mesh>
          <Text
            position={[0, 0.005, 0.01]}
            fontSize={0.06}
            color="#334155"
            anchorX="center"
            anchorY="middle"
          >
            &lt;
          </Text>
        </group>
      )}

      {sectionIndex < sections.length - 1 && (
        <group
          position={[0.55, -0.4, 0.01]}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredButton("next");
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setHoveredButton(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (sectionIndex < sections.length - 1)
              setSectionIndex(sectionIndex + 1);
          }}
        >
          <mesh>
            <RoundedPlane width={0.09} height={0.09} radius={0.05} />
            <meshStandardMaterial
              color={hoveredButton === "next" ? "#C7E4FA" : "#A5D1E7"}
              emissive={hoveredButton === "next" ? "#A5D1E7" : "#000000"}
              emissiveIntensity={hoveredButton === "next" ? 0.4 : 0}
            />
          </mesh>
          <Text
            position={[0, 0.005, 0.01]}
            fontSize={0.06}
            color="#334155"
            anchorX="center"
            anchorY="middle"
          >
            &gt;
          </Text>
        </group>
      )}
    </group>
  );
}