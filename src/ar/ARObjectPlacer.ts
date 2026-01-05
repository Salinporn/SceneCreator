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
    
    clonedObject.position.copy(hitResult.position);
    clonedObject.quaternion.copy(hitResult.rotation);
    
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

    // Check collision before applying
    if (!this.checkPositionCollision(object, position)) {
      return false;
    }

    object.position.copy(position);
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

    // Check collision before applying
    if (!this.checkRotationCollision(object, rotation)) {
      return false;
    }

    object.quaternion.copy(rotation);
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
    object.position.copy(newPosition);
    object.updateMatrix();
    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    
    object.position.copy(originalPosition);
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

