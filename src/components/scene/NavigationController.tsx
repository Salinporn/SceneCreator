import * as React from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";

export function NavigationController({
  onNavigationModeChange,
}: {
  onNavigationModeChange: (isNavigating: boolean) => void;
}) {
  const xr = useXR();
  const camera = useThree((state) => state.camera);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const prevGripStates = React.useRef<Map<number, boolean>>(new Map());

  useFrame((_state, delta) => {
    const session = xr.session;
    if (!session || !session.inputSources) return;

    const moveSpeed = 2.0; // Units per second
    const rotateSpeed = 1.5; // Radians per second
    const deadzone = 0.15;

    let gripPressed = false;
    let rotationInput = 0;
    let forwardInput = 0;

    // Check all input sources for grip button state
    session.inputSources.forEach((inputSource, index) => {
      const gamepad = inputSource.gamepad;
      if (!gamepad || !gamepad.buttons) return;

      // Grip button is typically button[1]
      const gripButton = gamepad.buttons[1];
      if (gripButton && gripButton.pressed) {
        gripPressed = true;

        // Left controller: rotation (thumbstick X-axis)
        if (inputSource.handedness === "left" && gamepad.axes.length >= 2) {
          const thumbstickX = gamepad.axes[2] || 0;
          if (Math.abs(thumbstickX) > deadzone) {
            rotationInput = thumbstickX;
          }
        }

        // Right controller: forward/backward movement (thumbstick Y-axis)
        if (inputSource.handedness === "right" && gamepad.axes.length >= 4) {
          const thumbstickY = gamepad.axes[3] || 0;
          if (Math.abs(thumbstickY) > deadzone) {
            forwardInput = thumbstickY;
          }
        }
      }
    });

    // Update navigation mode state
    if (gripPressed !== isNavigating) {
      setIsNavigating(gripPressed);
      onNavigationModeChange(gripPressed);
    }

    // Apply navigation transformations when grip is held
    if (gripPressed) {
      // Rotation: Rotate camera around Y-axis
      if (Math.abs(rotationInput) > deadzone) {
        const rotationDelta = -rotationInput * rotateSpeed * delta;
        
        // Get current camera position
        const cameraPos = new THREE.Vector3();
        camera.getWorldPosition(cameraPos);
        
        // Create rotation matrix around Y-axis
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(rotationDelta);
        
        // Apply rotation to camera
        camera.applyMatrix4(rotationMatrix);
        
        // Keep camera at same position (rotate in place)
        camera.position.copy(cameraPos);
      }

      // Forward/Backward Movement
      if (Math.abs(forwardInput) > deadzone) {
        // Get camera's forward direction (negative Z in camera space)
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        
        // Project forward onto XZ plane (ignore vertical component)
        forward.y = 0;
        forward.normalize();
        
        // Calculate movement
        const moveDelta = forward.multiplyScalar(-forwardInput * moveSpeed * delta);
        
        // Apply movement to camera
        camera.position.add(moveDelta);
      }
    }
  });

  return null;
}