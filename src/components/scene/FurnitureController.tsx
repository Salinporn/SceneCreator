import * as React from "react";
import * as THREE from "three";
import { ThreeEvent, useThree, useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { useGLTF } from "@react-three/drei";
import { PlacedItem } from "../types/Furniture";
import { collisionDetector } from "../../utils/CollisionDetection";

interface DraggableFurnitureProps {
  item: PlacedItem;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (newPosition: [number, number, number]) => void;
  onRotationChange: (newRotation: [number, number, number]) => void;
  onCollisionDetected?: (hasCollision: boolean) => void;
  navigationMode: boolean;
}

function DraggableFurniture({
  item,
  isSelected,
  onSelect,
  onPositionChange,
  onRotationChange,
  onCollisionDetected,
  navigationMode,
}: DraggableFurnitureProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  const modelRef = React.useRef<THREE.Group>(null);
  const xr = useXR();
  const camera = useThree((state) => state.camera);
  const isPresenting = !!xr.session;
  const [hasCollision, setHasCollision] = React.useState(false);
  const [_modelHeight, setModelHeight] = React.useState(0);

  const { scene } = item.modelPath ? useGLTF(item.modelPath) : { scene: null };

  React.useEffect(() => {
    if (!modelRef.current || !scene) return;

    const clonedScene = scene.clone();
    modelRef.current.clear();

    const box = new THREE.Box3().setFromObject(clonedScene);
    const minY = box.min.y;
    
    setModelHeight(-minY);
    clonedScene.position.y = -minY;
    modelRef.current.add(clonedScene);
  }, [scene, item.modelPath]);

  // Update collision detection when position changes
  React.useEffect(() => {
    if (!groupRef.current) return;
    
    const itemId = `${item.id}`;
    collisionDetector.updateFurnitureBox(itemId, groupRef.current);
    
    // Check for collisions
    const collision = collisionDetector.checkAllCollisions(itemId);
    setHasCollision(collision.hasCollision);
    
    if (onCollisionDetected) {
      onCollisionDetected(collision.hasCollision);
    }
    
    if (collision.hasCollision) {
      console.warn('⚠️ Collision detected for', item.name, ':', collision.collidingObjects);
    }
  }, [item.position, item.rotation, item.scale]);

  React.useEffect(() => {
    return () => {
      const itemId = `${item.id}`;
      collisionDetector.removeFurniture(itemId);
    };
  }, [item.id]);

  useFrame((_state, delta) => {
    // Disable furniture editing when in navigation mode
    if (navigationMode || !isSelected || !groupRef.current || !isPresenting) return; 

    const session = xr.session;
    const referenceSpace = xr.originReferenceSpace;
    if (!session || !referenceSpace) return;

    const inputSources = session.inputSources;
    if (!inputSources || inputSources.length === 0) return;

    const moveSpeed = 1.5;
    const rotateSpeed = 1.5; 
    const deadzone = 0.1;
    const moveVector = new THREE.Vector3(0, 0, 0);
    let rotateDelta = 0;

    for (const inputSource of inputSources) {
      const gamepad = inputSource.gamepad;
      if (!gamepad || gamepad.axes.length < 4) continue;

      if (inputSource.handedness === 'right') {
        const dx = gamepad.axes[2];
        const dy = gamepad.axes[3];
        if (typeof dx === 'number' && !isNaN(dx) && Math.abs(dx) > deadzone) moveVector.x = dx;
        if (typeof dy === 'number' && !isNaN(dy) && Math.abs(dy) > deadzone) moveVector.z = dy;

      } else if (inputSource.handedness === 'left') {
        const dr = gamepad.axes[2];
        if (typeof dr === 'number' && !isNaN(dr) && Math.abs(dr) > deadzone) {
          rotateDelta = -dr;
        }
      }
    }

    if (moveVector.length() > deadzone) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      right.y = 0;
      right.normalize();

      const deltaPosition = new THREE.Vector3();
      deltaPosition.addScaledVector(forward, -moveVector.z * moveSpeed * delta);
      deltaPosition.addScaledVector(right, moveVector.x * moveSpeed * delta);

      const currentPosition = new THREE.Vector3().fromArray(item.position);
      const newPosition = currentPosition.clone().add(deltaPosition);
      newPosition.y = 0; // Keep at floor level

      // Check if new position is valid
      const itemId = `${item.id}`;
      const tempPosition = groupRef.current.position.clone();
      groupRef.current.position.copy(newPosition);
      collisionDetector.updateFurnitureBox(itemId, groupRef.current);
      
      const collision = collisionDetector.checkAllCollisions(itemId);

      if (!collision.hasCollision) {
        // Position is valid, update
        onPositionChange([newPosition.x, 0, newPosition.z]);
      } else {
        // Try to find a valid position nearby
        const validPosition = collisionDetector.findValidPosition(
          itemId,
          newPosition,
          groupRef.current,
          4
        );
        
        if (validPosition) {
          onPositionChange([validPosition.x, 0, validPosition.z]);
        } else {
          // Revert to original position
          groupRef.current.position.copy(tempPosition);
          collisionDetector.updateFurnitureBox(itemId, groupRef.current);
        }
      }
    }

    if (Math.abs(rotateDelta) > deadzone) {
      const deltaRotation = rotateDelta * rotateSpeed * delta;
      const currentRotationY = (item.rotation && typeof item.rotation[1] === 'number' && !isNaN(item.rotation[1])) ? item.rotation[1] : 0;
      const newRotationY = currentRotationY + deltaRotation;
      onRotationChange([0, newRotationY, 0]);
    }
  });

  const handleSelect = (e: ThreeEvent<PointerEvent>) => {
    if (navigationMode) return;
    e.stopPropagation();
    onSelect();
  };

  return (
    <group
      ref={groupRef}
      position={item.position}
      rotation={item.rotation}
      scale={item.scale || 1}
      onPointerDown={handleSelect}
    >
      <group ref={modelRef} />
      
      {isSelected && !navigationMode && (
        <>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.35, 32]} />
            <meshBasicMaterial 
              color={hasCollision ? "#ff0000" : "#00ff00"} 
              transparent 
              opacity={0.7} 
              side={THREE.DoubleSide} 
            />
          </mesh>
          <mesh position={[0, 0.01, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.05, 0.1, 8]} />
            <meshBasicMaterial color={hasCollision ? "#ff0000" : "#ffff00"} />
          </mesh>
        </>
      )}

      {hasCollision && !isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.3, 32]} />
          <meshBasicMaterial 
            color="#ff6600" 
            transparent 
            opacity={0.5} 
            side={THREE.DoubleSide} 
          />
        </mesh>
      )}
    </group>
  );
}
 
