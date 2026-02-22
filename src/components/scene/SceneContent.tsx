{/*import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { useXRStore, useXR } from "@react-three/xr";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CatalogToggle } from "../panel/furniture/FurnitureCatalogToggle";
import { VRInstructionPanel } from "../panel/VRInstructionPanel";
import { VRFurniturePanel } from "../panel/furniture/FurniturePanel";
//import { VRSlider } from "../panel/VRSlider";
import { HeadLockedUI } from "../panel/common/HeadLockedUI";
import { VRControlPanel } from "../panel/control/ControlPanel";
import { ControlPanelToggle } from "../panel/control/ControlPanelToggle";
import { VRNotificationPanel } from "../panel/common/NotificationPanel";
import { VRPreciseCollisionPanel } from "../panel/furniture/FurnitureCollisionPanel";
import { SceneManager } from "../../core/managers/SceneManager";
import { FurnitureItem, FurnitureMetadata } from "../../core/objects/FurnitureItem";
import { HomeModel } from "../../core/objects/HomeModel";
import { NavigationController, FurnitureEditController } from "../../core/controllers/XRControllerBase";
import { makeAuthenticatedRequest, logout } from "../../utils/Auth";
import { VRSidebar } from "../panel/VRSidebar"; //add


const DIGITAL_HOME_PLATFORM_BASE_URL = import.meta.env.VITE_DIGITAL_HOME_PLATFORM_URL;

interface SceneContentProps {
  homeId: string;
  digitalHome?: {
    spatialData?: {
      boundary?: {
        min_x: number;
        max_x: number;
        min_y: number;
        max_y: number;
        min_z: number;
        max_z: number;
      };
    };
  };
}

interface SceneState {
  showSlider: boolean;
  showFurniture: boolean;
  showInstructions: boolean;
  showControlPanel: boolean;
  showNotification: boolean;
  notificationMessage: string;
  notificationType: "success" | "error" | "info";
  notificationFromControlPanel: boolean;
  showMoveCloserPanel: boolean;
  showPreciseCheckPanel: boolean;
  preciseCheckInProgress: boolean;
  saving: boolean;
  loading: boolean;
  navigationMode: boolean;
  selectedItemId: string | null;
  sliderValue: number;
  rotationValue: number;
  furnitureCatalog: any[];
  catalogLoading: boolean;
  showSidebar: boolean; //add
  sidebarActiveItem: string | null; //add
}

class SceneContentLogic {
  private state: SceneState;
  private setState: (updater: Partial<SceneState> | ((prev: SceneState) => Partial<SceneState>)) => void;
  private homeId: string;
  private navigate: (path: string) => void;
  
  // Managers
  public sceneManager: SceneManager | null = null;
  public navigationController: NavigationController | null = null;
  public furnitureController: FurnitureEditController | null = null;
  
  // Refs
  public pendingMove: [number, number, number] | null = null;
  public currentAABBPosition: [number, number, number] | null = null;
  public modelUrlCache: Map<number, string> = new Map();

  constructor(
    homeId: string,
    navigate: (path: string) => void,
    setState: (updater: Partial<SceneState> | ((prev: SceneState) => Partial<SceneState>)) => void
  ) {
    this.homeId = homeId;
    this.navigate = navigate;
    this.setState = setState;
    
    this.state = {
      showSlider: false,
      showFurniture: false,
      showInstructions: true,
      showControlPanel: false,
      showNotification: false,
      notificationMessage: "",
      notificationType: "info",
      notificationFromControlPanel: false,
      showMoveCloserPanel: false,
      showPreciseCheckPanel: false,
      preciseCheckInProgress: false,
      saving: false,
      loading: true,
      navigationMode: false,
      selectedItemId: null,
      sliderValue: 1.0,
      rotationValue: 0,
      furnitureCatalog: [],
      catalogLoading: false,
      showSidebar: true, //add
      sidebarActiveItem: null, //add
    };
  }

  getState(): SceneState {
    return this.state;
  }

  updateState(update: Partial<SceneState>): void {
    this.state = { ...this.state, ...update };
    this.setState(update);
  }

  initializeManagers(scene: THREE.Scene): void {
    this.sceneManager = new SceneManager(scene, {
      enableCollisionDetection: true,
      enableDebugMode: false,
      floorLevel: 0,
    });

    this.navigationController = new NavigationController(
      {
        moveSpeed: 2.5,
        rotateSpeed: 1.5,
        deadzone: 0.15,
      },
      (isActive) => {
        this.updateState({ navigationMode: isActive });
      }
    );

    this.furnitureController = new FurnitureEditController(
      {
        moveSpeed: 1.5,
        rotateSpeed: 1.5,
        deadzone: 0.1,
      },
      {
        onFurnitureMove: async (id, delta) => {
          await this.handleFurnitureMove(id, delta);
        },
        onFurnitureRotate: (id, deltaY) => {
          this.handleFurnitureRotate(id, deltaY);
        },
        onFurnitureDeselect: (id) => {
          this.handleFurnitureDeselect(id);
        },
      }
    );
  }

  setupXRRig(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.navigationController) return;

    let rig = scene.getObjectByName("CustomXRRig") as THREE.Group;
    if (!rig) {
      rig = new THREE.Group();
      rig.name = "CustomXRRig";
      scene.add(rig);
    }
    if (camera.parent !== rig) {
      rig.add(camera);
    }
    this.navigationController.setRig(rig);
  }

  cleanup(): void {
    this.sceneManager?.dispose();
    this.navigationController?.reset();
    this.furnitureController?.reset();
    this.modelUrlCache.forEach(url => URL.revokeObjectURL(url));
  }

  async loadHome(digitalHome?: any): Promise<void> {
    if (!this.sceneManager) return;

    try {
      const response = await makeAuthenticatedRequest(
        `/digitalhomes/download_digital_home/${this.homeId}/`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const homeModel = new HomeModel(
          this.homeId,
          'Digital Home',
          parseInt(this.homeId),
          url,
          digitalHome?.spatialData?.boundary
        );

        await this.sceneManager.setHomeModel(homeModel);
      }
    } catch (error) {
      console.error('Failed to load home:', error);
    }
  }

  async loadFurnitureCatalog(): Promise<void> {
    this.updateState({ catalogLoading: true });
    try {
      const response = await makeAuthenticatedRequest('/digitalhomes/list_available_items/');

      if (response.ok) {
        const data = await response.json();
        const items = data.available_items.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description,
          model_id: item.model_id,
          image: item.image,
          category: item.category,
          type: item.type,
          is_container: item.is_container,
        }));

        this.updateState({ furnitureCatalog: items });

        for (const item of items) {
          await this.loadFurnitureModel(item.model_id);
        }
      }
    } catch (error) {
      console.error('Error loading furniture catalog:', error);
    } finally {
      this.updateState({ catalogLoading: false });
    }
  }

  private async loadFurnitureModel(modelId: number): Promise<void> {
    if (this.modelUrlCache.has(modelId)) return;

    try {
      const response = await makeAuthenticatedRequest(`/products/get_3d_model/${modelId}/`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        this.modelUrlCache.set(modelId, url);
      }
    } catch (error) {
      console.error(`Error loading model ${modelId}:`, error);
    }
  }

  async loadDeployedItems(): Promise<void> {
    if (!this.sceneManager || this.modelUrlCache.size === 0) return;

    this.updateState({ loading: true });
    try {
      const response = await makeAuthenticatedRequest(
        `/digitalhomes/get_deployed_items_details/${this.homeId}/`
      );

      if (response.ok) {
        const data = await response.json();

        for (const itemObj of data.deployed_items) {
          const itemId = Object.keys(itemObj)[0];
          const itemData = itemObj[itemId];

          const modelPath = this.modelUrlCache.get(itemData.model_id);
          if (!modelPath) continue;

          const metadata: FurnitureMetadata = {
            description: itemData.description,
            category: itemData.category,
            type: itemData.type,
            isContainer: itemData.is_container,
          };

          const furniture = new FurnitureItem(
            itemId,
            itemData.name,
            itemData.model_id,
            modelPath,
            metadata,
            {
              position: itemData.spatialData.positions,
              rotation: itemData.spatialData.rotation,
              scale: itemData.spatialData.scale[0],
            }
          );

          await this.sceneManager.addFurniture(furniture);
        }

        if (this.sceneManager) {
          setTimeout(async () => {
            await this.sceneManager!.updateAllCollisions();
          }, 200);
        }
      }
    } catch (error) {
      console.error('Error loading deployed items:', error);
    } finally {
      this.updateState({ loading: false });
    }
  }

  showNotificationMessage(
    message: string,
    type: "success" | "error" | "info" = "info",
    fromControlPanel: boolean = false
  ): void {
    this.updateState({
      showControlPanel: fromControlPanel ? this.state.showControlPanel : false,
      showMoveCloserPanel: false,
      showPreciseCheckPanel: false,
      notificationMessage: message,
      notificationType: type,
      notificationFromControlPanel: fromControlPanel,
      showNotification: true,
    });
  }

  handleToggleUI(): void {
    const { showMoveCloserPanel, showPreciseCheckPanel, showControlPanel, showInstructions, showFurniture, selectedItemId } = this.state;

    if (showMoveCloserPanel || showPreciseCheckPanel) return;

    if (showControlPanel) {
      this.updateState({ showControlPanel: false });
    } else if (showInstructions) {
      this.updateState({ showInstructions: false, showFurniture: true });
    } else if (showFurniture) {
      this.updateState({
        showFurniture: false,
        showSlider: selectedItemId !== null,
      });
    } else {
      this.updateState({ showFurniture: true, showSlider: false });
    }
  }

  handleToggleControlPanel(): void {
    const { showMoveCloserPanel, showPreciseCheckPanel, showControlPanel } = this.state;

    if (showMoveCloserPanel || showPreciseCheckPanel) return;

    this.updateState({
      showControlPanel: !showControlPanel,
      showFurniture: false,
      showSlider: false,
      showInstructions: false,
    });
  }

  handleHelp(): void {
    this.updateState({
      showInstructions: true,
      showFurniture: false,
      showSlider: false,
      showControlPanel: false,
      showMoveCloserPanel: false,
      showPreciseCheckPanel: false,
    });
  }

  
  // ADD THIS NEW METHOD ***************

  handleSidebarItemSelect(itemId: string): void {
    this.updateState({ sidebarActiveItem: itemId });
    
    switch (itemId) {
      case "movement":
        // Show navigation/movement instructions
        this.updateState({ 
          showInstructions: true,
          showFurniture: false,
          showControlPanel: false,
          showSlider: false
        });
        break;
      case "rotation":
        // Show rotation controls if item is selected
        if (this.state.selectedItemId) {
          this.updateState({ 
            showSlider: true,
            showFurniture: false,
            showControlPanel: false 
          });
        } else {
          this.showNotificationMessage('Please select a furniture item first', 'info');
        }
        break;
      case "settings":
        // Open control panel
        this.updateState({
          showControlPanel: true,
          showFurniture: false,
          showSlider: false,
          showInstructions: false,
        });
        break;
      case "customize":
        // Open furniture catalog
        this.updateState({ 
          showFurniture: true,
          showControlPanel: false,
          showSlider: false,
          showInstructions: false
        });
        break;
    }
  }

  async handleSaveScene(): Promise<void> {
    if (this.state.saving || !this.sceneManager) return;

    this.updateState({ saving: true });
    try {
      const sceneData = this.sceneManager.serializeScene();

      const formData = new FormData();
      formData.append('id', this.homeId);
      formData.append('deployedItems', JSON.stringify(sceneData.deployedItems));

      const response = await makeAuthenticatedRequest('/digitalhomes/update_home_design/', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        this.showNotificationMessage('Scene saved successfully!', 'success', true);
      } else {
        const error = await response.json();
        this.showNotificationMessage(`Failed to save scene: ${error.error}`, 'error', true);
      }
    } catch (error) {
      console.error('Error saving scene:', error);
      this.showNotificationMessage('Error saving scene. Please try again.', 'error', true);
    } finally {
      this.updateState({ saving: false });
    }
  }

  async handleBackToHome(xrStore: any): Promise<void> {
    const session = xrStore.getState().session;
    if (session) {
      try {
        await session.end();
        setTimeout(() => this.navigate("/"), 300);
      } catch (error) {
        console.error("Error exiting VR session:", error);
        this.navigate("/");
      }
    } else {
      this.navigate("/");
    }
  }

  async handleLogout(): Promise<void> {
    await logout();
    window.location.href = DIGITAL_HOME_PLATFORM_BASE_URL;
  }

  private async handleFurnitureMove(id: string, delta: THREE.Vector3): Promise<void> {
    if (!this.sceneManager) return;

    const furniture = this.sceneManager.getFurniture(id);
    if (!furniture) return;

    const currentPos = furniture.getPosition();
    const newPos: [number, number, number] = [
      currentPos[0] + delta.x,
      currentPos[1] + delta.y,
      currentPos[2] + delta.z,
    ];

    const isInAABBZone = this.currentAABBPosition !== null;

    const result = await this.sceneManager.moveFurniture(id, newPos, isInAABBZone, false);

    if (!result.success && result.needsConfirmation) {
      this.pendingMove = newPos;
      this.updateState({ showMoveCloserPanel: true });
    } else if (result.success && result.needsPreciseCheck) {
      this.currentAABBPosition = newPos;
      this.updateState({ showPreciseCheckPanel: true });
    } else if (!result.success && !result.needsConfirmation) {
      if (result.reason) {
        this.showNotificationMessage(`⚠️ ${result.reason}`, 'error');
      }
      this.currentAABBPosition = null;
    } else if (result.success && !result.needsPreciseCheck) {
      this.currentAABBPosition = null;
    }
  }

  private handleFurnitureRotate(id: string, deltaY: number): void {
    if (!this.sceneManager) return;

    const furniture = this.sceneManager.getFurniture(id);
    if (!furniture) return;

    const currentRot = furniture.getRotation();
    const newRot: [number, number, number] = [
      currentRot[0],
      currentRot[1] + deltaY,
      currentRot[2],
    ];

    this.sceneManager.rotateFurniture(id, newRot);

    const twoPi = Math.PI * 2;
    let normalizedRotation = newRot[1] % twoPi;
    if (normalizedRotation < 0) normalizedRotation += twoPi;
    this.updateState({ rotationValue: normalizedRotation });
  }

  private handleFurnitureDeselect(id: string): void {
    if (!this.sceneManager) return;

    this.sceneManager.deselectFurniture(id);
    this.updateState({ selectedItemId: null, showSlider: false });
    this.currentAABBPosition = null;
    this.pendingMove = null;
  }

  async handleConfirmMoveCloser(): Promise<void> {
    if (!this.state.selectedItemId || !this.sceneManager || !this.pendingMove) return;

    this.updateState({ showMoveCloserPanel: false, showControlPanel: false });

    const result = await this.sceneManager.moveFurniture(
      this.state.selectedItemId,
      this.pendingMove,
      true,
      false
    );

    if (result.success && result.needsPreciseCheck) {
      this.currentAABBPosition = this.pendingMove;
      this.pendingMove = null;
      this.updateState({ showPreciseCheckPanel: true });
    }
  }

  handleCancelMoveCloser(): void {
    this.updateState({ showMoveCloserPanel: false });
    this.pendingMove = null;
  }

  async handleConfirmPreciseCheck(): Promise<void> {
    if (!this.state.selectedItemId || !this.sceneManager || !this.currentAABBPosition) return;

    this.updateState({
      preciseCheckInProgress: true,
      showPreciseCheckPanel: false,
      showControlPanel: false,
    });

    try {
      const result = await this.sceneManager.moveFurniture(
        this.state.selectedItemId,
        this.currentAABBPosition,
        true,
        true
      );

      if (!result.success) {
        this.showNotificationMessage(
          '⚠️ Precise overlap detected! Furniture moved back to safe position.',
          'error'
        );
        this.currentAABBPosition = null;
      } else {
        this.showNotificationMessage(
          '✅ Position validated! Furniture can stay here.',
          'success'
        );
      }
    } catch (error) {
      console.error('Error during precise collision check:', error);
      this.showNotificationMessage('❌ Error checking collision. Please try again.', 'error');
    } finally {
      this.updateState({ preciseCheckInProgress: false });
    }
  }

  handleCancelPreciseCheck(): void {
    if (!this.state.selectedItemId || !this.sceneManager) return;

    const lastValid = this.sceneManager.getLastValidPosition(this.state.selectedItemId);
    if (lastValid) {
      const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
      if (furniture) {
        furniture.setPosition(lastValid);
        const collisionDetector = this.sceneManager.getCollisionDetector();
        collisionDetector.updateFurnitureBox(
          this.state.selectedItemId,
          furniture.getGroup(),
          furniture.getModelId()
        );
        furniture.setCollision(false);
      }
    }

    this.updateState({ showPreciseCheckPanel: false });
    this.currentAABBPosition = null;
  }

  handleSelectFurniture(f: any, camera: THREE.Camera): void {
    if (!this.sceneManager) return;

    const catalogId = f.id;
    const allFurniture = this.sceneManager.getAllFurniture();

    const existingFurniture = allFurniture.find(item => {
      const placedCatalogId = item.getId().split('-')[0];
      return placedCatalogId === catalogId;
    });

    if (existingFurniture) {
      this.sceneManager.removeFurniture(existingFurniture.getId());
      if (this.state.selectedItemId === existingFurniture.getId()) {
        this.updateState({ selectedItemId: null, showSlider: false });
      }
      return;
    }

    const modelPath = this.modelUrlCache.get(f.model_id);
    if (!modelPath) {
      console.warn('Model not loaded yet for:', f.name);
      return;
    }

    const spawnPos = this.sceneManager.calculateSpawnPosition(camera, 2);
    const uniqueId = `${f.id}-${Date.now()}`;

    const metadata: FurnitureMetadata = {
      description: f.description,
      category: f.category,
      type: f.type,
      isContainer: f.is_container,
      image: f.image,
    };

    const newFurniture = new FurnitureItem(
      uniqueId,
      f.name,
      f.model_id,
      modelPath,
      metadata,
      {
        position: spawnPos,
        rotation: [0, 0, 0],
        scale: this.state.sliderValue,
      }
    );

    this.sceneManager.addFurniture(newFurniture).then(() => {
      this.sceneManager!.selectFurniture(uniqueId);
      this.furnitureController?.setSelectedFurniture(uniqueId);
      this.updateState({
        selectedItemId: uniqueId,
        rotationValue: 0,
        showSlider: true,
        showFurniture: false,
      });
    });
  }

  handleSelectItem(id: string): void {
    if (!this.sceneManager) return;

    if (this.state.selectedItemId === id) {
      this.sceneManager.deselectFurniture(id);
      this.furnitureController?.setSelectedFurniture(null);
      this.updateState({ selectedItemId: null, showSlider: false });
      this.currentAABBPosition = null;
      return;
    }

    this.sceneManager.selectFurniture(id);
    this.furnitureController?.setSelectedFurniture(id);

    const furniture = this.sceneManager.getFurniture(id);
    if (furniture) {
      const rotation = furniture.getRotation();
      const scale = furniture.getScale();

      const twoPi = Math.PI * 2;
      let normalizedRotation = rotation[1] % twoPi;
      if (normalizedRotation < 0) normalizedRotation += twoPi;

      const scaleValue = typeof scale === 'number' ? scale : scale[0];

      this.updateState({
        selectedItemId: id,
        showSlider: true,
        rotationValue: normalizedRotation,
        sliderValue: scaleValue,
      });
    }
  }

  handleScaleChange(newScale: number): void {
    this.updateState({ sliderValue: newScale });
    if (this.state.selectedItemId && this.sceneManager) {
      this.sceneManager.scaleFurniture(this.state.selectedItemId, newScale);
    }
  }

  handleRotationSliderChange(newRotation: number): void {
    this.updateState({ rotationValue: newRotation });
    if (this.state.selectedItemId && this.sceneManager) {
      const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
      if (furniture) {
        const currentRot = furniture.getRotation();
        this.sceneManager.rotateFurniture(this.state.selectedItemId, [
          currentRot[0],
          newRotation,
          currentRot[2],
        ]);
      }
    }
  }

  getPlacedCatalogIds(): string[] {
    if (!this.sceneManager) return [];
    return this.sceneManager.getAllFurniture().map(item => item.getId().split('-')[0]);
  }

  updateFrame(session: any, camera: THREE.Camera, delta: number): void {
    if (!session) return;

    this.navigationController?.update(session, camera, delta);

    if (!this.state.navigationMode && this.state.selectedItemId && this.furnitureController) {
      this.furnitureController.update(session, camera, delta);
    }
  }
}

// Wrapper for R3F hooks
export function SceneContent({ homeId, digitalHome }: SceneContentProps) {
  const navigate = useNavigate();
  const { scene, camera } = useThree();
  const xr = useXR();
  const xrStore = useXRStore();

  // State management
  const [state, setState] = useState<SceneState>({
    showSlider: false,
    showFurniture: false,
    showInstructions: true,
    showControlPanel: false,
    showNotification: false,
    notificationMessage: "",
    notificationType: "info",
    notificationFromControlPanel: false,
    showMoveCloserPanel: false,
    showPreciseCheckPanel: false,
    preciseCheckInProgress: false,
    saving: false,
    loading: true,
    navigationMode: false,
    selectedItemId: null,
    sliderValue: 1.0,
    rotationValue: 0,
    furnitureCatalog: [],
    catalogLoading: false,
    showSidebar: true, //add
    sidebarActiveItem: null, //add
  });

  const logicRef = useRef<SceneContentLogic | null>(null);

  useEffect(() => {
    const updateState = (update: Partial<SceneState> | ((prev: SceneState) => Partial<SceneState>)) => {
      setState(prev => {
        const newState = typeof update === 'function' ? update(prev) : update;
        return { ...prev, ...newState };
      });
    };

    logicRef.current = new SceneContentLogic(homeId, navigate, updateState);
    logicRef.current.initializeManagers(scene);

    return () => {
      logicRef.current?.cleanup();
    };
  }, [homeId, navigate, scene]);

  useEffect(() => {
    if (!xr.session || !logicRef.current) return;
    logicRef.current.setupXRRig(scene, camera);
  }, [xr.session, scene, camera]);

  // Load home
  useEffect(() => {
    if (!logicRef.current) return;
    logicRef.current.loadHome(digitalHome);
  }, [homeId, digitalHome]);

  // Load furniture catalog
  useEffect(() => {
    if (!logicRef.current) return;
    logicRef.current.loadFurnitureCatalog();
  }, []);

  // Load deployed items
  useEffect(() => {
    if (!logicRef.current || logicRef.current.modelUrlCache.size === 0) return;
    logicRef.current.loadDeployedItems();
  }, [logicRef.current?.modelUrlCache.size]);

  useFrame((_state, delta) => {
    const session = xr.session;
    if (!session || !logicRef.current) return;
    logicRef.current.updateFrame(session, camera, delta);
  });

  if (!logicRef.current) return null;

  const logic = logicRef.current;
  const uiLocked = state.showFurniture || 
    state.showControlPanel || 
    state.showInstructions || 
    state.showSlider || 
    state.showNotification ||
    state.showMoveCloserPanel ||
    state.showPreciseCheckPanel;

  if (state.loading) {
    return (
      <>
        <color args={["#808080"]} attach="background" />
        <PerspectiveCamera makeDefault position={[0, 1.6, 2]} fov={75} />
        <ambientLight intensity={0.5} />
        <group position={[0, 1.6, -2]}>
          <mesh>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#4CAF50" wireframe />
          </mesh>
        </group>
      </>
    );
  }

  return (
    <>
      <color args={["#808080"]} attach="background" />
      <PerspectiveCamera makeDefault position={[0, 1.6, 2]} fov={75} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Environment preset="warehouse" />

      <group position={[0, 0, 0]}>
        {logic.sceneManager && (
          <>
            {logic.sceneManager.getHomeModel() && (
              <primitive object={logic.sceneManager.getHomeModel()!.getGroup()} />
            )}
            
            {logic.sceneManager.getAllFurniture().map((furniture) => (
              <primitive
                key={furniture.getId()}
                object={furniture.getGroup()}
                onClick={(e: any) => {
                  if (!state.navigationMode && !uiLocked) {
                    e.stopPropagation();
                    logic.handleSelectItem(furniture.getId());
                  }
                }}
              />
            ))}
          </>
        )}
      </group>
      
      <CatalogToggle onToggle={() => logic.handleToggleUI()} />
      <ControlPanelToggle onToggle={() => logic.handleToggleControlPanel()} />

      <HeadLockedUI distance={1.6} verticalOffset={0} enabled={state.showInstructions}>
        <VRInstructionPanel 
          show={state.showInstructions} 
          onClose={() => logic.updateState({ showInstructions: false })} 
        />
      </HeadLockedUI>
     

      <HeadLockedUI distance={1.7} verticalOffset={0} enabled={state.showFurniture}>
        <VRFurniturePanel
          show={state.showFurniture}
          catalog={state.furnitureCatalog}
          loading={state.catalogLoading}
          onSelectItem={(f) => logic.handleSelectFurniture(f, camera)}
          placedFurnitureIds={logic.getPlacedCatalogIds()}
          onClose={() => logic.updateState({ showFurniture: false })}
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.7} verticalOffset={0} enabled={state.showControlPanel}>
        <VRControlPanel
          show={state.showControlPanel}
          onSave={() => logic.handleSaveScene()}
          onHelp={() => logic.handleHelp()}
          onBack={() => logic.handleBackToHome(xrStore)}
          onLogout={() => logic.handleLogout()}
          saving={state.saving}
          onClose={() => logic.updateState({ showControlPanel: false })}
        />
      </HeadLockedUI>

      {/*
      <HeadLockedUI distance={1.4} enabled={state.showSlider && state.selectedItemId !== null}>
        <group>
          <VRSlider
            show={state.showSlider && state.selectedItemId !== null}
            value={state.sliderValue}
            onChange={(v: number) => logic.handleScaleChange(v)}
            label="Scale"
            min={0.1}
            max={2}
            position={[0, 0.3, 0]}
            onClose={() => logic.updateState({ showSlider: false })}
          />
          <VRSlider
            show={null}
            value={state.rotationValue}
            onChange={(v: number) => logic.handleRotationSliderChange(v)}
            label="Rotation"
            min={0}
            max={Math.PI * 2}
            position={[0, -0.75, 0]}
            showDegrees={true}
            onClose={() => logic.updateState({ showSlider: false })}
          />
        </group>
      </HeadLockedUI>  ############################

      <HeadLockedUI distance={1.4} verticalOffset={0} enabled={state.showNotification}>
        <VRNotificationPanel
          show={state.showNotification}
          message={state.notificationMessage}
          type={state.notificationType}
          onClose={() => logic.updateState({ showNotification: false, notificationFromControlPanel: false })}
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.5} verticalOffset={0} enabled={state.showMoveCloserPanel}>
        <VRPreciseCollisionPanel
          show={state.showMoveCloserPanel}
          onConfirm={() => logic.handleConfirmMoveCloser()}
          onCancel={() => logic.handleCancelMoveCloser()}
          isChecking={false}
          title="Move Furniture Closer?"
          message="The furniture is close to another object. Do you want to move it closer?"
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.5} verticalOffset={0} enabled={state.showPreciseCheckPanel}>
        <VRPreciseCollisionPanel
          show={state.showPreciseCheckPanel}
          onConfirm={() => logic.handleConfirmPreciseCheck()}
          onCancel={() => logic.handleCancelPreciseCheck()}
          isChecking={state.preciseCheckInProgress}
          title="Use precise collision detection?"
          message="Run precise API check to verify overlap? (Click No to move back to safe position)"
        />
      </HeadLockedUI>


      <HeadLockedUI distance={1.4} verticalOffset={0} enabled={state.showSidebar}>
        <group position={[-0.8, 0, 0]}> 
          <VRSidebar
            show={state.showSidebar}
            onItemSelect={(itemId) => logic.handleSidebarItemSelect(itemId)}
          />
        </group>
      </HeadLockedUI>

    </>
  );
} */}



