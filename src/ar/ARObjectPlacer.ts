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

    object.position.copy(position);
    return true;
  }


  public updateObjectRotation(id: string, rotation: THREE.Quaternion): boolean {
    const object = this.placedObjects.get(id);
    if (!object) {
      console.warn(`Object not found: ${id}`);
      return false;
    }

    object.quaternion.copy(rotation);
    return true;
  }

  public updateObjectScale(id: string, scale: number): boolean {
    const object = this.placedObjects.get(id);
    if (!object) {
      console.warn(`Object not found: ${id}`);
      return false;
    }

    object.scale.set(scale, scale, scale);
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

