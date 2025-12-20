import * as THREE from "three";
import { ARSceneManager } from "../ARSceneManager";
import { CatalogLoader } from "./CatalogLoader";
import { Furniture } from "../types/Furniture";

export class ARContentLogic extends CatalogLoader {
  private arManager: ARSceneManager | null = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private currentFrame: XRFrame | null = null;
  private scene: THREE.Scene;

  private onARReadyRef?: (arManager: ARSceneManager) => void;
  private onARErrorRef?: (error: Error) => void;
  private onFurnitureCatalogLoadedRef?: (catalog: Furniture[], modelCache: Map<number, string>) => void;
  private onCatalogLoadingChangeRef?: (loading: boolean) => void;

  constructor(
    scene: THREE.Scene,
    callbacks?: {
      onARReady?: (arManager: ARSceneManager) => void;
      onARError?: (error: Error) => void;
      onFurnitureCatalogLoaded?: (catalog: Furniture[], modelCache: Map<number, string>) => void;
      onCatalogLoadingChange?: (loading: boolean) => void;
    }
  ) {
    super();
    this.scene = scene;
    if (callbacks) {
      this.onARReadyRef = callbacks.onARReady;
      this.onARErrorRef = callbacks.onARError;
      this.onFurnitureCatalogLoadedRef = callbacks.onFurnitureCatalogLoaded;
      this.onCatalogLoadingChangeRef = callbacks.onCatalogLoadingChange;
    }
  }

  updateCallbacks(callbacks?: {
    onARReady?: (arManager: ARSceneManager) => void;
    onARError?: (error: Error) => void;
    onFurnitureCatalogLoaded?: (catalog: Furniture[], modelCache: Map<number, string>) => void;
    onCatalogLoadingChange?: (loading: boolean) => void;
  }): void {
    if (callbacks) {
      this.onARReadyRef = callbacks.onARReady;
      this.onARErrorRef = callbacks.onARError;
      this.onFurnitureCatalogLoadedRef = callbacks.onFurnitureCatalogLoaded;
      this.onCatalogLoadingChangeRef = callbacks.onCatalogLoadingChange;
    }
  }

  // Initialize the furniture catalog
  async initializeCatalog(): Promise<void> {
    if (this.furnitureCatalog.length > 0) {
      return;
    }

    if (this.onCatalogLoadingChangeRef) {
      this.onCatalogLoadingChangeRef(true);
    }

    try {
      const items = await this.loadFurnitureCatalog();

      if (this.onCatalogLoadingChangeRef) {
        this.onCatalogLoadingChangeRef(false);
      }

      if (this.onFurnitureCatalogLoadedRef) {
        this.onFurnitureCatalogLoadedRef(items, this.modelUrlCache);
      }
    } catch (error) {
      console.error('Error loading furniture catalog:', error);
      if (this.onCatalogLoadingChangeRef) {
        this.onCatalogLoadingChangeRef(false);
      }
    }
  }

  // Start the AR session
  async startAR(gl: THREE.WebGLRenderer): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      console.warn("AR session already initialized or initializing");
      return;
    }

    this.isInitializing = true;

    try {
      if (!navigator.xr || !navigator.xr.isSessionSupported) {
        throw new Error("WebXR AR is not supported in this browser");
      }

      const isSupported = await navigator.xr.isSessionSupported("immersive-ar");
      if (!isSupported) {
        throw new Error("AR sessions are not supported on this device");
      }

      if (!this.arManager) {
        this.arManager = new ARSceneManager(this.scene);
      }

      await this.arManager.initialize(gl);

      this.arManager.setFrameCallback((frame: XRFrame) => {
        this.currentFrame = frame;
      });

      this.isInitialized = true;
      this.isInitializing = false;

      if (this.onARReadyRef && this.arManager) {
        this.onARReadyRef(this.arManager);
      }

      const objectGroup = this.arManager.getObjectGroup();
      if (!this.scene.getObjectByName("ARPlacedObjects")) {
        this.scene.add(objectGroup);
      }
    } catch (error) {
      this.isInitializing = false;
      console.error("Failed to initialize AR:", error);
      if (this.onARErrorRef) {
        this.onARErrorRef(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  updateFrame(frame: XRFrame | null): void {
    if (this.arManager && frame) {
      this.arManager.updateFrame(frame);
    }
  }

  getARManager(): ARSceneManager | null {
    return this.arManager;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  getCurrentFrame(): XRFrame | null {
    return this.currentFrame;
  }

  dispose(): void {
    if (this.arManager) {
      this.arManager.dispose();
      this.arManager = null;
    }
    this.isInitialized = false;
    this.isInitializing = false;
    super.cleanup();
  }
}

