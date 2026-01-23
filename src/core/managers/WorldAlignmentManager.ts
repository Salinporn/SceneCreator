import * as THREE from 'three';

export interface WorldAlignmentData {
  homeId: string;
  referencePosition: [number, number, number];
  referenceRotation: number;
  modelReferencePosition: [number, number, number];
  modelReferenceRotation: number;
  positionOffset: [number, number, number];
  rotationOffset: number;
  calibratedAt: string;
  version: number;
}

export interface CalibrationState {
  step: 'idle' | 'position' | 'rotation' | 'confirm' | 'complete';
  xrPosition?: THREE.Vector3;
  xrRotation?: number;
  modelPosition?: [number, number, number];
  modelRotation?: number;
}

const ALIGNMENT_STORAGE_KEY = 'scene_creator_world_alignments';
const ALIGNMENT_VERSION = 1;

export class WorldAlignmentManager {
  private static instance: WorldAlignmentManager | null = null;
  private alignments: Map<string, WorldAlignmentData> = new Map();
  private currentCalibration: CalibrationState = { step: 'idle' };
  private onCalibrationChange?: (state: CalibrationState) => void;

  private constructor() {
    this.loadAlignments();
  }

  static getInstance(): WorldAlignmentManager {
    if (!WorldAlignmentManager.instance) {
      WorldAlignmentManager.instance = new WorldAlignmentManager();
    }
    return WorldAlignmentManager.instance;
  }

  private loadAlignments(): void {
    try {
      const stored = localStorage.getItem(ALIGNMENT_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as WorldAlignmentData[];
        data.forEach(alignment => {
          if (alignment.version === ALIGNMENT_VERSION) {
            this.alignments.set(alignment.homeId, alignment);
          }
        });
        console.log(`[WorldAlignment] Loaded ${this.alignments.size} alignments`);
      }
    } catch (error) {
      console.error('[WorldAlignment] Failed to load alignments:', error);
    }
  }

  private saveAlignments(): void {
    try {
      const data = Array.from(this.alignments.values());
      localStorage.setItem(ALIGNMENT_STORAGE_KEY, JSON.stringify(data));
      console.log(`[WorldAlignment] Saved ${data.length} alignments`);
    } catch (error) {
      console.error('[WorldAlignment] Failed to save alignments:', error);
    }
  }

  hasAlignment(homeId: string): boolean {
    return this.alignments.has(homeId);
  }

  getAlignment(homeId: string): WorldAlignmentData | null {
    return this.alignments.get(homeId) || null;
  }

  clearAlignment(homeId: string): void {
    this.alignments.delete(homeId);
    this.saveAlignments();
    console.log(`[WorldAlignment] Cleared alignment for home ${homeId}`);
  }

  getCalibrationState(): CalibrationState {
    return { ...this.currentCalibration };
  }

  setCalibrationCallback(callback: (state: CalibrationState) => void): void {
    this.onCalibrationChange = callback;
  }

  startCalibration(): void {
    this.currentCalibration = { step: 'position' };
    this.notifyChange();
    console.log('[WorldAlignment] Starting calibration - position step');
  }

  cancelCalibration(): void {
    this.currentCalibration = { step: 'idle' };
    this.notifyChange();
    console.log('[WorldAlignment] Calibration cancelled');
  }

  captureXRPosition(camera: THREE.Camera): void {
    if (this.currentCalibration.step !== 'position') {
      console.warn('[WorldAlignment] Invalid step for position capture');
      return;
    }

    const worldPos = new THREE.Vector3();
    camera.getWorldPosition(worldPos);

    // Get the camera's forward direction for rotation
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const yaw = Math.atan2(direction.x, direction.z);

    this.currentCalibration.xrPosition = worldPos.clone();
    this.currentCalibration.xrRotation = yaw;
    this.currentCalibration.step = 'rotation';
    
    this.notifyChange();
    console.log('[WorldAlignment] Captured XR position:', worldPos.toArray(), 'rotation:', yaw);
  }

  setModelReferencePoint(
    position: [number, number, number],
    rotation: number
  ): void {
    if (this.currentCalibration.step !== 'rotation') {
      console.warn('[WorldAlignment] Invalid step for model reference');
      return;
    }

    this.currentCalibration.modelPosition = position;
    this.currentCalibration.modelRotation = rotation;
    this.currentCalibration.step = 'confirm';
    
    this.notifyChange();
    console.log('[WorldAlignment] Set model reference:', position, rotation);
  }

  confirmCalibration(homeId: string): WorldAlignmentData | null {
    if (this.currentCalibration.step !== 'confirm') {
      console.warn('[WorldAlignment] Invalid step for confirmation');
      return null;
    }

    const { xrPosition, xrRotation, modelPosition, modelRotation } = this.currentCalibration;
    
    if (!xrPosition || xrRotation === undefined || !modelPosition || modelRotation === undefined) {
      console.error('[WorldAlignment] Missing calibration data');
      return null;
    }

    const rotationOffset = xrRotation - modelRotation;
    
    const cosR = Math.cos(rotationOffset);
    const sinR = Math.sin(rotationOffset);
    
    const rotatedModelX = modelPosition[0] * cosR - modelPosition[2] * sinR;
    const rotatedModelZ = modelPosition[0] * sinR + modelPosition[2] * cosR;
    
    const positionOffset: [number, number, number] = [
      xrPosition.x - rotatedModelX,
      xrPosition.y - modelPosition[1],
      xrPosition.z - rotatedModelZ,
    ];

    const alignmentData: WorldAlignmentData = {
      homeId,
      referencePosition: [xrPosition.x, xrPosition.y, xrPosition.z],
      referenceRotation: xrRotation,
      modelReferencePosition: modelPosition,
      modelReferenceRotation: modelRotation,
      positionOffset,
      rotationOffset,
      calibratedAt: new Date().toISOString(),
      version: ALIGNMENT_VERSION,
    };

    this.alignments.set(homeId, alignmentData);
    this.saveAlignments();

    this.currentCalibration = { step: 'complete' };
    this.notifyChange();

    console.log('[WorldAlignment] Calibration complete:', alignmentData);
    return alignmentData;
  }

