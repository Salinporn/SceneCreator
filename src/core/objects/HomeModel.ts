import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Base3DObject } from './Base3DObject';

export interface Boundary {
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  min_z: number;
  max_z: number;
}

export interface CalibrationTransform {
  position: [number, number, number];
  rotation: [number, number, number];
}

export class HomeModel extends Base3DObject {
  protected boundary: Boundary | null = null;
  protected loader: GLTFLoader;
  protected boundingBox: THREE.Box3 | null = null;
  protected calibrationApplied: boolean = false;
  protected calibrationTransform: CalibrationTransform | null = null;

  constructor(
    id: string,
    name: string,
    modelId: number,
    modelPath: string | null,
    boundary?: Boundary
  ) {
    super(id, name, modelId, modelPath, {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    });
    
    this.loader = new GLTFLoader();
    
    if (boundary) {
      this.setBoundary(boundary);
    }
  }

  applyCalibration(transform: CalibrationTransform): void {
    this.calibrationTransform = transform;
    this.setPosition(transform.position);
    this.setRotation(transform.rotation);
    this.calibrationApplied = true;
    
    // Recalculate bounding box after applying calibration
    this.calculateBoundingBox();
    
    console.log(`[HomeModel] Calibration applied:`, {
      position: transform.position,
      rotation: transform.rotation,
    });
  }

  getCalibrationTransform(): CalibrationTransform | null {
    return this.calibrationTransform;
  }

  isCalibrated(): boolean {
    return this.calibrationApplied;
  }

  resetCalibration(): void {
    this.calibrationTransform = null;
    this.setPosition([0, 0, 0]);
    this.setRotation([0, 0, 0]);
    this.calibrationApplied = false;
    this.calculateBoundingBox();
    console.log(`[HomeModel] Calibration reset`);
  }

  localToWorld(localPoint: [number, number, number]): [number, number, number] {
    const point = new THREE.Vector3(localPoint[0], localPoint[1], localPoint[2]);
    this.group.localToWorld(point);
    return [point.x, point.y, point.z];
  }

  worldToLocal(worldPoint: [number, number, number]): [number, number, number] {
    const point = new THREE.Vector3(worldPoint[0], worldPoint[1], worldPoint[2]);
    this.group.worldToLocal(point);
    return [point.x, point.y, point.z];
  }

  protected async fetchModel(path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => resolve(gltf.scene),
        undefined,
        reject
      );
    });
  }

  protected setupModel(model: THREE.Group): void {
    const clonedModel = model.clone();
    this.modelGroup.clear();
    
    // Align to floor
    const box = new THREE.Box3().setFromObject(clonedModel);
    const minY = box.min.y;
    clonedModel.position.y = -minY;
    
    this.modelGroup.add(clonedModel);
    
    this.calculateBoundingBox();
  }

  setBoundary(boundary: Boundary): void {
    this.boundary = boundary;
    this.boundingBox = new THREE.Box3(
      new THREE.Vector3(boundary.min_x, boundary.min_y, boundary.min_z),
      new THREE.Vector3(boundary.max_x, boundary.max_y, boundary.max_z)
    );
  }

  getBoundary(): Boundary | null {
    return this.boundary ? { ...this.boundary } : null;
  }

  getBoundingBox(): THREE.Box3 | null {
    return this.boundingBox;
  }

  protected calculateBoundingBox(): void {
    if (this.modelGroup.children.length === 0) return;
    
    const box = new THREE.Box3().setFromObject(this.group);
    
    if (!this.boundary) {
      this.boundary = {
        min_x: box.min.x,
        max_x: box.max.x,
        min_y: box.min.y,
        max_y: box.max.y,
        min_z: box.min.z,
        max_z: box.max.z,
      };
      this.boundingBox = box;
    }
  }

  containsPoint(point: THREE.Vector3): boolean {
    if (!this.boundingBox) return true;
    return this.boundingBox.containsPoint(point);
  }

  intersectsBox(box: THREE.Box3): boolean {
    if (!this.boundingBox) return false;
    return this.boundingBox.intersectsBox(box);
  }

  constrainPosition(position: THREE.Vector3): THREE.Vector3 {
    if (!this.boundingBox) return position.clone();
    
    const constrained = position.clone();
    constrained.clamp(this.boundingBox.min, this.boundingBox.max);
    return constrained;
  }

  canFitObject(position: THREE.Vector3, size: THREE.Vector3): boolean {
    if (!this.boundingBox) return true;
    
    const halfSize = size.clone().multiplyScalar(0.5);
    const minPoint = position.clone().sub(halfSize);
    const maxPoint = position.clone().add(halfSize);
    
    return (
      minPoint.x >= this.boundingBox.min.x &&
      maxPoint.x <= this.boundingBox.max.x &&
      minPoint.y >= this.boundingBox.min.y &&
      maxPoint.y <= this.boundingBox.max.y &&
      minPoint.z >= this.boundingBox.min.z &&
      maxPoint.z <= this.boundingBox.max.z
    );
  }

  getFloorLevel(): number {
    return this.boundingBox?.min.y || 0;
  }

  getCeilingLevel(): number {
    return this.boundingBox?.max.y || 3;
  }

  serialize(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      home_id: this.modelId,
      boundary: this.boundary,
      position: this.getPosition(),
      rotation: this.getRotation(),
      scale: this.getScale(),
      calibration: this.calibrationTransform,
      isCalibrated: this.calibrationApplied,
    };
  }

  getTransformedBoundingBox(): THREE.Box3 | null {
    if (!this.boundingBox) return null;
    
    // Clone and transform the bounding box
    const transformedBox = this.boundingBox.clone();
    
    // Apply group's world matrix
    transformedBox.applyMatrix4(this.group.matrixWorld);
    
    return transformedBox;
  }
}