import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { useXRStore, useXR } from "@react-three/xr";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CatalogToggle } from "../panel/furniture/FurnitureCatalogToggle";
import { VRInstructionPanel } from "../panel/VRInstructionPanel";
import { VRFurniturePanel } from "../panel/furniture/FurniturePanel";
import { ScaleControlPanel} from "../panel/VRSlider";
import { HeadLockedUI } from "../panel/common/HeadLockedUI";
import { VRControlPanel } from "../panel/control/ControlPanel";
import { ControlPanelToggle } from "../panel/control/ControlPanelToggle";
import { VRNotificationPanel } from "../panel/common/NotificationPanel";
import { VRPreciseCollisionPanel } from "../panel/furniture/FurnitureCollisionPanel";
import { SceneManager } from "../../core/managers/SceneManager";
import { FurnitureItem, FurnitureMetadata } from "../../core/objects/FurnitureItem";
import { HomeModel } from "../../core/objects/HomeModel";
import { NavigationController, FurnitureEditController } from "../../core/controllers/XRControllerBase";
import { makeAuthenticatedRequest, logout } from "../../utils/Auth";
import { VRSidebar } from "../panel/VRSidebar"; //add
import { TransformGizmo } from "../panel/TransformGizmo";
import { RotationGizmo } from "../panel/RotationGizmo";



