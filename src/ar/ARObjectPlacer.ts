import * as THREE from "three";
import { ARHitTestManager } from "./ARHitTestManager";
import { ARConfig, ARObjectPlacement, ARHitTestResult } from "./types";
export class ARObjectPlacer extends ARHitTestManager {
  protected placedObjects: Map<string, THREE.Object3D> = new Map();
  protected objectGroup: THREE.Group;
  protected selectedObjectId: string | null = null;

  constructor(config: ARConfig = {}) {
    super(config);
    
    this.objectGroup = new THREE.Group();
    this.objectGroup.name = "ARPlacedObjects";
  }

  public placeObject(
    hitResult: ARHitTestResult,
    object: THREE.Object3D,
    id: string
  ): THREE.Object3D | null {
    if (!this.isActive()) {
      console.warn("Cannot place object: AR session not active");
      return null;
    }

    const clonedObject = object.clone();
    clonedObject.name = id;
    
    // Check if placing on a wall
    const isWall = hitResult.normal && Math.abs(hitResult.normal.y) < 0.4;
    
    if (isWall && hitResult.normal) {
      // Place on wall
      const wallNormal = hitResult.normal.clone().normalize();
      
      const worldUp = new THREE.Vector3(0, 1, 0);
      
      const right = new THREE.Vector3().crossVectors(wallNormal, worldUp).normalize();
      
      if (right.length() < 0.1) {
        right.set(1, 0, 0);
        if (wallNormal.x < 0) right.negate();
      }
      
      const correctedUp = new THREE.Vector3().crossVectors(right, wallNormal).normalize();
      
      const forward = wallNormal.clone().negate();
      
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeBasis(
        right,        // X axis (right)
        correctedUp,  // Y axis (up)
        forward       // Z axis (forward, away from wall)
      );
      
      const wallRotation = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
      clonedObject.quaternion.copy(wallRotation);
      
      clonedObject.userData.isOnWall = true;
      clonedObject.userData.wallNormal = wallNormal.clone();
      clonedObject.userData.wallPosition = hitResult.position.clone();
    } else {
      clonedObject.quaternion.copy(hitResult.rotation);
      clonedObject.userData.isOnWall = false;
      clonedObject.userData.wallNormal = null;
    }
    
    clonedObject.position.copy(hitResult.position);
    
    this.objectGroup.add(clonedObject);

    this.placedObjects.set(id, clonedObject);
    
    return clonedObject;
  }

  public placeObjectAt(
    position: THREE.Vector3,
    rotation: THREE.Quaternion,
    object: THREE.Object3D,
    id: string,
    scale: number = 1
  ): THREE.Object3D | null {
    if (!this.isActive()) {
      console.warn("Cannot place object: AR session not active");
      return null;
    }

    const clonedObject = object.clone();
    clonedObject.name = id;
    
    clonedObject.position.copy(position);
    clonedObject.quaternion.copy(rotation);
    clonedObject.scale.set(scale, scale, scale);
    
    this.objectGroup.add(clonedObject);
    
    this.placedObjects.set(id, clonedObject);
    
    return clonedObject;
  }


  public updateObjectPosition(id: string, position: THREE.Vector3): boolean {
    const object = this.placedObjects.get(id);
    if (!object) {
      console.warn(`Object not found: ${id}`);
      return false;
    }

    // If object is on a wall, constrain movement to the wall plane
    if (object.userData.isOnWall && object.userData.wallNormal) {
      const wallNormal = object.userData.wallNormal as THREE.Vector3;
      const currentPosition = object.position.clone();
      
      const delta = new THREE.Vector3().subVectors(position, currentPosition);
      
      const distanceAlongNormal = delta.dot(wallNormal);
      const projectedDelta = delta.clone().sub(
        wallNormal.clone().multiplyScalar(distanceAlongNormal)
      );
      
      const newPositionOnPlane = currentPosition.clone().add(projectedDelta);
      
      const toNewPosition = new THREE.Vector3().subVectors(newPositionOnPlane, currentPosition);
      const distanceFromWall = toNewPosition.dot(wallNormal);
      position = newPositionOnPlane.clone().sub(
        wallNormal.clone().multiplyScalar(distanceFromWall)
      );
    }

    // Check collision before applying
    if (!this.checkPositionCollision(object, position)) {
      return false;
    }

    object.position.copy(position);
    
    if (object.userData.isOnWall && object.userData.wallNormal) {
      object.userData.wallPosition = position.clone();
    }
    
    object.updateMatrix();
    object.updateMatrixWorld(true);
    return true;
  }


