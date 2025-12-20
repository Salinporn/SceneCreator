import * as THREE from "three";
import { ARObjectPlacer } from "./ARObjectPlacer";
import { ARConfig, ARObjectPlacement } from "./types";

export class ARSceneManager extends ARObjectPlacer {
  protected scene: THREE.Scene;
  protected camera: THREE.PerspectiveCamera | null = null;
  protected renderer: THREE.WebGLRenderer | null = null;
  protected frameCallback: ((frame: XRFrame) => void) | null = null;

  constructor(scene: THREE.Scene, config: ARConfig = {}) {
    super(config);
    
    this.scene = scene;
    this.scene.add(this.objectGroup);
  }

  public async initialize(renderer: THREE.WebGLRenderer): Promise<void> {
    await super.initialize(renderer);
    
    this.renderer = renderer;
    
    if (!this.camera) {
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
    }
  }

  public setFrameCallback(callback: (frame: XRFrame) => void): void {
    this.frameCallback = callback;
  }

  public updateFrame(frame: XRFrame): void {
    if (this.frameCallback) {
      this.frameCallback(frame);
    }
  }


  protected handleSessionEnd(): void {
    super.handleSessionEnd();
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }


  public setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  public async loadPlacements(
    placements: ARObjectPlacement[],
    objectFactory: (modelId: number | undefined, id: string) => Promise<THREE.Object3D> | THREE.Object3D
  ): Promise<void> {
    this.clearAllObjects();

    for (const placement of placements) {
      try {
        const object = await objectFactory(placement.modelId, placement.id);
        this.placeObjectAt(
          placement.position,
          placement.rotation,
          object,
          placement.id,
          placement.scale
        );
      } catch (error) {
        console.error(`Failed to load placement ${placement.id}:`, error);
      }
    }
  }


  public dispose(): void {
    if (this.objectGroup.parent) {
      this.objectGroup.parent.remove(this.objectGroup);
    }
    
    super.dispose();
    
    this.renderer = null;
    this.camera = null;
    this.frameCallback = null;
  }
}