const DIGITAL_HOME_PLATFORM_BASE_URL = import.meta.env.VITE_DIGITAL_HOME_PLATFORM_URL;

interface SceneContentProps {
  homeId: string;
  digitalHome?: {
    spatialData?: {
      boundary?: {
        min_x: number;
        max_x: number;
        min_y: number;
        max_y: number;
        min_z: number;
        max_z: number;
      };
    };
  };
}

interface SceneState {
  showSlider: boolean;
  showFurniture: boolean;
  showInstructions: boolean;
  showControlPanel: boolean;
  showNotification: boolean;
  notificationMessage: string;
  notificationType: "success" | "error" | "info";
  notificationFromControlPanel: boolean;
  showMoveCloserPanel: boolean;
  showPreciseCheckPanel: boolean;
  preciseCheckInProgress: boolean;
  saving: boolean;
  loading: boolean;
  navigationMode: boolean;
  selectedItemId: string | null;
  sliderValue: number;
  rotationValue: number;
  furnitureCatalog: any[];
  catalogLoading: boolean;
  showSidebar: boolean; //add
  sidebarActiveItem: string | null; //add
  showTransformGizmo: boolean; // ADD THIS
  gizmoPosition: [number, number, number] | null; // ADD THIS
  showRotationGizmo: boolean;  // ADD THIS
  rotationGizmoPosition: [number, number, number] | null; // ADD THIS
  showScalePanel: boolean;
}

