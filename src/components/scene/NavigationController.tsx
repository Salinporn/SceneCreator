import * as React from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";

export function NavigationController() {
  const { gl, scene, camera } = useThree();
  const { session } = useXR();
  const rigRef = React.useRef<THREE.Group>();

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
      console.log("✅ Camera parented under:", rig.name);
    } else {
      console.log("Camera already parented under rig:", rig.name);
    }

    rigRef.current = rig;
  }, [scene, camera, session]);

  useFrame((_state, delta) => {
    if (!rigRef.current || !session) return;

    const moveSpeed = 2.0;
    const deadzone = 0.15;
    let moveX = 0;
    let moveZ = 0;

    for (const source of session.inputSources) {
      if (source.handedness === "right" && source.gamepad) {
        const axes = source.gamepad.axes;
        if (axes.length >= 4) {
          const x = axes[2];
          const z = axes[3];
          if (Math.abs(x) > deadzone) moveX = x;
          if (Math.abs(z) > deadzone) moveZ = z;
        }
      }
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