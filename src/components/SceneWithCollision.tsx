// import React from "react";
// import { Canvas } from "@react-three/fiber";
// import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
// import { Physics, RigidBody } from "@react-three/rapier";
// import * as THREE from "three";

// function Chair({ position }: { position: [number, number, number] }) {
//   const { scene } = useGLTF("/chair2.glb");

//   // Optional: center and scale if model is large or offset
//   scene.traverse((obj) => {
//     if (obj instanceof THREE.Mesh) {
//       obj.castShadow = true;
//       obj.receiveShadow = true;
//     }
//   });

//   return (
//     <RigidBody
//       colliders="hull" // use 'trimesh' for exact shape (slower) or 'cuboid' for simple box
//       restitution={0.3}
//       friction={1}
//       position={position}
//     >
//       <primitive object={scene.clone()} />
//     </RigidBody>
//   );
// }

// export default function SceneContent() {
//   return (
//     <Canvas shadows camera={{ position: [3, 2, 6], fov: 50 }}>
//       <color attach="background" args={["#c9e5ff"]} />
//       <ambientLight intensity={0.4} />
//       <directionalLight
//         position={[10, 10, 5]}
//         intensity={1.5}
//         castShadow
//         shadow-mapSize={[2048, 2048]}
//       />

//       <Physics gravity={[0, -9.81, 0]}>
//         {/* Ground */}
//         <RigidBody type="fixed" colliders="cuboid">
//           <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -1, 0]}>
//             <planeGeometry args={[20, 20]} />
//             <meshStandardMaterial color="#999" />
//           </mesh>
//         </RigidBody>

//         {/* Two chairs that will collide */}
//         <Chair position={[0, 0, 0]} />
//         <Chair position={[0, 1, 0]} />
//       </Physics>

//       <OrbitControls />
//       <Environment preset="sunset" />
//     </Canvas>
//   );
// }