  public updateObjectRotation(id: string, rotation: THREE.Quaternion): boolean {
    const object = this.placedObjects.get(id);
    if (!object) {
      console.warn(`Object not found: ${id}`);
      return false;
    }

    if (object.userData.isOnWall && object.userData.wallNormal) {
      const originalQuaternion = object.quaternion.clone();
      object.quaternion.copy(rotation);
      object.updateMatrix();
      object.updateMatrixWorld(true);
      
      // Check if rotation causes collision
      if (!this.checkRotationCollision(object, rotation)) {
        // Restore original rotation if collision detected
        object.quaternion.copy(originalQuaternion);
        object.updateMatrix();
        object.updateMatrixWorld(true);
        return false;
      }
      
      const wallNormal = object.userData.wallNormal as THREE.Vector3;
      const wallPosition = object.userData.wallPosition as THREE.Vector3;
      
      const toObject = new THREE.Vector3().subVectors(object.position, wallPosition);
      const distanceFromWall = toObject.dot(wallNormal);
      const projectedPosition = object.position.clone().sub(
        wallNormal.clone().multiplyScalar(distanceFromWall)
      );
      
      object.position.copy(projectedPosition);
      object.userData.wallPosition = projectedPosition.clone();
    } else {
      if (!this.checkRotationCollision(object, rotation)) {
        return false;
      }
      object.quaternion.copy(rotation);
    }

    object.updateMatrix();
    object.updateMatrixWorld(true);
    return true;
  }

  public updateObjectScale(id: string, scale: number): boolean {
    const object = this.placedObjects.get(id);
    if (!object) {
      console.warn(`Object not found: ${id}`);
      return false;
    }

    // Check collision before applying
    if (!this.checkScaleCollision(object, scale)) {
      return false;
    }

    object.scale.set(scale, scale, scale);
    object.updateMatrix();
    object.updateMatrixWorld(true);
    return true;
  }

  // Check if position would cause collision with boundaries
  private checkPositionCollision(object: THREE.Object3D, newPosition: THREE.Vector3): boolean {
    const originalPosition = object.position.clone();
    const originalRotation = object.quaternion.clone();
    const originalScale = object.scale.clone();
    
    object.position.copy(newPosition);
    object.updateMatrix();
    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    
    // Restore original state
    object.position.copy(originalPosition);
    object.quaternion.copy(originalRotation);
    object.scale.copy(originalScale);
    object.updateMatrix();
    object.updateMatrixWorld(true);

    // Check boundaries
    const FLOOR_Y = -0.2;
    const CEILING_Y = 2.5;
    const MAX_DISTANCE = 5.0;

    // Check floor collision
    if (box.min.y < FLOOR_Y) {
      return false;
    }

    // Check ceiling collision
    if (box.max.y > CEILING_Y) {
      return false;
    }

    // Check wall collisions
    // Check X boundaries (left/right walls)
    if (box.min.x < -MAX_DISTANCE || box.max.x > MAX_DISTANCE) {
      return false;
    }

    // Check Z boundaries (front/back walls)
    if (box.min.z < -MAX_DISTANCE || box.max.z > MAX_DISTANCE) {
      return false;
    }

    if (object.userData.isOnWall && object.userData.wallNormal) {
      const wallNormal = object.userData.wallNormal as THREE.Vector3;
      
      const objectCenter = box.getCenter(new THREE.Vector3());
      
      const objectPositionOnPlane = newPosition.clone();
      const toCenter = new THREE.Vector3().subVectors(objectCenter, objectPositionOnPlane);
      
      const boxSize = box.getSize(new THREE.Vector3());
      const centerDistanceFromPlane = Math.abs(toCenter.dot(wallNormal));
      
      const maxObjectDimension = Math.max(boxSize.x, boxSize.y, boxSize.z);
      
      const maxAllowedDistance = maxObjectDimension * 1.2;
      
      if (centerDistanceFromPlane > maxAllowedDistance) {
        return false;
      }
    }

    return true;
  }

