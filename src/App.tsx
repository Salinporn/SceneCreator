import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { XR, useXR, createXRStore } from "@react-three/xr";
// import { HeadLockedUI } from "./panel/HeadLockedUI";
// import { VRSlider } from "./components/panel/VRSlider";

const xrStore = createXRStore();

/* -----------------------------------------------
   🔹 Navigation Controller (VR camera movement)
------------------------------------------------- */
function NavigationController({
  onNavigationModeChange,
}: {
  onNavigationModeChange?: (isNavigating: boolean) => void;
}) {
  const { session } = useXR();
  const { camera, scene } = useThree();
  const [isNavigating, setIsNavigating] = React.useState(false);
  const dollyRef = React.useRef<THREE.Group | null>(null);
  const setupAttempted = React.useRef(false);

  // Setup or find the XR rig
  React.useEffect(() => {
    if (setupAttempted.current) return;
    setupAttempted.current = true;

    let rig: THREE.Group | null = null;

    if (camera.parent && camera.parent !== scene && camera.parent.type === "Group") {
      rig = camera.parent as THREE.Group;
    }

    if (!rig) {
      rig = scene.getObjectByName("CustomXRRig") as THREE.Group | null;
    }

    if (!rig) {
      rig = new THREE.Group();
      rig.name = "CustomXRRig";

      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      camera.getWorldPosition(worldPos);
      camera.getWorldQuaternion(worldQuat);

      scene.add(rig);
      if (camera.parent && camera.parent !== rig) camera.parent.remove(camera);
      rig.add(camera);

      camera.position.set(0, 0, 0);
      camera.quaternion.set(0, 0, 0, 1);
      rig.position.copy(worldPos);
      rig.quaternion.copy(worldQuat);
    }

    dollyRef.current = rig;
  }, []);

  // Handle VR controller input
  useFrame((_state, delta) => {
    if (!session || !dollyRef.current) return;

    const moveSpeed = 2.0;
    const rotateSpeed = 1.5;
    const deadzone = 0.2;

    let gripPressed = false;
    let rotationInput = 0;
    let forwardInput = 0;
    let strafeInput = 0;

    session.inputSources.forEach((inputSource) => {
      const gamepad = inputSource.gamepad;
      if (!gamepad) return;

      const gripButton = gamepad.buttons[1];
      if (gripButton?.pressed) {
        gripPressed = true;

        if (inputSource.handedness === "left") {
          const stickX = gamepad.axes[2];
          if (Math.abs(stickX) > deadzone) rotationInput = stickX;
        }

        if (inputSource.handedness === "right") {
          const stickX = gamepad.axes[2];
          const stickY = gamepad.axes[3];
          if (Math.abs(stickY) > deadzone) forwardInput = stickY;
          if (Math.abs(stickX) > deadzone) strafeInput = stickX;
        }
      }
    });

    if (gripPressed !== isNavigating) {
      setIsNavigating(gripPressed);
      onNavigationModeChange?.(gripPressed);
    }

    if (gripPressed) {
      const dolly = dollyRef.current;

      // Rotation
      if (Math.abs(rotationInput) > deadzone) {
        dolly.rotation.y -= rotationInput * rotateSpeed * delta;
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
      }
    }
  });

  return null;
}

/* -----------------------------------------------
   🔹 Main VR Scene with HeadLockedUI + Slider
------------------------------------------------- */
export default function IntegratedVRScene() {
  // const [showSlider, setShowSlider] = React.useState(true);
  // const [sliderValue, setSliderValue] = React.useState(1.0);
  const [navActive, setNavActive] = React.useState(false);

  return (
    <>
      <Canvas>
        <XR store={xrStore}>
          <NavigationController onNavigationModeChange={setNavActive} />

          {/* Visual indicator for navigation mode */}
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

          {/* Head-locked UI */}
          {/* <HeadLockedUI distance={1.0} verticalOffset={0} enabled={showSlider}>
            <VRSlider
              show={showSlider}
              value={sliderValue}
              onChange={setSliderValue}
              label="Scale"
              min={0.1}
              max={2}
              position={[0, -0.5, 0]}
            />
          </HeadLockedUI> */}

          {/* Simple demo objects */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#333" />
          </mesh>

          <mesh position={[2, 1, -2]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#3b82f6" />
          </mesh>

          <mesh position={[-2, 1, -2]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>

          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
        </XR>
      </Canvas>

      {/* "Enter VR" button overlay */}
      <div
        style={{
          position: "fixed",
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          pointerEvents: "none",
        }}
      >
        <button
          style={{
            marginBottom: 20,
            padding: "12px 24px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            pointerEvents: "auto",
          }}
          onClick={() => {
            xrStore
              .enterVR()
              .catch((err) => console.warn("Failed to enter VR:", err));
          }}
        >
          Enter VR
        </button>
      </div>
    </>
  );
}
