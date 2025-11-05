import { Text } from "@react-three/drei";

export function VRInstructionPanel({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <group>
      <mesh>
        <planeGeometry args={[2.0, 2.0]} />
        <meshStandardMaterial color="#2c3e50" opacity={0.9} transparent />
      </mesh>
      
      {/* Header */}
      <Text position={[0, 0.9, 0.01]} fontSize={0.07} color="#4CAF50" anchorX="center" anchorY="middle" fontWeight="bold">
        VR Controls
      </Text>
      
      {/* Navigation Mode Section */}
      <Text position={[0, 0.72, 0.01]} fontSize={0.055} color="#fbbf24" anchorX="center" anchorY="middle" fontWeight="bold">
        🚶 Navigation Mode (Hold Grip)
      </Text>
      <Text position={[0, 0.60, 0.01]} fontSize={0.04} color="white" anchorX="center" anchorY="middle">
        Hold Grip on either controller to navigate
      </Text>
      <Text position={[0, 0.50, 0.01]} fontSize={0.035} color="#ccc" anchorX="center" anchorY="middle">
        Left Thumbstick Left/Right: Rotate camera
      </Text>
      <Text position={[0, 0.42, 0.01]} fontSize={0.035} color="#ccc" anchorX="center" anchorY="middle">
        Right Thumbstick Up/Down: Move forward/back
      </Text>
      
      {/* Separator */}
      <mesh position={[0, 0.32, 0.01]}>
        <planeGeometry args={[1.8, 0.005]} />
        <meshBasicMaterial color="#4CAF50" />
      </mesh>
      
      {/* UI Controls Section */}
      <Text position={[0, 0.20, 0.01]} fontSize={0.045} color="#60a5fa" anchorX="center" anchorY="middle" fontWeight="bold">
        📋 Menu Controls
      </Text>
      <Text position={[0, 0.10, 0.01]} fontSize={0.038} color="white" anchorX="center" anchorY="middle">
        Y or B button: Toggle furniture menu
      </Text>
      <Text position={[0, 0.02, 0.01]} fontSize={0.038} color="white" anchorX="center" anchorY="middle">
        X or A button: Toggle control panel
      </Text>
      
      {/* Furniture Editing Section */}
      <Text position={[0, -0.10, 0.01]} fontSize={0.045} color="#a78bfa" anchorX="center" anchorY="middle" fontWeight="bold">
        🪑 Furniture Editing
      </Text>
      <Text position={[0, -0.20, 0.01]} fontSize={0.035} color="#ccc" anchorX="center" anchorY="middle">
        Trigger: Select furniture from menu or scene
      </Text>
      <Text position={[0, -0.28, 0.01]} fontSize={0.035} color="#ccc" anchorX="center" anchorY="middle">
        Right Thumbstick: Move selected item
      </Text>
      <Text position={[0, -0.36, 0.01]} fontSize={0.035} color="#ccc" anchorX="center" anchorY="middle">
        Left Thumbstick: Rotate selected item
      </Text>
      <Text position={[0, -0.44, 0.01]} fontSize={0.035} color="#ccc" anchorX="center" anchorY="middle">
        Use sliders to adjust scale & rotation
      </Text>
      
      <Text position={[0, -0.62, 0.01]} fontSize={0.032} color="#64748b" anchorX="center" anchorY="middle">
        Note: Furniture editing is disabled in navigation mode
      </Text>
      
      <Text position={[0, -0.82, 0.01]} fontSize={0.038} color="#10b981" anchorX="center" anchorY="middle" fontWeight="500">
        Control Panel: Save, Back to Home, Logout
      </Text>
    </group>
  );
}