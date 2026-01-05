import * as THREE from "three";
import { ARSceneManager } from "../ARSceneManager";
import { Furniture } from "../types/Furniture";
import { ARSceneState, SelectedFurniture } from "../types/ARSceneTypes";
import { FurnitureEditController } from "../../core/controllers/XRControllerBase";

export class ARSceneContentLogic {
  private state: ARSceneState;
  private setState: (updater: Partial<ARSceneState> | ((prev: ARSceneState) => Partial<ARSceneState>)) => void;
  private arManager: ARSceneManager | null;
  private furnitureCatalog: Furniture[];
  private modelUrlCache: Map<number, string>;
  private onFurnitureSelectRef?: (furniture: Furniture) => void;
  private placedObjects: Map<string, string> = new Map(); // Maps objectId -> catalogId
  public furnitureController: FurnitureEditController | null = null;
  private prevButtonState: Map<string, boolean> = new Map();

  constructor(
    arManager: ARSceneManager | null,
    furnitureCatalog: Furniture[],
    modelUrlCache: Map<number, string>,
    setState: (updater: Partial<ARSceneState> | ((prev: ARSceneState) => Partial<ARSceneState>)) => void,
    initialState: ARSceneState,
    onFurnitureSelect?: (furniture: Furniture) => void
  ) {
    this.arManager = arManager;
    this.furnitureCatalog = furnitureCatalog;
    this.modelUrlCache = modelUrlCache;
    this.setState = setState;
    this.state = initialState;
    this.onFurnitureSelectRef = onFurnitureSelect;

    this.furnitureController = new FurnitureEditController(
      {
        moveSpeed: 1.5,
        rotateSpeed: 1.5,
        deadzone: 0.1,
        enabled: false, // Disable default behavior
      },
      {
        onFurnitureDeselect: (id) => {
          this.handleFurnitureDeselect(id);
        },
      }
    );
  }

  getState(): ARSceneState {
    return this.state;
  }

  updateState(update: Partial<ARSceneState>): void {
    this.state = { ...this.state, ...update };
    this.setState(update);
  }

  handleToggleUI(): void {
    this.updateState({
      showInstructions: false,
      showFurniture: !this.state.showFurniture,
      selectedFurniture: this.state.showFurniture ? null : this.state.selectedFurniture
    });
  }

  // Handle the selection of a furniture item
  handleSelectFurniture(f: Furniture): void {
    const catalogId = f.id;
    
    const existingObjectId = Array.from(this.placedObjects.entries())
      .find(([, catId]) => catId === catalogId)?.[0];

    if (existingObjectId && this.arManager) {
      this.arManager.removeObject(existingObjectId);
      this.placedObjects.delete(existingObjectId);
      
      this.updateState({
        selectedFurniture: null,
        placedFurnitureIds: this.state.placedFurnitureIds.filter(id => id !== catalogId)
      });
      return;
    }

    const modelPath = this.modelUrlCache.get(f.model_id);
    if (!modelPath) {
      console.warn('Model not loaded yet for:', f.name);
      return;
    }

    this.updateState({
      selectedFurniture: {
        id: f.id,
        name: f.name,
        model_id: f.model_id,
        modelPath: modelPath,
        wall_mountable: f.wall_mountable ?? false
      },
      showFurniture: false
    });

    if (this.onFurnitureSelectRef) {
      this.onFurnitureSelectRef(f);
    }
  }

  // Handle the placement of a furniture item
  handleObjectPlaced(objectId: string): void {
    if (!this.state.selectedFurniture) return;

    const catalogId = this.state.selectedFurniture.id;
    this.placedObjects.set(objectId, catalogId);

    this.updateState({
      selectedFurniture: null,
      placedFurnitureIds: [...this.state.placedFurnitureIds, catalogId]
    });
  }

  getPlacedCatalogIds(): string[] {
    return Array.from(this.placedObjects.values());
  }

  getSelectedFurniture(): SelectedFurniture | null {
    return this.state.selectedFurniture;
  }

  updateARManager(arManager: ARSceneManager | null): void {
    this.arManager = arManager;
  }