  applyAlignment(homeId: string, homeGroup: THREE.Group): boolean {
    const alignment = this.alignments.get(homeId);
    if (!alignment) {
      console.warn(`[WorldAlignment] No alignment found for home ${homeId}`);
      return false;
    }

    // Apply position offset
    homeGroup.position.set(
      alignment.positionOffset[0],
      alignment.positionOffset[1],
      alignment.positionOffset[2]
    );

    // Apply rotation offset (around Y axis)
    homeGroup.rotation.set(0, alignment.rotationOffset, 0);

    console.log('[WorldAlignment] Applied alignment:', {
      position: alignment.positionOffset,
      rotation: alignment.rotationOffset,
    });

    return true;
  }

  modelToWorldPosition(
    homeId: string,
    modelPosition: [number, number, number]
  ): [number, number, number] {
    const alignment = this.alignments.get(homeId);
    if (!alignment) {
      return modelPosition;
    }

    const cosR = Math.cos(alignment.rotationOffset);
    const sinR = Math.sin(alignment.rotationOffset);

    // Rotate model position
    const rotatedX = modelPosition[0] * cosR - modelPosition[2] * sinR;
    const rotatedZ = modelPosition[0] * sinR + modelPosition[2] * cosR;

    // Add offset
    return [
      rotatedX + alignment.positionOffset[0],
      modelPosition[1] + alignment.positionOffset[1],
      rotatedZ + alignment.positionOffset[2],
    ];
  }

  worldToModelPosition(
    homeId: string,
    worldPosition: [number, number, number]
  ): [number, number, number] {
    const alignment = this.alignments.get(homeId);
    if (!alignment) {
      return worldPosition;
    }

    // Subtract offset
    const offsetX = worldPosition[0] - alignment.positionOffset[0];
    const offsetY = worldPosition[1] - alignment.positionOffset[1];
    const offsetZ = worldPosition[2] - alignment.positionOffset[2];

    // Inverse rotation
    const cosR = Math.cos(-alignment.rotationOffset);
    const sinR = Math.sin(-alignment.rotationOffset);

    return [
      offsetX * cosR - offsetZ * sinR,
      offsetY,
      offsetX * sinR + offsetZ * cosR,
    ];
  }

  quickRecalibrate(
    homeId: string,
    camera: THREE.Camera,
    modelReferencePosition: [number, number, number],
    modelReferenceRotation: number
  ): WorldAlignmentData | null {
    const worldPos = new THREE.Vector3();
    camera.getWorldPosition(worldPos);

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const yaw = Math.atan2(direction.x, direction.z);

    const rotationOffset = yaw - modelReferenceRotation;
    
    const cosR = Math.cos(rotationOffset);
    const sinR = Math.sin(rotationOffset);
    
    const rotatedModelX = modelReferencePosition[0] * cosR - modelReferencePosition[2] * sinR;
    const rotatedModelZ = modelReferencePosition[0] * sinR + modelReferencePosition[2] * cosR;
    
    const positionOffset: [number, number, number] = [
      worldPos.x - rotatedModelX,
      worldPos.y - modelReferencePosition[1],
      worldPos.z - rotatedModelZ,
    ];

    const alignmentData: WorldAlignmentData = {
      homeId,
      referencePosition: [worldPos.x, worldPos.y, worldPos.z],
      referenceRotation: yaw,
      modelReferencePosition: modelReferencePosition,
      modelReferenceRotation: modelReferenceRotation,
      positionOffset,
      rotationOffset,
      calibratedAt: new Date().toISOString(),
      version: ALIGNMENT_VERSION,
    };

    this.alignments.set(homeId, alignmentData);
    this.saveAlignments();

    console.log('[WorldAlignment] Quick recalibration complete:', alignmentData);
    return alignmentData;
  }

  resetCalibrationState(): void {
    this.currentCalibration = { step: 'idle' };
    this.notifyChange();
  }

  private notifyChange(): void {
    if (this.onCalibrationChange) {
      this.onCalibrationChange({ ...this.currentCalibration });
    }
  }

  exportAlignment(homeId: string): string | null {
    const alignment = this.alignments.get(homeId);
    if (!alignment) return null;
    return JSON.stringify(alignment);
  }

  importAlignment(data: string): boolean {
    try {
      const alignment = JSON.parse(data) as WorldAlignmentData;
      if (alignment.version === ALIGNMENT_VERSION && alignment.homeId) {
        this.alignments.set(alignment.homeId, alignment);
        this.saveAlignments();
        return true;
      }
    } catch (error) {
      console.error('[WorldAlignment] Failed to import alignment:', error);
    }
    return false;
  }
}