class SceneContentLogic {
  private state: SceneState;
  private setState: (updater: Partial<SceneState> | ((prev: SceneState) => Partial<SceneState>)) => void;
  private homeId: string;
  private navigate: (path: string) => void;
  
  // Managers
  public sceneManager: SceneManager | null = null;
  public navigationController: NavigationController | null = null;
  public furnitureController: FurnitureEditController | null = null;
  
  // Refs
  public pendingMove: [number, number, number] | null = null;
  public currentAABBPosition: [number, number, number] | null = null;
  public modelUrlCache: Map<number, string> = new Map();

  constructor(
    homeId: string,
    navigate: (path: string) => void,
    setState: (updater: Partial<SceneState> | ((prev: SceneState) => Partial<SceneState>)) => void
  ) {
    this.homeId = homeId;
    this.navigate = navigate;
    this.setState = setState;
    
    this.state = {
      showSlider: false,
      showFurniture: false,
      showInstructions: true,
      showControlPanel: false,
      showNotification: false,
      notificationMessage: "",
      notificationType: "info",
      notificationFromControlPanel: false,
      showMoveCloserPanel: false,
      showPreciseCheckPanel: false,
      preciseCheckInProgress: false,
      saving: false,
      loading: true,
      navigationMode: false,
      selectedItemId: null,
      sliderValue: 1.0,
      rotationValue: 0,
      furnitureCatalog: [],
      catalogLoading: false,
      showSidebar: true, //add
      sidebarActiveItem: null, //add
      showTransformGizmo: false, // ADD THIS
      gizmoPosition: null, // ADD THIS
      showRotationGizmo: false,  // ADD THIS
      rotationGizmoPosition: null,  // ADD THIS
      showScalePanel: false,
    };
  }

  getState(): SceneState {
    return this.state;
  }

  updateState(update: Partial<SceneState>): void {
    this.state = { ...this.state, ...update };
    this.setState(update);
  }

