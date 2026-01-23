{/*import { useState, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface TransformGizmoProps {
  position: [number, number, number];
  onMove: (axis: 'x' | 'y' | 'z', delta: number) => void;
  visible: boolean;
}

interface AxisArrowProps {
  axis: 'x' | 'y' | 'z';
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  onAxisDrag: (axis: 'x' | 'y' | 'z', delta: number) => void;
}

function AxisArrow({ axis, color, position, rotation, onAxisDrag }: AxisArrowProps) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<THREE.Vector3 | null>(null);
  const meshRef = useRef<THREE.Group>(null);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setDragging(true);
    
    // Store the initial intersection point
    dragStartRef.current = e.point.clone();
    
    // Prevent default to avoid selecting the furniture
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  const handlePointerMove = (e: any) => {
    if (!dragging || !dragStartRef.current) return;
    
    e.stopPropagation();
    
    const currentPoint = e.point as THREE.Vector3;
    const startPoint = dragStartRef.current;
    
    // Calculate movement delta along the specific axis
    let delta = 0;
    switch (axis) {
      case 'x':
        delta = currentPoint.x - startPoint.x;
        break;
      case 'y':
        delta = currentPoint.y - startPoint.y;
        break;
      case 'z':
        delta = currentPoint.z - startPoint.z;
        break;
    }
    
    // Only update if there's significant movement
    if (Math.abs(delta) > 0.005) {
      onAxisDrag(axis, delta);
      dragStartRef.current = currentPoint.clone();
    }
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    setDragging(false);
    dragStartRef.current = null;
  };

  const handlePointerEnter = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'grab';
  };

  const handlePointerLeave = (e: any) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const arrowColor = dragging ? "#FFFFFF" : (hovered ? "#FFFF00" : color);

  return (
    <group ref={meshRef} position={position} rotation={rotation}>
    
      <mesh
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <cylinderGeometry args={[0.025, 0.025, 0.2, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

    
      <mesh
        position={[0, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <cylinderGeometry args={[0.01, 0.01, 0.18, 8]} />
        <meshBasicMaterial 
          color={arrowColor}
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={0.9}
        />
      </mesh>

     
      <mesh 
        position={[0, 0.11, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <coneGeometry args={[0.03, 0.08, 8]} />
        <meshBasicMaterial 
          color={arrowColor}
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={0.9}
        />
      </mesh>


      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial 
          color={arrowColor}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function TransformGizmo({ position, onMove, visible }: TransformGizmoProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Keep gizmo facing camera
  useFrame(() => {
    if (groupRef.current && visible) {
      // Calculate direction from gizmo to camera
      const direction = new THREE.Vector3();
      direction.subVectors(camera.position, new THREE.Vector3(...position));
      
      // Only rotate around Y axis to keep gizmo upright
      const angle = Math.atan2(direction.x, direction.z);
      groupRef.current.rotation.y = angle;
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={position}>
 
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial 
          color="#FFFFFF" 
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={0.8}
        />
      </mesh>

 
      <AxisArrow
        axis="x"
        color="#FF0000"
        position={[0.12, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        onAxisDrag={onMove}
      />

    
      <AxisArrow
        axis="y"
        color="#00FF00"
        position={[0, 0.12, 0]}
        rotation={[0, 0, 0]}
        onAxisDrag={onMove}
      />

    
      <AxisArrow
        axis="z"
        color="#0000FF"
        position={[0, 0, 0.12]}
        rotation={[Math.PI / 2, 0, 0]}
        onAxisDrag={onMove}
      />

   
      <mesh renderOrder={9999}>
        <boxGeometry args={[0.001, 0.001, 0.001]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
} 
*/}