  // Check if rotation would cause collision with boundaries
  private checkRotationCollision(object: THREE.Object3D, newRotation: THREE.Quaternion): boolean {
    const originalRotation = object.quaternion.clone();
    object.quaternion.copy(newRotation);
    object.updateMatrix();
    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    
    object.quaternion.copy(originalRotation);
    object.updateMatrix();
    object.updateMatrixWorld(true);

    // Check boundaries
    const FLOOR_Y = -0.2;
    const CEILING_Y = 2.5;
    const MAX_DISTANCE = 5.0;

    // Check floor and ceiling
    if (box.min.y < FLOOR_Y || box.max.y > CEILING_Y) {
      return false;
    }

    // Check wall collisions
    // Check X boundaries (left/right walls)
    if (box.min.x < -MAX_DISTANCE || box.max.x > MAX_DISTANCE) {
      return false;
    }

    // Check Z boundaries (front/back walls)
    if (box.min.z < -MAX_DISTANCE || box.max.z > MAX_DISTANCE) {
      return false;
    }

    if (object.userData.isOnWall && object.userData.wallNormal) {
      const wallNormal = object.userData.wallNormal as THREE.Vector3;
      
      const objectPositionOnPlane = object.position.clone();
      
      const objectCenter = box.getCenter(new THREE.Vector3());
      const boxSize = box.getSize(new THREE.Vector3());
      const toCenter = new THREE.Vector3().subVectors(objectCenter, objectPositionOnPlane);
      const centerDistanceFromPlane = Math.abs(toCenter.dot(wallNormal));
      
      const maxObjectDimension = Math.max(boxSize.x, boxSize.y, boxSize.z);
      
      const maxAllowedDistance = maxObjectDimension * 1.2;
      
      if (centerDistanceFromPlane > maxAllowedDistance) {
        return false;
      }
    }

    return true;
  }

  // Check if scale would cause collision with boundaries
  private checkScaleCollision(object: THREE.Object3D, newScale: number): boolean {
    const originalScale = object.scale.clone();
    object.scale.set(newScale, newScale, newScale);
    object.updateMatrix();
    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    
    object.scale.copy(originalScale);
    object.updateMatrix();
    object.updateMatrixWorld(true);

    // Check boundaries
    const FLOOR_Y = -0.2;
    const CEILING_Y = 2.5;
    const MAX_DISTANCE = 5.0;

    // Check floor and ceiling
    if (box.min.y < FLOOR_Y || box.max.y > CEILING_Y) {
      return false;
    }

    // Check wall collisions
    // Check X boundaries (left/right walls)
    if (box.min.x < -MAX_DISTANCE || box.max.x > MAX_DISTANCE) {
      return false;
    }

    // Check Z boundaries (front/back walls)
    if (box.min.z < -MAX_DISTANCE || box.max.z > MAX_DISTANCE) {
      return false;
    }

    return true;
  }

  public removeObject(id: string): boolean {
    const object = this.placedObjects.get(id);
    if (!object) {
      console.warn(`Object not found: ${id}`);
      return false;
    }

    this.objectGroup.remove(object);
    this.placedObjects.delete(id);
    
    if (this.selectedObjectId === id) {
      this.selectedObjectId = null;
    }
    
    return true;
  }

  public getObject(id: string): THREE.Object3D | undefined {
    return this.placedObjects.get(id);
  }

  public getAllObjects(): THREE.Object3D[] {
    return Array.from(this.placedObjects.values());
  }

  public getObjectGroup(): THREE.Group {
    return this.objectGroup;
  }

  public selectObject(id: string): boolean {
    if (!this.placedObjects.has(id)) {
      return false;
    }
    this.selectedObjectId = id;
    return true;
  }

  public deselectObject(): void {
    this.selectedObjectId = null;
  }

  public getSelectedObject(): THREE.Object3D | null {
    if (!this.selectedObjectId) {
      return null;
    }
    return this.placedObjects.get(this.selectedObjectId) || null;
  }

  public clearAllObjects(): void {
    this.placedObjects.forEach((object) => {
      this.objectGroup.remove(object);
    });
    this.placedObjects.clear();
    this.selectedObjectId = null;
  }


  public getPlacementData(): ARObjectPlacement[] {
    const placements: ARObjectPlacement[] = [];
    
    this.placedObjects.forEach((object, id) => {
      placements.push({
        id,
        position: object.position.clone(),
        rotation: object.quaternion.clone(),
        scale: object.scale.x,
        modelId: undefined
      });
    });
    
    return placements;
  }

  public dispose(): void {
    this.clearAllObjects();
    
    if (this.objectGroup.parent) {
      this.objectGroup.parent.remove(this.objectGroup);
    }
    
    super.dispose();
  }
}