  initializeManagers(scene: THREE.Scene): void {
    this.sceneManager = new SceneManager(scene, {
      enableCollisionDetection: true,
      enableDebugMode: false,
      floorLevel: 0,
    });

    this.navigationController = new NavigationController(
      {
        moveSpeed: 2.5,
        rotateSpeed: 1.5,
        deadzone: 0.15,
      },
      (isActive) => {
        this.updateState({ navigationMode: isActive });
      }
    );

    this.furnitureController = new FurnitureEditController(
      {
        moveSpeed: 1.5,
        rotateSpeed: 1.5,
        deadzone: 0.1,
      },
      {
        onFurnitureMove: async (id, delta) => {
          await this.handleFurnitureMove(id, delta);
        },
        onFurnitureRotate: (id, deltaY) => {
          this.handleFurnitureRotate(id, deltaY);
        },
        onFurnitureDeselect: (id) => {
          this.handleFurnitureDeselect(id);
        },
      }
    );
  }

  setupXRRig(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.navigationController) return;

    let rig = scene.getObjectByName("CustomXRRig") as THREE.Group;
    if (!rig) {
      rig = new THREE.Group();
      rig.name = "CustomXRRig";
      scene.add(rig);
    }
    if (camera.parent !== rig) {
      rig.add(camera);
    }
    this.navigationController.setRig(rig);
  }

  cleanup(): void {
    this.sceneManager?.dispose();
    this.navigationController?.reset();
    this.furnitureController?.reset();
    this.modelUrlCache.forEach(url => URL.revokeObjectURL(url));
  }

  async loadHome(digitalHome?: any): Promise<void> {
    if (!this.sceneManager) return;

    try {
      const response = await makeAuthenticatedRequest(
        `/digitalhomes/download_digital_home/${this.homeId}/`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const homeModel = new HomeModel(
          this.homeId,
          'Digital Home',
          parseInt(this.homeId),
          url,
          digitalHome?.spatialData?.boundary
        );

        await this.sceneManager.setHomeModel(homeModel);
      }
    } catch (error) {
      console.error('Failed to load home:', error);
    }
  }

  async loadFurnitureCatalog(): Promise<void> {
    this.updateState({ catalogLoading: true });
    try {
      const response = await makeAuthenticatedRequest('/digitalhomes/list_available_items/');

      if (response.ok) {
        const data = await response.json();
        const items = data.available_items.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description,
          model_id: item.model_id,
          image: item.image,
          category: item.category,
          type: item.type,
          is_container: item.is_container,
        }));

        this.updateState({ furnitureCatalog: items });

        for (const item of items) {
          await this.loadFurnitureModel(item.model_id);
        }
      }
    } catch (error) {
      console.error('Error loading furniture catalog:', error);
    } finally {
      this.updateState({ catalogLoading: false });
    }
  }

  private async loadFurnitureModel(modelId: number): Promise<void> {
    if (this.modelUrlCache.has(modelId)) return;

    try {
      const response = await makeAuthenticatedRequest(`/products/get_3d_model/${modelId}/`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        this.modelUrlCache.set(modelId, url);
      }
    } catch (error) {
      console.error(`Error loading model ${modelId}:`, error);
    }
  }

  async loadDeployedItems(): Promise<void> {
    if (!this.sceneManager || this.modelUrlCache.size === 0) return;

    this.updateState({ loading: true });
    try {
      const response = await makeAuthenticatedRequest(
        `/digitalhomes/get_deployed_items_details/${this.homeId}/`
      );

      if (response.ok) {
        const data = await response.json();

        for (const itemObj of data.deployed_items) {
          const itemId = Object.keys(itemObj)[0];
          const itemData = itemObj[itemId];

          const modelPath = this.modelUrlCache.get(itemData.model_id);
          if (!modelPath) continue;

          const metadata: FurnitureMetadata = {
            description: itemData.description,
            category: itemData.category,
            type: itemData.type,
            isContainer: itemData.is_container,
          };

          const furniture = new FurnitureItem(
            itemId,
            itemData.name,
            itemData.model_id,
            modelPath,
            metadata,
            {
              position: itemData.spatialData.positions,
              rotation: itemData.spatialData.rotation,
              scale: itemData.spatialData.scale[0],
            }
          );

          await this.sceneManager.addFurniture(furniture);
        }

        if (this.sceneManager) {
          setTimeout(async () => {
            await this.sceneManager!.updateAllCollisions();
          }, 200);
        }
      }
    } catch (error) {
      console.error('Error loading deployed items:', error);
    } finally {
      this.updateState({ loading: false });
    }
  }

  showNotificationMessage(
    message: string,
    type: "success" | "error" | "info" = "info",
    fromControlPanel: boolean = false
  ): void {
    this.updateState({
      showControlPanel: fromControlPanel ? this.state.showControlPanel : false,
      showMoveCloserPanel: false,
      showPreciseCheckPanel: false,
      notificationMessage: message,
      notificationType: type,
      notificationFromControlPanel: fromControlPanel,
      showNotification: true,
    });
  }

  handleToggleUI(): void {
    const { showMoveCloserPanel, showPreciseCheckPanel, showControlPanel, showInstructions, showFurniture, selectedItemId } = this.state;

    if (showMoveCloserPanel || showPreciseCheckPanel) return;

    if (showControlPanel) {
      this.updateState({ showControlPanel: false });
    } else if (showInstructions) {
      this.updateState({ showInstructions: false, showFurniture: true });
    } else if (showFurniture) {
      this.updateState({
        showFurniture: false,
        showSlider: selectedItemId !== null,
      });
    } else {
      this.updateState({ showFurniture: true, showSlider: false });
    }
  }

  handleToggleControlPanel(): void {
    const { showMoveCloserPanel, showPreciseCheckPanel, showControlPanel } = this.state;

    if (showMoveCloserPanel || showPreciseCheckPanel) return;

    this.updateState({
      showControlPanel: !showControlPanel,
      showFurniture: false,
      showSlider: false,
      showInstructions: false,
    });
  }

  handleHelp(): void {
    this.updateState({
      showInstructions: true,
      showFurniture: false,
      showSlider: false,
      showControlPanel: false,
      showMoveCloserPanel: false,
      showPreciseCheckPanel: false,
    });
  }

  
  // ADD THIS NEW METHOD ***************

  handleSidebarItemSelect(itemId: string): void {
  this.updateState({ sidebarActiveItem: itemId });
  
  switch (itemId) {
    case "movement":
      this.updateState({ 
        showInstructions: false,
        showFurniture: false,
        showControlPanel: false,
        showSlider: false,
        showRotationGizmo: false,  // HIDE ROTATION GIZMO
        showScalePanel: false,
      });
      
      if (this.state.selectedItemId) {
        const furniture = this.sceneManager?.getFurniture(this.state.selectedItemId);
        if (furniture) {
          this.updateState({
            showTransformGizmo: true,
            gizmoPosition: furniture.getPosition()
          });
        }
      }
      
      console.log(`[SIDEBAR] Movement mode activated`, {
        selectedItemId: this.state.selectedItemId,
        showGizmo: !!this.state.selectedItemId
      });
      break;

    case "rotation":
      // CHANGED: Show rotation gizmo instead of notification
      if (this.state.selectedItemId) {
        const furniture = this.sceneManager?.getFurniture(this.state.selectedItemId);
        if (furniture) {
          this.updateState({ 
            showRotationGizmo: true,  // SHOW ROTATION GIZMO
            rotationGizmoPosition: furniture.getPosition(),
            showFurniture: false,
            showControlPanel: false,
            showTransformGizmo: false,
            showSlider: false,
            showScalePanel: false,
            
          });
        }
      } 
      break;

    case "scale":
      if (this.state.selectedItemId) {
        const furniture = this.sceneManager?.getFurniture(this.state.selectedItemId);
        if (furniture) {
          this.updateState({
            showScalePanel: true,
            showTransformGizmo: false,
            showRotationGizmo: false,
            showFurniture: false,
            showControlPanel: false,
            showSlider: false,
          });
        }
      }
      console.log(`[SIDEBAR] Scale mode activated`);
      break;

    case "settings":
      this.updateState({
        showControlPanel: true,
        showFurniture: false,
        showSlider: false,
        showInstructions: false,
        showTransformGizmo: false,
        showRotationGizmo: false,  // HIDE ROTATION GIZMO
        showScalePanel: false,
      });
      break;

    case "customize":
      this.updateState({ 
        showFurniture: true,
        showControlPanel: false,
        showSlider: false,
        showInstructions: false,
        showTransformGizmo: false,
        showRotationGizmo: false,  // HIDE ROTATION GIZMO
        showScalePanel: false,
      });
      break;
  }
}


  async handleSaveScene(): Promise<void> {
    if (this.state.saving || !this.sceneManager) return;

    this.updateState({ saving: true });
    try {
      const sceneData = this.sceneManager.serializeScene();

      const formData = new FormData();
      formData.append('id', this.homeId);
      formData.append('deployedItems', JSON.stringify(sceneData.deployedItems));

      const response = await makeAuthenticatedRequest('/digitalhomes/update_home_design/', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        this.showNotificationMessage('Scene saved successfully!', 'success', true);
      } else {
        const error = await response.json();
        this.showNotificationMessage(`Failed to save scene: ${error.error}`, 'error', true);
      }
    } catch (error) {
      console.error('Error saving scene:', error);
      this.showNotificationMessage('Error saving scene. Please try again.', 'error', true);
    } finally {
      this.updateState({ saving: false });
    }
  }

  async handleBackToHome(xrStore: any): Promise<void> {
    const session = xrStore.getState().session;
    if (session) {
      try {
        await session.end();
        setTimeout(() => this.navigate("/"), 300);
      } catch (error) {
        console.error("Error exiting VR session:", error);
        this.navigate("/");
      }
    } else {
      this.navigate("/");
    }
  }

  async handleLogout(): Promise<void> {
    await logout();
    window.location.href = DIGITAL_HOME_PLATFORM_BASE_URL;
  }

  private async handleFurnitureMove(id: string, delta: THREE.Vector3): Promise<void> {
    if (!this.sceneManager) return;

    const furniture = this.sceneManager.getFurniture(id);
    if (!furniture) return;

    const currentPos = furniture.getPosition();
    const newPos: [number, number, number] = [
      currentPos[0] + delta.x,
      currentPos[1] + delta.y,
      currentPos[2] + delta.z,
    ];

    const isInAABBZone = this.currentAABBPosition !== null;

    const result = await this.sceneManager.moveFurniture(id, newPos, isInAABBZone, false);

    if (!result.success && result.needsConfirmation) {
      this.pendingMove = newPos;
      this.updateState({ showMoveCloserPanel: true });
    } else if (result.success && result.needsPreciseCheck) {
      this.currentAABBPosition = newPos;
      this.updateState({ showPreciseCheckPanel: true });
    } else if (!result.success && !result.needsConfirmation) {
      if (result.reason) {
        this.showNotificationMessage(`⚠️ ${result.reason}`, 'error');
      }
      this.currentAABBPosition = null;
    } else if (result.success && !result.needsPreciseCheck) {
      this.currentAABBPosition = null;
    }
  }

  private handleFurnitureRotate(id: string, deltaY: number): void {
    if (!this.sceneManager) return;

    const furniture = this.sceneManager.getFurniture(id);
    if (!furniture) return;

    const currentRot = furniture.getRotation();
    const newRot: [number, number, number] = [
      currentRot[0],
      currentRot[1] + deltaY,
      currentRot[2],
    ];

    this.sceneManager.rotateFurniture(id, newRot);

    const twoPi = Math.PI * 2;
    let normalizedRotation = newRot[1] % twoPi;
    if (normalizedRotation < 0) normalizedRotation += twoPi;
    this.updateState({ rotationValue: normalizedRotation });
  }