  updateFurnitureCatalog(catalog: Furniture[]): void {
    this.furnitureCatalog = catalog;
  }

  updateModelUrlCache(cache: Map<number, string>): void {
    this.modelUrlCache = cache;
  }

  updateOnFurnitureSelect(callback?: (furniture: Furniture) => void): void {
    this.onFurnitureSelectRef = callback;
  }

  syncState(reactState: ARSceneState): void {
    this.state = reactState;
  }

  // Handle object selection for transformation
  handleSelectObject(objectId: string): void {
    if (!this.arManager) return;

    if (this.state.selectedObjectId === objectId) {
      this.arManager.deselectObject();
      if (this.furnitureController) {
        this.furnitureController.setSelectedFurniture(null);
      }
      this.updateState({ 
        selectedObjectId: null, 
        showSlider: false 
      });
      return;
    }

    this.arManager.selectObject(objectId);
    const object = this.arManager.getObject(objectId);
    
    if (object) {
      // Get current rotation and scale
      const euler = new THREE.Euler().setFromQuaternion(object.quaternion);
      const rotationY = euler.y;
      const scale = object.scale.x;

      const twoPi = Math.PI * 2;
      let normalizedRotation = rotationY % twoPi;
      if (normalizedRotation < 0) normalizedRotation += twoPi;

      // Set selected furniture in controller
      if (this.furnitureController) {
        this.furnitureController.setSelectedFurniture(objectId);
      }

      this.updateState({
        selectedObjectId: objectId,
        showSlider: true,
        rotationValue: normalizedRotation,
        sliderValue: scale,
      });
    }
  }

  // Handle scale change
  handleScaleChange(newScale: number): void {
    if (this.state.selectedObjectId && this.arManager) {
      const success = this.arManager.updateObjectScale(this.state.selectedObjectId, newScale);
      if (success) {
        this.updateState({ sliderValue: newScale });

        const object = this.arManager.getObject(this.state.selectedObjectId);
        if (object) {
          object.updateMatrix();
          object.updateMatrixWorld(true);
        }
      }
    }
  }

  // Handle position transformation (movement)
  private handleFurnitureMove(id: string, delta: THREE.Vector3): void {
    if (!this.arManager) return;
    
    const object = this.arManager.getObject(id);
    if (!object) return;

    // Calculate new position
    const newPosition = object.position.clone().add(delta);
    
    // Update object position (will handle wall constraint if needed)
    const success = this.arManager.updateObjectPosition(id, newPosition);
    if (success) {
      object.updateMatrix();
      object.updateMatrixWorld(true);
    }
  }


  // Handle furniture deselect
  private handleFurnitureDeselect(id: string): void {
    if (this.state.selectedObjectId === id) {
      this.updateState({ 
        selectedObjectId: null, 
        showSlider: false 
      });
    }
  }

