import { Text } from "@react-three/drei";

export function VRInstructionPanel({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <group>
      <mesh>
        <planeGeometry args={[2.0, 2]} />
        <meshStandardMaterial color="#2c3e50" opacity={0.9} transparent />
      </mesh>
      
      {/* Header */}
      <Text position={[0, 0.85, 0.01]} fontSize={0.1} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
        Instruction
      </Text>

      {/* Separator */}
      <mesh position={[0, 0.73, 0.01]}>
        <planeGeometry args={[1.8, 0.005]} />
        <meshBasicMaterial color="#ccc" />
      </mesh>

      {/* UI Controls Section */}
      <Text position={[0, 0.63, 0.01]} fontSize={0.07} color="#60a5fa" anchorX="center" anchorY="middle" fontWeight="bold">
        📋 Menu Controls
      </Text>
      <Text position={[0, 0.5, 0.01]} fontSize={0.06} color="#ffffff" anchorX="center" anchorY="middle">
        Y or B button: Toggle furniture menu
      </Text>
      <Text position={[0, 0.4, 0.01]} fontSize={0.06} color="#ffffff" anchorX="center" anchorY="middle">
        X or A button: Toggle control panel
      </Text>
      
      {/* Separator */}
      <mesh position={[0, 0.28, 0.01]}>
        <planeGeometry args={[1.8, 0.005]} />
        <meshBasicMaterial color="#495a6b" />
      </mesh>

        {/* Navigation Mode Section */}
      <Text position={[0, 0.18, 0.01]} fontSize={0.07} color="#fbbf24" anchorX="center" anchorY="middle" fontWeight="bold">
        🚶 Navigation Mode
      </Text>
      <Text position={[0, 0.05, 0.01]} fontSize={0.06} color="#ffffff" anchorX="center" anchorY="middle">
        Hold Grip on either controller to activate navigation mode
      </Text>
      <Text position={[0, -0.05, 0.01]} fontSize={0.06} color="#ccc" anchorX="center" anchorY="middle">
        To rotate camera, move left/right on left thumbstick
      </Text>
      <Text position={[0, -0.15, 0.01]} fontSize={0.06} color="#ccc" anchorX="center" anchorY="middle">
        To walk, move forward/back on right thumbstick
      </Text>

      {/* Separator */}
      <mesh position={[0, -0.27, 0.01]}>
        <planeGeometry args={[1.8, 0.005]} />
        <meshBasicMaterial color="#495a6b" />
      </mesh>
      
      {/* Furniture Editing Section */}
      <Text position={[0, -0.38, 0.01]} fontSize={0.07} color="#a78bfa" anchorX="center" anchorY="middle" fontWeight="bold">
        🪑 Furniture Editing Mode
      </Text>
      <Text position={[0, -0.5, 0.01]} fontSize={0.06} color="#ccc" anchorX="center" anchorY="middle">
        Trigger: Select furniture from menu or scene
      </Text>
      <Text position={[0, -0.6, 0.01]} fontSize={0.06} color="#ccc" anchorX="center" anchorY="middle">
        Right Thumbstick: Move selected item
      </Text>
      <Text position={[0, -0.7, 0.01]} fontSize={0.06} color="#ccc" anchorX="center" anchorY="middle">
        Left Thumbstick: Rotate selected item
      </Text>
      <Text position={[0, -0.8, 0.01]} fontSize={0.06} color="#ccc" anchorX="center" anchorY="middle">
        Use sliders to adjust scale & rotation
      </Text>
    </group>
  );
}