import { useState, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface TransformGizmoProps {
  position: [number, number, number];
  onMove: (axis: 'x' | 'y' | 'z', delta: number) => void;
  visible: boolean;
}

interface AxisArrowProps {
  axis: 'x' | 'y' | 'z';
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  onAxisDrag: (axis: 'x' | 'y' | 'z', delta: number) => void;
}

function AxisArrow({ axis, color, position, rotation, onAxisDrag }: AxisArrowProps) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<THREE.Vector3 | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    console.log(`[AxisArrow-${axis}] Component mounted`);
  }, [axis]);

  const handlePointerDown = (e: any) => {
    console.log(`[AxisArrow-${axis}] ⬇️  onPointerDown - START DRAG`);
    
    e.stopPropagation();
    setDragging(true);

  
    if (e.point) {
      dragStartRef.current = new THREE.Vector3(e.point.x, e.point.y, e.point.z);
      console.log(`[AxisArrow-${axis}] Drag reference set:`, dragStartRef.current);
    }
  };

  const handlePointerMove = (e: any) => {
    if (!dragging || !dragStartRef.current) {
      return;
    }

    e.stopPropagation();

    if (!e.point) return;

    const currentPoint = new THREE.Vector3(e.point.x, e.point.y, e.point.z);

    let delta = 0;
    switch (axis) {
      case 'x':
        delta = currentPoint.x - dragStartRef.current.x;
        break;
      case 'y':
        delta = currentPoint.y - dragStartRef.current.y;
        break;
      case 'z':
        delta = currentPoint.z - dragStartRef.current.z;
        break;
    }

    if (Math.abs(delta) > 0.001) {
      console.log(`[AxisArrow-${axis}] 🔄 onPointerMove - delta: ${delta.toFixed(4)}`);
      dragStartRef.current = currentPoint;
      onAxisDrag(axis, delta);
    }
  };

  const handlePointerUp = (e: any) => {
    if (!dragging) return;

    console.log(`[AxisArrow-${axis}] ⬆️  onPointerUp - END DRAG`);
    
    e.stopPropagation();
    setDragging(false);
    dragStartRef.current = null;
  };

  useEffect(() => {
    if (!dragging) return;

    const handleGlobalPointerUp = (e: PointerEvent) => {
      console.log(`[AxisArrow-${axis}] ⬆️ onPointerUp - END DRAG (global)`);
      setDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      document.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [dragging, axis]);

  const handlePointerEnter = (e: any) => {
    console.log(`[AxisArrow-${axis}] 👆 onPointerEnter - HOVER ON`);
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'grab';
  };

  const handlePointerLeave = (e: any) => {
    if (dragging) return; 

    console.log(`[AxisArrow-${axis}] 👋 onPointerLeave - HOVER OFF`);
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const arrowColor = dragging ? "#000000" : (hovered ? "#FFFF00" : color);

  return (
    <group position={position} rotation={rotation}>
   
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        userData={{ isGizmo: true, axis }}
      >
      
        <cylinderGeometry args={[0.2, 0.2, 0.7, 8]} />
        <meshBasicMaterial 
          visible={true}
          depthTest={false}
          depthWrite={true}
        />
      </mesh>

    
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.22, 12]} />
        <meshBasicMaterial 
          color={arrowColor}
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={0.95}
        />
      </mesh>


      <mesh position={[0, 0.14, 0]}>
        <coneGeometry args={[0.05, 0.12, 12]} />
        <meshBasicMaterial 
          color={arrowColor}
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={0.95}
        />
      </mesh>

   
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial 
          color={arrowColor}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function TransformGizmo({ position, onMove, visible }: TransformGizmoProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useEffect(() => {
    console.log(`[TransformGizmo] Mounted, visible: ${visible}`);
  }, []);


  useFrame(() => {
    if (groupRef.current && visible && camera) {
      const gizmoPos = new THREE.Vector3(...position);
      const direction = new THREE.Vector3();
      direction.subVectors(camera.position, gizmoPos);

      const angle = Math.atan2(direction.x, direction.z);
      groupRef.current.rotation.y = angle;
    }
  });

  if (!visible) {
    return null;
  }

  console.log(`[TransformGizmo] Rendering at position:`, position);

  return (
    <group 
      ref={groupRef} 
      position={position}
      userData={{ isGizmo: true }}
    >
    
      <mesh userData={{ isGizmo: true }}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial 
          color="#000000" 
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={0.7}
        />
      </mesh>


      <AxisArrow
        axis="x"
        color="#FF0000"
        position={[0.18, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        onAxisDrag={(axis, delta) => {
          console.log(`[TransformGizmo] Callback: axis=${axis}, delta=${delta.toFixed(4)}`);
          onMove(axis, delta);
        }}
      />

   
      <AxisArrow
        axis="y"
        color="#00FF00"
        position={[0, 0.18, 0]}
        rotation={[0, 0, 0]}
        onAxisDrag={(axis, delta) => {
          console.log(`[TransformGizmo] Callback: axis=${axis}, delta=${delta.toFixed(4)}`);
          onMove(axis, delta);
        }}
      />


      <AxisArrow
        axis="z"
        color="#0000FF"
        position={[0, 0, 0.18]}
        rotation={[Math.PI / 2, 0, 0]}
        onAxisDrag={(axis, delta) => {
          console.log(`[TransformGizmo] Callback: axis=${axis}, delta=${delta.toFixed(4)}`);
          onMove(axis, delta);
        }}
      />
    </group>
  );
}