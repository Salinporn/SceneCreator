import { useState, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface RotationGizmoProps {
  position: [number, number, number];
  onRotate: (axis: 'x' | 'y' | 'z', deltaRadians: number) => void;
  visible: boolean;
  currentRotation?: [number, number, number];
}

interface RotationArcProps {
  axis: 'x' | 'y' | 'z';
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  radius: number;
  onAxisDrag: (axis: 'x' | 'y' | 'z', deltaRadians: number) => void;
}

function createArcCurve(radius: number) {
  const points: THREE.Vector3[] = [];
  const segments = 128;
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * (Math.PI * 1.5); 
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    points.push(new THREE.Vector3(x, y, 0));
  }
  
  return new THREE.CatmullRomCurve3(points);
}


function RotationArc({ axis, color, position, rotation, radius, onAxisDrag }: RotationArcProps) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  

  const dragStartAngle = useRef<number | null>(null);
  const dragPlane = useRef<THREE.Plane | null>(null);
  const dragPoint = useRef<THREE.Vector3 | null>(null);
  const hitboxRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  

  useEffect(() => {
    console.log(`[RotationArc-${axis}] ✅ Mounted`);
  }, [axis]);

  const handlePointerDown = (e: any) => {
    console.log(`[RotationArc-${axis}] ⬇️ POINTER DOWN at:`, e.point);
    e.stopPropagation();
    
    setDragging(true);
    
  
    if (e.point && groupRef.current) {
      const worldPoint = new THREE.Vector3(e.point.x, e.point.y, e.point.z);
      const localPoint = worldPoint.clone();
      
 
      groupRef.current.worldToLocal(localPoint);
      
  
      dragStartAngle.current = Math.atan2(localPoint.y, localPoint.x);
      dragPoint.current = worldPoint.clone();
      
  
      const groupWorldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(groupWorldPos);
      
      let planeNormal = new THREE.Vector3(0, 0, 1);
      switch (axis) {
        case 'x':
          planeNormal = new THREE.Vector3(1, 0, 0);
          break;
        case 'y':
          planeNormal = new THREE.Vector3(0, 1, 0);
          break;
        case 'z':
          planeNormal = new THREE.Vector3(0, 0, 1);
          break;
      }
      
    
      const quatRotation = new THREE.Quaternion();
      groupRef.current.getWorldQuaternion(quatRotation);
      planeNormal.applyQuaternion(quatRotation);
      
      dragPlane.current = new THREE.Plane(planeNormal, 0);
      dragPlane.current.setFromNormalAndCoplanarPoint(planeNormal, groupWorldPos);
      
      console.log(`[RotationArc-${axis}] Initial angle: ${(dragStartAngle.current * 180 / Math.PI).toFixed(1)}°`);
    }
    

    if (e.target?.setPointerCapture) {
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch (err) {
        
      }
    }
  };

  const handlePointerMove = (e: any) => {
    if (!dragging || dragStartAngle.current === null || !groupRef.current || !dragPlane.current) return;


    if (e.point) {
      const currentWorldPoint = new THREE.Vector3(e.point.x, e.point.y, e.point.z);
      
     
      const localPoint = currentWorldPoint.clone();
      groupRef.current.worldToLocal(localPoint);

      const currentAngle = Math.atan2(localPoint.y, localPoint.x);
      
 
      let deltaAngle = currentAngle - dragStartAngle.current;
      

      while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
      while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
      
      if (Math.abs(deltaAngle) > 0.001) {
        console.log(`[RotationArc-${axis}] 🔄 ROTATE - ${(deltaAngle * 180 / Math.PI).toFixed(2)}°`);
        dragStartAngle.current = currentAngle;
        onAxisDrag(axis, deltaAngle);
      }
    }
  };

  const handlePointerUp = (e: any) => {
    if (!dragging) return;
    console.log(`[RotationArc-${axis}] ⬆️ POINTER UP`);
    e.stopPropagation();
    
    setDragging(false);
    dragStartAngle.current = null;
    dragPlane.current = null;
    dragPoint.current = null;
    
   
    if (e.target?.releasePointerCapture) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {
     
      }
    }
  };

  const handlePointerEnter = (e: any) => {
    if (dragging) return;
    console.log(`[RotationArc-${axis}] 👆 HOVER ON`);
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'grab';
  };

  const handlePointerLeave = (e: any) => {
    if (dragging) return;
    console.log(`[RotationArc-${axis}] 👋 HOVER OFF`);
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const arcColor = dragging ? "#FFFFFF" : (hovered ? "#FFFF00" : color);
  const arcOpacity = dragging ? 1 : (hovered ? 0.9 : 0.7);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
   
      <mesh
        ref={hitboxRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        userData={{ isGizmo: true, axis, type: 'rotation' }}
      >
        <torusGeometry
          args={[
            radius,          
            0.08,          
            16,           
            100,            
            Math.PI * 1.5    
          ]}
        />
        <meshBasicMaterial
          color="#FF00FF"
          transparent
          opacity={0}        
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

     
      <mesh userData={{ isGizmo: true, isVisual: true }}>
        <tubeGeometry
          args={[
            createArcCurve(radius),
            64,      
            0.012, 
            8,       
            false    
          ]}
        />
        <meshBasicMaterial
          color={arcColor}
          transparent
          opacity={arcOpacity}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function RotationGizmo({ 
  position, 
  onRotate, 
  visible,
  currentRotation = [0, 0, 0]
}: RotationGizmoProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const arcRadius = 0.6; 

  useEffect(() => {
    console.log(`[RotationGizmo] ✅ Mounted at position:`, position);
  }, [position]);


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

  return (
    <group
      ref={groupRef}
      position={position}
      userData={{ isGizmo: true }}
    >
     
      <mesh userData={{ isGizmo: true, isVisual: true }}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial
          color="#FFFFFF"
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>


      <RotationArc
        axis="x"
        color="#FF5555"
        position={[0, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        radius={arcRadius}
        onAxisDrag={(axis, deltaRadians) => {
          console.log(`[RotationGizmo] 🔴 X Rotate: ${(deltaRadians * 180 / Math.PI).toFixed(1)}°`);
          onRotate(axis, deltaRadians);
        }}
      />

   
      <RotationArc
        axis="y"
        color="#55FF55"
        position={[0, 0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        radius={arcRadius}
        onAxisDrag={(axis, deltaRadians) => {
          console.log(`[RotationGizmo] 🟢 Y Rotate: ${(deltaRadians * 180 / Math.PI).toFixed(1)}°`);
          onRotate(axis, deltaRadians);
        }}
      />


      <RotationArc
        axis="z"
        color="#5555FF"
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        radius={arcRadius}
        onAxisDrag={(axis, deltaRadians) => {
          console.log(`[RotationGizmo] 🔵 Z Rotate: ${(deltaRadians * 180 / Math.PI).toFixed(1)}°`);
          onRotate(axis, deltaRadians);
        }}
      />
    </group>
  );
}