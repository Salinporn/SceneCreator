import * as React from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";

interface NavigationControllerProps {
  moveSpeed?: number;
  rotateSpeed?: number;
  deadzone?: number;
  onNavigationModeChange?: (isActive: boolean) => void;
}

export function NavigationController({
  moveSpeed = 2.0,
  rotateSpeed = 1.5,
  deadzone = 0.15,
  onNavigationModeChange
}: NavigationControllerProps) {
  const { scene, camera } = useThree();
  const { session } = useXR();
  const rigRef = React.useRef<THREE.Group>();
  const wasNavigatingRef = React.useRef(false);

  React.useEffect(() => {
    if (!session) return;

    let rig = scene.getObjectByName("CustomXRRig") as THREE.Group;
    if (!rig) {
      rig = new THREE.Group();
      rig.name = "CustomXRRig";
      scene.add(rig);
    }

    // Reparent camera under rig
    if (camera.parent !== rig) {
      rig.add(camera);
    }

    rigRef.current = rig;
  }, [scene, camera, session]);

  useFrame((_state, delta) => {
    if (!rigRef.current || !session) return;

    let isGripPressed = false;
    let moveX = 0;
    let moveZ = 0;
    let rotateInput = 0;

    for (const source of session.inputSources) {
      const gamepad = source.gamepad;
      if (!gamepad) continue;

      const gripButton = gamepad.buttons[1];
      const squeezeButton = gamepad.buttons[2];
      
      if ((gripButton && gripButton.pressed) || (squeezeButton && squeezeButton.pressed)) {
        isGripPressed = true;

        if (source.handedness === "right" && gamepad.axes.length >= 4) {
          const x = gamepad.axes[2];
          const z = gamepad.axes[3];
          if (Math.abs(x) > deadzone) moveX = x;
          if (Math.abs(z) > deadzone) moveZ = z;
        }

        if (source.handedness === "left" && gamepad.axes.length >= 3) {
          const r = gamepad.axes[2];
          if (Math.abs(r) > deadzone) rotateInput = -r;
        }
      }
    }

    if (isGripPressed !== wasNavigatingRef.current) {
      wasNavigatingRef.current = isGripPressed;
      if (onNavigationModeChange) {
        onNavigationModeChange(isGripPressed);
      }
    }

    if (!isGripPressed) return;

    if (Math.abs(rotateInput) > 0) {
      const rotationDelta = rotateInput * rotateSpeed * delta;
      rigRef.current.rotateY(rotationDelta);
    }

    if (Math.abs(moveX) > 0 || Math.abs(moveZ) > 0) {
      // Camera direction (for forward/back)
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      // Right direction (for strafing)
      const right = new THREE.Vector3();
      right.crossVectors(forward, camera.up).normalize();

      const movement = new THREE.Vector3();
      movement.addScaledVector(forward, -moveZ * moveSpeed * delta);
      movement.addScaledVector(right, moveX * moveSpeed * delta);

      rigRef.current.position.add(movement);
    }
  });

  return null;
}