export function PlacedFurniture({ 
  items, 
  selectedIndex, 
  onSelectItem, 
  onUpdatePosition, 
  onUpdateRotation,
  navigationMode = false,
}: {
  items: PlacedItem[];
  selectedIndex: number | null;
  onSelectItem: (index: number) => void;
  onUpdatePosition: (index: number, newPosition: [number, number, number]) => void;
  onUpdateRotation: (index: number, newRotation: [number, number, number]) => void;
  navigationMode?: boolean;
}) {
  return (
    <>
      {items.map((item: PlacedItem, index: number) => (
        <DraggableFurniture
          key={`${item.id}-${index}`}
          item={item}
          isSelected={selectedIndex === index}
          onSelect={() => onSelectItem(index)}
          onPositionChange={(newPosition) => onUpdatePosition(index, newPosition)}
          onRotationChange={(newRotation) => onUpdateRotation(index, newRotation)}
          navigationMode={navigationMode}
        />
      ))}
    </>
  );
}

export function SpawnManager({ 
  spawnPositionRef 
}: { 
  spawnPositionRef: React.MutableRefObject<[number, number, number]>
}) {
  const camera = useThree((state) => state.camera);
  
  useFrame(() => {
    if (!camera) return;
    
    const cameraWorldPos = new THREE.Vector3();
    camera.getWorldPosition(cameraWorldPos);
    
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    const spawnDistance = 2;
    const spawnPos = cameraWorldPos.clone();
    spawnPos.addScaledVector(cameraDirection, spawnDistance);
    
    spawnPos.y = 0;
    
    spawnPositionRef.current = [spawnPos.x, 0, spawnPos.z];
  });
  
  return null;
}