private handleFurnitureDeselect(id: string): void {
  console.log(`[DESELECT] Furniture: ${id}`);
  
  if (!this.sceneManager) return;

  this.sceneManager.deselectFurniture(id);
  this.updateState({ 
    selectedItemId: null, 
    showSlider: false,
    showTransformGizmo: false,
    gizmoPosition: null,
    showRotationGizmo: false,  // ADD THIS
    rotationGizmoPosition: null,  // ADD THIS
    showScalePanel: false,
    sidebarActiveItem: null
  });
  this.currentAABBPosition = null;
  this.pendingMove = null;
}

  async handleConfirmMoveCloser(): Promise<void> {
    if (!this.state.selectedItemId || !this.sceneManager || !this.pendingMove) return;

    this.updateState({ showMoveCloserPanel: false, showControlPanel: false });

    const result = await this.sceneManager.moveFurniture(
      this.state.selectedItemId,
      this.pendingMove,
      true,
      false
    );

    if (result.success && result.needsPreciseCheck) {
      this.currentAABBPosition = this.pendingMove;
      this.pendingMove = null;
      this.updateState({ showPreciseCheckPanel: true });
    }
  }

  handleCancelMoveCloser(): void {
    this.updateState({ showMoveCloserPanel: false });
    this.pendingMove = null;
  }

  async handleConfirmPreciseCheck(): Promise<void> {
    if (!this.state.selectedItemId || !this.sceneManager || !this.currentAABBPosition) return;

    this.updateState({
      preciseCheckInProgress: true,
      showPreciseCheckPanel: false,
      showControlPanel: false,
    });

    try {
      const result = await this.sceneManager.moveFurniture(
        this.state.selectedItemId,
        this.currentAABBPosition,
        true,
        true
      );

      if (!result.success) {
        this.showNotificationMessage(
          '⚠️ Precise overlap detected! Furniture moved back to safe position.',
          'error'
        );
        this.currentAABBPosition = null;
      } else {
        this.showNotificationMessage(
          '✅ Position validated! Furniture can stay here.',
          'success'
        );
      }
    } catch (error) {
      console.error('Error during precise collision check:', error);
      this.showNotificationMessage('❌ Error checking collision. Please try again.', 'error');
    } finally {
      this.updateState({ preciseCheckInProgress: false });
    }
  }

  handleCancelPreciseCheck(): void {
    if (!this.state.selectedItemId || !this.sceneManager) return;

    const lastValid = this.sceneManager.getLastValidPosition(this.state.selectedItemId);
    if (lastValid) {
      const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
      if (furniture) {
        furniture.setPosition(lastValid);
        const collisionDetector = this.sceneManager.getCollisionDetector();
        collisionDetector.updateFurnitureBox(
          this.state.selectedItemId,
          furniture.getGroup(),
          furniture.getModelId()
        );
        furniture.setCollision(false);
      }
    }

    this.updateState({ showPreciseCheckPanel: false });
    this.currentAABBPosition = null;
  }

  handleSelectFurniture(f: any, camera: THREE.Camera): void {
    if (!this.sceneManager) return;

    const catalogId = f.id;
    const allFurniture = this.sceneManager.getAllFurniture();

    const existingFurniture = allFurniture.find(item => {
      const placedCatalogId = item.getId().split('-')[0];
      return placedCatalogId === catalogId;
    });

    if (existingFurniture) {
      this.sceneManager.removeFurniture(existingFurniture.getId());
      if (this.state.selectedItemId === existingFurniture.getId()) {
        this.updateState({ selectedItemId: null, showSlider: false });
      }
      return;
    }

    const modelPath = this.modelUrlCache.get(f.model_id);
    if (!modelPath) {
      console.warn('Model not loaded yet for:', f.name);
      return;
    }

    const spawnPos = this.sceneManager.calculateSpawnPosition(camera, 2);
    const uniqueId = `${f.id}-${Date.now()}`;

    const metadata: FurnitureMetadata = {
      description: f.description,
      category: f.category,
      type: f.type,
      isContainer: f.is_container,
      image: f.image,
    };

    const newFurniture = new FurnitureItem(
      uniqueId,
      f.name,
      f.model_id,
      modelPath,
      metadata,
      {
        position: spawnPos,
        rotation: [0, 0, 0],
        scale: this.state.sliderValue,
      }
    );

    this.sceneManager.addFurniture(newFurniture).then(() => {
      this.sceneManager!.selectFurniture(uniqueId);
      this.furnitureController?.setSelectedFurniture(uniqueId);
      this.updateState({
        selectedItemId: uniqueId,
        rotationValue: 0,
        showSlider: true,
        showFurniture: false,
      });
    });
  }

  // MODIFIED METHOD ***********************
  handleSelectItem(id: string): void {
  if (!this.sceneManager) {
    console.log("[handleSelectItem] No scene manager");
    return;
  }

  console.log(`[handleSelectItem] Selected: ${id}, Currently selected: ${this.state.selectedItemId}`);

  // If already selected and gizmo showing, don't deselect
  if (this.state.selectedItemId === id && (this.state.showTransformGizmo || this.state.showRotationGizmo)) {
    console.log("[handleSelectItem] Same item already selected with gizmo showing - ignoring click");
    return;
  }

  // If same item without gizmo, deselect
  if (this.state.selectedItemId === id && !this.state.showTransformGizmo && !this.state.showRotationGizmo) {
    console.log("[handleSelectItem] Same item, no gizmo - deselecting");
    this.sceneManager.deselectFurniture(id);
    this.furnitureController?.setSelectedFurniture(null);
    this.updateState({
      selectedItemId: null,
      showSlider: false,
      showTransformGizmo: false,
      gizmoPosition: null,
      showRotationGizmo: false,
      rotationGizmoPosition: null,
    });
    return;
  }

  // Deselect previous item
  if (this.state.selectedItemId) {
    this.sceneManager.deselectFurniture(this.state.selectedItemId);
  }

  // Select new item
  this.sceneManager.selectFurniture(id);
  this.furnitureController?.setSelectedFurniture(id);

  const furniture = this.sceneManager.getFurniture(id);
  if (furniture) {
    const rotation = furniture.getRotation();
    const scale = furniture.getScale();
    const position = furniture.getPosition();

    const twoPi = Math.PI * 2;
    let normalizedRotation = rotation[1] % twoPi;
    if (normalizedRotation < 0) normalizedRotation += twoPi;

    const scaleValue = typeof scale === 'number' ? scale : scale[0];

    // Show gizmo based on current sidebar mode
    const showMovementGizmo = this.state.sidebarActiveItem === 'movement';
    const showRotGizmo = this.state.sidebarActiveItem === 'rotation';

    console.log(`[handleSelectItem] ✅ Furniture selected:`, {
      id,
      movementMode: showMovementGizmo,
      rotationMode: showRotGizmo,
      position,
    });

    this.updateState({
      selectedItemId: id,
      showSlider: !showMovementGizmo && !showRotGizmo,
      rotationValue: normalizedRotation,
      sliderValue: scaleValue,
      showTransformGizmo: showMovementGizmo,
      gizmoPosition: showMovementGizmo ? position : null,
      showRotationGizmo: showRotGizmo,
      rotationGizmoPosition: showRotGizmo ? position : null,
    });
  }
}


  handleGizmoMove(axis: 'x' | 'y' | 'z', delta: number): void {
  if (!this.state.selectedItemId || !this.sceneManager) {
    console.warn(`[handleGizmoMove] Invalid state:`, {
      selectedItemId: this.state.selectedItemId,
      hasSceneManager: !!this.sceneManager,
    });
    return;
  }

  const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
  if (!furniture) {
    console.warn(`[handleGizmoMove] Furniture not found:`, this.state.selectedItemId);
    return;
  }

  const currentPos = furniture.getPosition();
  const newPos: [number, number, number] = [...currentPos];

  // Apply delta
  switch (axis) {
    case 'x':
      newPos[0] += delta;
      break;
    case 'y':
      newPos[1] += delta;
      break;
    case 'z':
      newPos[2] += delta;
      break;
  }

  console.log(`[handleGizmoMove] Moving along ${axis.toUpperCase()}:`, {
    from: currentPos,
    to: newPos,
    delta: delta.toFixed(4),
  });

  // Move furniture
  this.sceneManager.moveFurniture(this.state.selectedItemId, newPos, false, false)
    .then((result) => {
      if (result.success) {
        console.log(`[handleGizmoMove] ✅ Move successful`);
        // Update gizmo position to match furniture
        this.updateState({ gizmoPosition: newPos });
      } else if (result.needsConfirmation) {
        console.log(`[handleGizmoMove] ⚠️  Collision warning`);
        this.pendingMove = newPos;
        this.updateState({ showMoveCloserPanel: true });
      } else {
        console.warn(`[handleGizmoMove] ❌ Move failed:`, result.reason);
      }
    })
    .catch((err) => {
      console.error(`[handleGizmoMove] Error:`, err);
    });
}


  handleGizmoRotate(axis: 'x' | 'y' | 'z', deltaRadians: number): void {
  if (!this.state.selectedItemId || !this.sceneManager) {
    console.warn(`[handleGizmoRotate] Invalid state:`, {
      selectedItemId: this.state.selectedItemId,
      hasSceneManager: !!this.sceneManager,
    });
    return;
  }

  const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
  if (!furniture) {
    console.warn(`[handleGizmoRotate] Furniture not found:`, this.state.selectedItemId);
    return;
  }

  const currentRot = furniture.getRotation();
  const newRot: [number, number, number] = [...currentRot];

  // Apply delta to the appropriate axis
  switch (axis) {
    case 'x':
      newRot[0] += deltaRadians;
      break;
    case 'y':
      newRot[1] += deltaRadians;
      break;
    case 'z':
      newRot[2] += deltaRadians;
      break;
  }

  console.log(`[handleGizmoRotate] Rotating around ${axis.toUpperCase()}:`, {
    from: currentRot,
    to: newRot,
    deltaRadians: deltaRadians.toFixed(4),
    deltaDegrees: (deltaRadians * 180 / Math.PI).toFixed(2),
  });

  // Apply rotation
  this.sceneManager.rotateFurniture(this.state.selectedItemId, newRot);

  // Update rotation state
  const twoPi = Math.PI * 2;
  let normalizedRotation = newRot[1] % twoPi;
  if (normalizedRotation < 0) normalizedRotation += twoPi;
  this.updateState({ rotationValue: normalizedRotation });
}


 handleScaleChange(newScale: number): void {
  // Clamp between 0.5 and 3
  const clampedScale = Math.max(0.5, Math.min(3, newScale));
  this.updateState({ sliderValue: clampedScale });
  
  if (this.state.selectedItemId && this.sceneManager) {
    this.sceneManager.scaleFurniture(this.state.selectedItemId, clampedScale);
    console.log(`[SCALE] Furniture scaled to: ${clampedScale.toFixed(2)}x`);
  }
}

  handleRotationSliderChange(newRotation: number): void {
    this.updateState({ rotationValue: newRotation });
    if (this.state.selectedItemId && this.sceneManager) {
      const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
      if (furniture) {
        const currentRot = furniture.getRotation();
        this.sceneManager.rotateFurniture(this.state.selectedItemId, [
          currentRot[0],
          newRotation,
          currentRot[2],
        ]);
      }
    }
  }

  getPlacedCatalogIds(): string[] {
    if (!this.sceneManager) return [];
    return this.sceneManager.getAllFurniture().map(item => item.getId().split('-')[0]);
  }

  updateFrame(session: any, camera: THREE.Camera, delta: number): void {
    if (!session) return;

    this.navigationController?.update(session, camera, delta);

    if (!this.state.navigationMode && this.state.selectedItemId && this.furnitureController) {
      this.furnitureController.update(session, camera, delta);
    }
  }


}

