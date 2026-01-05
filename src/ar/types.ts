import * as THREE from "three";

export interface ARConfig {
  requiredFeatures?: string[];
  optionalFeatures?: string[];
  domOverlay?: { root: HTMLElement };
  hitTestSourceRequestMode?: "point" | "plane" | "mesh";
}

export interface ARHitTestResult {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  matrix: THREE.Matrix4;
  distance: number;
  normal?: THREE.Vector3; // Surface normal vector
}


export interface ARObjectPlacement {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: number;
  modelId?: number;
}


export enum ARSessionState {
  Idle = "idle",
  Initializing = "initializing",
  Running = "running",
  Paused = "paused",
  Ended = "ended",
  Error = "error"
}

