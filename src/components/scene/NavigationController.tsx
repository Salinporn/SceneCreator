import * as React from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";

export function NavigationController({
  onNavigationModeChange,
}: {
  onNavigationModeChange?: (isNavigating: boolean) => void;
}) {
  const { session } = useXR();
  const { camera, scene } = useThree();
  const [isNavigating, setIsNavigating] = React.useState(false);
  const dollyRef = React.useRef<THREE.Group | null>(null);
  const setupAttempted = React.useRef(false);

  // Find or create the dolly/rig - only once
  React.useEffect(() => {
    if (setupAttempted.current) return;
    setupAttempted.current = true;

    console.log("🔍 Searching for XR rig...");
    console.log("Camera parent:", camera.parent);

    // Try multiple ways to find the rig
    let rig: THREE.Group | null = null;

    // Method 1: Camera's parent (if it's a group and not the scene)
    if (camera.parent && camera.parent !== scene && camera.parent.type === 'Group') {
      rig = camera.parent as THREE.Group;
      console.log("✅ Found rig via camera parent");
    }

    // Method 2: Search by name
    if (!rig) {
      const searchNames = ['XROrigin', 'VRCamera', 'XRRig', 'Dolly', 'CustomXRRig'];
      for (const name of searchNames) {
        const found = scene.getObjectByName(name);
        if (found && found.type === 'Group') {
          rig = found as THREE.Group;
          console.log(`✅ Found existing rig by name: ${name}`);
          break;
        }
      }
    }

    // Method 3: Create our own rig ONLY if none exists
    if (!rig) {
      console.log("⚠️ No rig found, creating new one");
      rig = new THREE.Group();
      rig.name = 'CustomXRRig';
      
      // Get camera's current world position
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      camera.getWorldPosition(worldPos);
      camera.getWorldQuaternion(worldQuat);
      
      // Add rig to scene
      scene.add(rig);
      
      // Reparent camera to rig
      if (camera.parent && camera.parent !== rig) {
        camera.parent.remove(camera);
      }
      rig.add(camera);
      
      // Reset camera local transform
      camera.position.set(0, 0, 0);
      camera.quaternion.set(0, 0, 0, 1);
      
      // Set rig to camera's world transform
      rig.position.copy(worldPos);
      rig.quaternion.copy(worldQuat);
      
      console.log("✅ Created custom rig at:", worldPos);
    }

    dollyRef.current = rig;
    console.log("✅ Setup complete, rig:", rig.name);
  }, []); // Empty deps - run only once

  useFrame((_state, delta) => {
    if (!session || !session.inputSources) return;
    if (!dollyRef.current) {
      console.warn("⚠️ Dolly not found in frame");
      return;
    }

    const moveSpeed = 2.0;
    const rotateSpeed = 1.5;
    const deadzone = 0.2;

    let gripPressed = false;
    let rotationInput = 0;
    let forwardInput = 0;
    let strafeInput = 0;

    // Read controllers
    session.inputSources.forEach((inputSource, index) => {
      const gamepad = inputSource.gamepad;
      if (!gamepad) {
        console.log(`⚠️ Controller ${index} has no gamepad`);
        return;
      }

      // Grip button
      const gripButton = gamepad.buttons[1];
      if (gripButton?.pressed) {
        gripPressed = true;

        // Log all axes values when grip is pressed (handle null values)
        if (inputSource.handedness === "left") {
          const axesStr = Array.from(gamepad.axes).map((a, i) => 
            `[${i}]:${a !== null && a !== undefined ? a.toFixed(2) : 'null'}`
          ).join(', ');
          console.log(`🎮 LEFT Controller - Axes: ${axesStr}`);
          
          const stickX = gamepad.axes[2];
          if (stickX !== null && stickX !== undefined && Math.abs(stickX) > deadzone) {
            rotationInput = stickX;
            console.log(`🔄 Rotation input: ${stickX.toFixed(2)}`);
          }
        }

        if (inputSource.handedness === "right") {
          const axesStr = Array.from(gamepad.axes).map((a, i) => 
            `[${i}]:${a !== null && a !== undefined ? a.toFixed(2) : 'null'}`
          ).join(', ');
          console.log(`🎮 RIGHT Controller - Axes: ${axesStr}`);
          
          const stickX = gamepad.axes[2];
          const stickY = gamepad.axes[3];
          
          if (stickY !== null && stickY !== undefined && Math.abs(stickY) > deadzone) {
            forwardInput = stickY;
            console.log(`⬆️ Forward input: ${stickY.toFixed(2)}`);
          }
          if (stickX !== null && stickX !== undefined && Math.abs(stickX) > deadzone) {
            strafeInput = stickX;
            console.log(`➡️ Strafe input: ${stickX.toFixed(2)}`);
          }
        }
      }
    });

    // Update state
    if (gripPressed !== isNavigating) {
      setIsNavigating(gripPressed);
      onNavigationModeChange?.(gripPressed);
      console.log(gripPressed ? "🟢 Navigation ACTIVE" : "🔴 Navigation INACTIVE");
    }

    // Apply movement
    if (gripPressed) {
      const dolly = dollyRef.current;

      // Rotation
      if (Math.abs(rotationInput) > deadzone) {
        const rotDelta = -rotationInput * rotateSpeed * delta;
        dolly.rotation.y += rotDelta;
        console.log(`🔄 Rotating: ${THREE.MathUtils.radToDeg(dolly.rotation.y).toFixed(1)}°`);
      }

      // Translation
      if (Math.abs(forwardInput) > deadzone || Math.abs(strafeInput) > deadzone) {
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), dolly.rotation.y);
        right.applyAxisAngle(new THREE.Vector3(0, 1, 0), dolly.rotation.y);

        const movement = new THREE.Vector3();
        movement.addScaledVector(forward, -forwardInput * moveSpeed * delta);
        movement.addScaledVector(right, strafeInput * moveSpeed * delta);

        dolly.position.add(movement);
        console.log(`📍 Position: ${dolly.position.x.toFixed(2)}, ${dolly.position.y.toFixed(2)}, ${dolly.position.z.toFixed(2)}`);
      }
    }
  });

  return null;
}

// Demo scene
export default function VRNavigationDemo() {
  const [navActive, setNavActive] = React.useState(false);

  return (
    <>
      <NavigationController 
        onNavigationModeChange={(active) => {
          setNavActive(active);
        }} 
      />
      
      {/* Status indicator */}
      <group position={[0, 2, -2]}>
        <mesh>
          <boxGeometry args={[0.8, 0.3, 0.1]} />
          <meshStandardMaterial 
            color={navActive ? "#00ff00" : "#ff0000"} 
            emissive={navActive ? "#00ff00" : "#ff0000"}
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>
      
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Reference cubes */}
      <mesh position={[2, 1, -2]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      
      <mesh position={[-2, 1, -2]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      
      <mesh position={[0, 1, -4]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#10b981" />
      </mesh>
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
    </>
  );
}