// Wrapper for R3F hooks
export function SceneContent({ homeId, digitalHome }: SceneContentProps) {
  const navigate = useNavigate();
  const { scene, camera } = useThree();
  const xr = useXR();
  const xrStore = useXRStore();

  // State management
  const [state, setState] = useState<SceneState>({
    showSlider: false,
    showFurniture: false,
    showInstructions: true,
    showControlPanel: false,
    showNotification: false,
    notificationMessage: "",
    notificationType: "info",
    notificationFromControlPanel: false,
    showMoveCloserPanel: false,
    showPreciseCheckPanel: false,
    preciseCheckInProgress: false,
    saving: false,
    loading: true,
    navigationMode: false,
    selectedItemId: null,
    sliderValue: 1.0,
    rotationValue: 0,
    furnitureCatalog: [],
    catalogLoading: false,
    showSidebar: true, //add
    sidebarActiveItem: null, //add
    showTransformGizmo: false, // ADD THIS
    gizmoPosition: null, // ADD THIS
    showRotationGizmo: false,  // ADD THIS
    rotationGizmoPosition: null, // ADD THIS
    showScalePanel: false,
  });

  const logicRef = useRef<SceneContentLogic | null>(null);

  useEffect(() => {
    const updateState = (update: Partial<SceneState> | ((prev: SceneState) => Partial<SceneState>)) => {
      setState(prev => {
        const newState = typeof update === 'function' ? update(prev) : update;
        return { ...prev, ...newState };
      });
    };

    logicRef.current = new SceneContentLogic(homeId, navigate, updateState);
    logicRef.current.initializeManagers(scene);

    return () => {
      logicRef.current?.cleanup();
    };
  }, [homeId, navigate, scene]);

  useEffect(() => {
    if (!xr.session || !logicRef.current) return;
    logicRef.current.setupXRRig(scene, camera);
  }, [xr.session, scene, camera]);

  // Load home
  useEffect(() => {
    if (!logicRef.current) return;
    logicRef.current.loadHome(digitalHome);
  }, [homeId, digitalHome]);

  // Load furniture catalog
  useEffect(() => {
    if (!logicRef.current) return;
    logicRef.current.loadFurnitureCatalog();
  }, []);

  // Load deployed items
  useEffect(() => {
    if (!logicRef.current || logicRef.current.modelUrlCache.size === 0) return;
    logicRef.current.loadDeployedItems();
  }, [logicRef.current?.modelUrlCache.size]);

  useFrame((_state, delta) => {
    const session = xr.session;
    if (!session || !logicRef.current) return;
    logicRef.current.updateFrame(session, camera, delta);
  });

  if (!logicRef.current) return null;

  const logic = logicRef.current;
  const uiLocked = state.showFurniture || 
    state.showControlPanel || 
    state.showInstructions || 
    state.showSlider || 
    state.showNotification ||
    state.showMoveCloserPanel ||
    state.showScalePanel ||
    state.showPreciseCheckPanel;

  if (state.loading) {
    return (
      <>
        <color args={["#808080"]} attach="background" />
        <PerspectiveCamera makeDefault position={[0, 1.6, 2]} fov={75} />
        <ambientLight intensity={0.5} />
        <group position={[0, 1.6, -2]}>
          <mesh>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#4CAF50" wireframe />
          </mesh>
        </group>
      </>
    );
  }

  return (
    <>
      <color args={["#808080"]} attach="background" />
      <PerspectiveCamera makeDefault position={[0, 1.6, 2]} fov={75} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Environment preset="warehouse" />

      <group position={[0, 0, 0]}>
      {logic.sceneManager && (
        <>
          {logic.sceneManager.getHomeModel() && (
            <primitive object={logic.sceneManager.getHomeModel()!.getGroup()} />
          )}
          
          {logic.sceneManager.getAllFurniture().map((furniture) => (
            <primitive
              key={furniture.getId()}
              object={furniture.getGroup()}
              onClick={(e: any) => {
                // LOG EVERY CLICK
                console.log("[FURNITURE-CLICK] Click detected on:", e.object.name);

                // CHECK IF GIZMO
                let target = e.object;
                let isGizmoClick = false;
                let depth = 0;

                while (target && depth < 10) {
                  console.log(`[FURNITURE-CLICK] Checking object at depth ${depth}:`, {
                    name: target.name,
                    type: target.type,
                    isGizmo: target.userData?.isGizmo,
                  });

                  if (target.userData?.isGizmo) {
                    console.log(`[FURNITURE-CLICK] ✅ FOUND GIZMO at depth ${depth}`);
                    isGizmoClick = true;
                    break;
                  }

                  target = target.parent;
                  depth++;
                }

                // IF IT'S A GIZMO CLICK, IGNORE IT
                if (isGizmoClick) {
                  console.log("[FURNITURE-CLICK] ❌ This is a gizmo click - IGNORING");
                  e.stopPropagation();
                  return; // Don't deselect
                }

                // OTHERWISE, NORMAL FURNITURE CLICK HANDLING
                console.log("[FURNITURE-CLICK] ✅ This is a furniture click - normal handling");

                if (!state.navigationMode && !uiLocked) {
                  e.stopPropagation();
                  logic.handleSelectItem(furniture.getId());
                }
              }}
            />
          ))}

          {state.showTransformGizmo && state.gizmoPosition && (
            <TransformGizmo
              position={state.gizmoPosition}
              visible={state.showTransformGizmo}
              onMove={(axis, delta) => logic.handleGizmoMove(axis, delta)}
            />
          )}

          {/* ROTATION GIZMO FOR ROTATION */}
          {state.showRotationGizmo && state.rotationGizmoPosition && (
            <RotationGizmo
              position={state.rotationGizmoPosition}
              visible={state.showRotationGizmo}
              onRotate={(axis, deltaRadians) => logic.handleGizmoRotate(axis, deltaRadians)}
              currentRotation={
                logic.sceneManager && state.selectedItemId
                  ? logic.sceneManager.getFurniture(state.selectedItemId)?.getRotation() || [0, 0, 0]
                  : [0, 0, 0]
              }
            />
          )}
        </>
      )}
    </group>
      
      <CatalogToggle onToggle={() => logic.handleToggleUI()} />
      <ControlPanelToggle onToggle={() => logic.handleToggleControlPanel()} />

      <HeadLockedUI distance={1.6} verticalOffset={0} enabled={state.showInstructions}>
        <VRInstructionPanel 
          show={state.showInstructions} 
          onClose={() => logic.updateState({ showInstructions: false })} 
        />
      </HeadLockedUI>
     

      <HeadLockedUI distance={1.7} verticalOffset={0} enabled={state.showFurniture}>
        <VRFurniturePanel
          show={state.showFurniture}
          catalog={state.furnitureCatalog}
          loading={state.catalogLoading}
          onSelectItem={(f) => logic.handleSelectFurniture(f, camera)}
          placedFurnitureIds={logic.getPlacedCatalogIds()}
          onClose={() => logic.updateState({ showFurniture: false })}
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.7} verticalOffset={0} enabled={state.showControlPanel}>
        <VRControlPanel
          show={state.showControlPanel}
          onSave={() => logic.handleSaveScene()}
          onHelp={() => logic.handleHelp()}
          onBack={() => logic.handleBackToHome(xrStore)}
          onLogout={() => logic.handleLogout()}
          saving={state.saving}
          onClose={() => logic.updateState({ showControlPanel: false })}
        />
      </HeadLockedUI>


      <HeadLockedUI distance={1.4} verticalOffset={0} enabled={state.showNotification}>
        <VRNotificationPanel
          show={state.showNotification}
          message={state.notificationMessage}
          type={state.notificationType}
          onClose={() => logic.updateState({ showNotification: false, notificationFromControlPanel: false })}
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.5} verticalOffset={0} enabled={state.showMoveCloserPanel}>
        <VRPreciseCollisionPanel
          show={state.showMoveCloserPanel}
          onConfirm={() => logic.handleConfirmMoveCloser()}
          onCancel={() => logic.handleCancelMoveCloser()}
          isChecking={false}
          title="Move Furniture Closer?"
          message="The furniture is close to another object. Do you want to move it closer?"
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.5} verticalOffset={0} enabled={state.showPreciseCheckPanel}>
        <VRPreciseCollisionPanel
          show={state.showPreciseCheckPanel}
          onConfirm={() => logic.handleConfirmPreciseCheck()}
          onCancel={() => logic.handleCancelPreciseCheck()}
          isChecking={state.preciseCheckInProgress}
          title="Use precise collision detection?"
          message="Run precise API check to verify overlap? (Click No to move back to safe position)"
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.6} verticalOffset={0} enabled={state.showScalePanel}>
        {state.selectedItemId && (
          <ScaleControlPanel
            show={state.showScalePanel}
            currentScale={state.sliderValue}
            position={[0.5, 0, 0]}
            onScaleChange={(newScale) => logic.handleScaleChange(newScale)}
            onClose={() => logic.updateState({ showScalePanel: false })}
          />
        )}
      </HeadLockedUI>

      {/* ADD VRSidebar HERE */}
     {/* Replace the current VRSidebar section with this: */}
      <HeadLockedUI distance={1.4} verticalOffset={0} enabled={state.showSidebar}>
        <group position={[-0.8, 0, 0]}> {/* Offset to the left within head-locked space */}
          <VRSidebar
            show={state.showSidebar}
            onItemSelect={(itemId) => logic.handleSidebarItemSelect(itemId)}
          />
        </group>
      </HeadLockedUI>

    </>
  );
}