  // Update frame for controller input
  updateFrame(session: XRSession | null, camera: THREE.Camera, delta: number): void {
    if (!session || !this.state.selectedObjectId || !this.arManager) return;

    // Check for deselect
    if (session.inputSources) {
      session.inputSources.forEach((source: XRInputSource, index: number) => {
        const gamepad = source.gamepad;
        if (!gamepad || !gamepad.buttons) return;

        const gripButton = gamepad.buttons[1];
        if (gripButton && gripButton.pressed) {
          const key = `${index}-1`;
          const wasPressed = this.prevButtonState.get(key) || false;
          if (!wasPressed && this.state.selectedObjectId) {
            this.handleFurnitureDeselect(this.state.selectedObjectId);
            this.prevButtonState.set(key, true);
            return;
          }
          this.prevButtonState.set(key, true);
        } else {
          const key = `${index}-1`;
          this.prevButtonState.set(key, false);
        }
      });
    }

    if (!session.inputSources) return;

    let moveX = 0;
    let moveZ = 0;
    let rotateX = 0;
    let rotateY = 0;
    let rotateZ = 0;
    const rotateSpeed = 1.5;
    const moveSpeed = 1.5;

    session.inputSources.forEach((source: XRInputSource) => {
      const gamepad = source.gamepad;
      if (!gamepad) return;

      if (source.handedness === "right" && gamepad.axes.length >= 4) {
        const x = this.getAxisValue(source, 2);
        const z = this.getAxisValue(source, 3);
        if (Math.abs(x) > 0.1) moveX = x;
        if (Math.abs(z) > 0.1) moveZ = z;
      }

      if (source.handedness === "left" && gamepad.axes.length >= 4) {
        const thumbstickX = this.getAxisValue(source, 2);
        const thumbstickY = this.getAxisValue(source, 3);
        
        const triggerButton = gamepad.buttons && gamepad.buttons[0];
        const isTriggerPressed = triggerButton && triggerButton.pressed;
        
        if (isTriggerPressed) {
          if (Math.abs(thumbstickX) > 0.1) {
            rotateZ = -thumbstickX * rotateSpeed * delta;
          }
        } else {
          if (Math.abs(thumbstickX) > 0.1) {
            rotateY = thumbstickX * rotateSpeed * delta;
          }
          if (Math.abs(thumbstickY) > 0.1) {
            rotateX = -thumbstickY * rotateSpeed * delta;
          }
        }
      }
    });

    // Apply movement
    if (Math.abs(moveX) > 0 || Math.abs(moveZ) > 0) {
      const object = this.arManager.getObject(this.state.selectedObjectId);
      
      // Check if object is on a wall
      if (object && object.userData.isOnWall && object.userData.wallNormal) {
        const wallNormal = object.userData.wallNormal as THREE.Vector3;
        
        // Calculate movement in camera space
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, camera.up).normalize();
        
        const up = new THREE.Vector3(0, 1, 0);

        const worldDelta = new THREE.Vector3();
        worldDelta.addScaledVector(forward, -moveZ * moveSpeed * delta);
        worldDelta.addScaledVector(right, moveX * moveSpeed * delta);
        
        const rightOnWall = right.clone().sub(
          wallNormal.clone().multiplyScalar(right.dot(wallNormal))
        ).normalize();
        
        const upOnWall = up.clone().sub(
          wallNormal.clone().multiplyScalar(up.dot(wallNormal))
        ).normalize();
        
        const wallPlaneDelta = new THREE.Vector3();
        wallPlaneDelta.addScaledVector(rightOnWall, moveX * moveSpeed * delta);
        wallPlaneDelta.addScaledVector(upOnWall, -moveZ * moveSpeed * delta);
        
        this.handleFurnitureMove(this.state.selectedObjectId, wallPlaneDelta);
      } else {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, camera.up).normalize();

        const deltaPosition = new THREE.Vector3();
        deltaPosition.addScaledVector(forward, -moveZ * moveSpeed * delta);
        deltaPosition.addScaledVector(right, moveX * moveSpeed * delta);
        deltaPosition.y = 0; // Keep movement horizontal for floor items

        this.handleFurnitureMove(this.state.selectedObjectId, deltaPosition);
      }
    }

    // Apply rotations
    if (Math.abs(rotateX) > 0 || Math.abs(rotateY) > 0 || Math.abs(rotateZ) > 0) {
      const object = this.arManager.getObject(this.state.selectedObjectId);
      if (object) {
        const euler = new THREE.Euler().setFromQuaternion(object.quaternion);
        const newRotationX = euler.x + rotateX;
        const newRotationY = euler.y + rotateY;
        const newRotationZ = euler.z + rotateZ;
        
        const newQuaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(newRotationX, newRotationY, newRotationZ)
        );
        
        const success = this.arManager.updateObjectRotation(this.state.selectedObjectId, newQuaternion);
        if (success) {
          const twoPi = Math.PI * 2;
          let normalizedRotation = newRotationY % twoPi;
          if (normalizedRotation < 0) normalizedRotation += twoPi;
          this.updateState({ rotationValue: normalizedRotation });
        }
      }
    }
  }

  // Helper method to get axis value
  private getAxisValue(source: XRInputSource, axisIndex: number): number {
    const gamepad = source.gamepad;
    if (!gamepad || !gamepad.axes || axisIndex >= gamepad.axes.length) {
      return 0;
    }
    return gamepad.axes[axisIndex];
  }
}

