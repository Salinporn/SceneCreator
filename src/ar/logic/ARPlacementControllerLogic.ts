import * as THREE from "three";
import { ARSceneManager } from "../ARSceneManager";
import { ARHitTestResult } from "../types";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SelectedFurniture } from "../types/ARSceneTypes";

export class ARPlacementControllerLogic {
  private arManager: ARSceneManager | null;
  private selectedFurniture: SelectedFurniture | null;
  private currentFrame: XRFrame | null = null;
  private lastSelectTime: number = 0;
  private loader: GLTFLoader;
  private loadingModels: Map<string, Promise<THREE.Object3D>> = new Map();
  private session: XRSession | null = null;
  private selectHandler: (() => void) | null = null;

  private onPlaceObjectRef?: (hitResult: ARHitTestResult, object: THREE.Object3D) => void;
  private onObjectPlacedRef?: (objectId: string) => void;

  constructor(
    arManager: ARSceneManager | null,
    selectedFurniture: SelectedFurniture | null,
    callbacks?: {
      onPlaceObject?: (hitResult: ARHitTestResult, object: THREE.Object3D) => void;
      onObjectPlaced?: (objectId: string) => void;
    }
  ) {
    this.arManager = arManager;
    this.selectedFurniture = selectedFurniture;
    this.loader = new GLTFLoader();
    if (callbacks) {
      this.onPlaceObjectRef = callbacks.onPlaceObject;
      this.onObjectPlacedRef = callbacks.onObjectPlaced;
    }
  }

  updateCallbacks(callbacks?: {
    onPlaceObject?: (hitResult: ARHitTestResult, object: THREE.Object3D) => void;
    onObjectPlaced?: (objectId: string) => void;
  }): void {
    if (callbacks) {
      this.onPlaceObjectRef = callbacks.onPlaceObject;
      this.onObjectPlacedRef = callbacks.onObjectPlaced;
    }
  }

  setFrameCallback(frame: XRFrame | null): void {
    this.currentFrame = frame;
  }

  setARManager(arManager: ARSceneManager | null): void {
    this.arManager = arManager;
    if (this.arManager) {
      this.arManager.setFrameCallback((frame: XRFrame) => {
        this.currentFrame = frame;
      });
    }
  }

  setSelectedFurniture(selectedFurniture: SelectedFurniture | null): void {
    this.selectedFurniture = selectedFurniture;
  }

  // Load the furniture model
  private async loadFurnitureModel(modelPath: string, furnitureId: string): Promise<THREE.Object3D> {
    // Check if already loading
    if (this.loadingModels.has(furnitureId)) {
      return this.loadingModels.get(furnitureId)!;
    }

    // Check if already placed
    const existingObject = this.arManager?.getObject(furnitureId);
    if (existingObject) {
      return existingObject.clone();
    }

    const loadPromise = new Promise<THREE.Object3D>((resolve, reject) => {
      this.loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene.clone();
          
          // Align to floor
          const box = new THREE.Box3().setFromObject(model);
          const minY = box.min.y;
          model.position.y = -minY;
          
          resolve(model);
        },
        undefined,
        reject
      );
    });

    this.loadingModels.set(furnitureId, loadPromise);
    
    try {
      const result = await loadPromise;
      this.loadingModels.delete(furnitureId);
      return result;
    } catch (error) {
      this.loadingModels.delete(furnitureId);
      throw error;
    }
  }

  // Handle the selection of a furniture item
  private async handleSelect(): Promise<void> {
    if (!this.arManager || !this.currentFrame || !this.selectedFurniture) {
      return;
    }

    const now = Date.now();
    if (now - this.lastSelectTime < 500) {
      return;
    }
    this.lastSelectTime = now;

    const hitResult = this.arManager.getFirstHitTestResult(this.currentFrame);
    if (!hitResult) {
      console.warn("No hit test result found");
      return;
    }

    try {
      const furnitureModel = await this.loadFurnitureModel(this.selectedFurniture.modelPath, this.selectedFurniture.id);
      
      const objectId = `${this.selectedFurniture.id}-${Date.now()}`;
      
      const placed = this.arManager.placeObject(hitResult, furnitureModel, objectId);
      
      if (placed) {
        if (this.onPlaceObjectRef) {
          this.onPlaceObjectRef(hitResult, placed);
        }
        if (this.onObjectPlacedRef) {
          this.onObjectPlacedRef(objectId);
        }
      }
    } catch (error) {
      console.error("Failed to place furniture:", error);
    }
  }

  setupSessionListeners(session: XRSession | null): void {
    if (this.session && this.selectHandler) {
      this.session.removeEventListener("select", this.selectHandler);
    }

    this.session = session;

    if (!this.session || !this.arManager || !this.selectedFurniture) {
      return;
    }

    this.selectHandler = () => {
      this.handleSelect();
    };

    this.session.addEventListener("select", this.selectHandler);
  }

  cleanup(): void {
    if (this.session && this.selectHandler) {
      this.session.removeEventListener("select", this.selectHandler);
      this.selectHandler = null;
    }
    this.loadingModels.clear();
  }
}

