/* eslint-disable @typescript-eslint/no-explicit-any 
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
import { VRWhiteboardPanel } from "../panel/VRWhiteboardPanel";
import { SceneManager } from "../../core/managers/SceneManager";
import {
  FurnitureItem,
  FurnitureMetadata,
} from "../../core/objects/FurnitureItem";
import { ClockWidget } from "../../core/objects/ClockWidget";
import { WhiteboardWidget, type WhiteboardTool } from "../../core/objects/WhiteboardWidget";
import { HomeModel } from "../../core/objects/HomeModel";
import {
  NavigationController,
  FurnitureEditController,
} from "../../core/controllers/XRControllerBase";
import { makeAuthenticatedRequest, logout } from "../../utils/Auth";
import { VRSidebar } from "../panel/VRSidebar";
import { VRAlignmentPanel, VRAlignmentConfirmPanel } from "../panel/VRAlignmentPanel";
import { TransformGizmo } from "../panel/TransformGizmo";
import { RotationGizmo } from "../panel/RotationGizmo";
import {
  TextureSelectorPanel,
  TextureOption,
} from "../panel/texture/TextureSelectorPanel";
import {
  EnvironmentSelectorPanel,
  EnvironmentOption,
} from "../panel/texture/EnvironmentSelectorPanel";

const DIGITAL_HOME_PLATFORM_BASE_URL = import.meta.env
  .VITE_DIGITAL_HOME_PLATFORM_URL;

function WhiteboardHitTarget({
  boardMesh,
  isSelected,
  onSelect,
  onPointerMove,
  onPointerLeave,
}: {
  boardMesh: THREE.Mesh;
  isSelected: boolean;
  onSelect: () => void;
  onPointerMove: (point: THREE.Vector3) => void;
  onPointerLeave: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current || !boardMesh) return;
    groupRef.current.position.setFromMatrixPosition(boardMesh.matrixWorld);
    groupRef.current.quaternion.setFromRotationMatrix(boardMesh.matrixWorld);
    groupRef.current.scale.setFromMatrixScale(boardMesh.matrixWorld);
  });
  return (
    <group ref={groupRef}>
      <mesh
        onPointerDown={(e: any) => {
          e.stopPropagation();
          onSelect();
        }}
        onClick={(e: any) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerMove={(e: any) => {
          e.stopPropagation();
          if (isSelected) onPointerMove(e.point.clone());
        }}
        onPointerLeave={() => onPointerLeave()}
      >
        <planeGeometry args={[1.0, 0.6]} />
        <meshBasicMaterial
          visible={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

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
  arModeRequested?: boolean;
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
  showSidebar: boolean;
  sidebarActiveItem: string | null;
  showTransformGizmo: boolean;
  gizmoPosition: [number, number, number] | null;
  showRotationGizmo: boolean;
  rotationGizmoPosition: [number, number, number] | null;
  showScalePanel: boolean;
  selectedItemPlacementMode: 'floor' | 'wall';
  alignmentStatus: 'pending' | 'aligning' | 'aligned';
  alignmentMode: 'world' | 'free' | null;
  showAlignmentPanel: boolean;
  showAlignmentConfirm: boolean;
  homeTransparent: boolean;
  showTexturePanel: boolean;
  textureOptions: TextureOption[];
  selectedFurnitureTextureId: string | undefined;
  showEnvironmentPanel: boolean;
  floorTextures: EnvironmentOption[];
  wallTextures: EnvironmentOption[];
  selectedFloorId: string | undefined;
  selectedWallId: string | undefined;
  loadingEnvironment: boolean;
  experienceMode: boolean;
  experienceWhiteboardId: string | null;
  whiteboardTool: WhiteboardTool;
}

class SceneContentLogic {
  private state: SceneState;
  private setState: (
    updater: Partial<SceneState> | ((prev: SceneState) => Partial<SceneState>),
  ) => void;
  private homeId: string;
  private navigate: (path: string) => void;

  public sceneManager: SceneManager | null = null;
  public navigationController: NavigationController | null = null;
  public furnitureController: FurnitureEditController | null = null;
  public renderer: THREE.WebGLRenderer | null = null;
  private lastFrameWhiteboardDrawing = false;
  public lastWhiteboardPointerPoint: THREE.Vector3 | null = null;
  public lastWhiteboardPointerId: string | null = null;

  public pendingMove: [number, number, number] | null = null;
  public currentAABBPosition: [number, number, number] | null = null;
  public modelUrlCache: Map<number, string> = new Map();

  private textureCache: Map<string, TextureOption[]> = new Map();
  private textureLoadingCache: Map<string, Promise<void>> = new Map();

  constructor(
    homeId: string,
    navigate: (path: string) => void,
    setState: (
      updater:
        | Partial<SceneState>
        | ((prev: SceneState) => Partial<SceneState>),
    ) => void,
  ) {
    this.homeId = homeId;
    this.navigate = navigate;
    this.setState = setState;

    this.state = {
      showSlider: false,
      showFurniture: false,
      showInstructions: false,
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
      showSidebar: true,
      sidebarActiveItem: null,
      showTransformGizmo: false,
      gizmoPosition: null,
      showRotationGizmo: false,
      rotationGizmoPosition: null,
      showScalePanel: false,
      selectedItemPlacementMode: 'floor',
      alignmentStatus: 'pending',
      alignmentMode: null,
      showAlignmentPanel: true,
      showAlignmentConfirm: false,
      homeTransparent: false,
      showTexturePanel: false,
      textureOptions: [],
      selectedFurnitureTextureId: undefined,
      showEnvironmentPanel: false,
      floorTextures: [],
      wallTextures: [],
      selectedFloorId: undefined,
      selectedWallId: undefined,
      loadingEnvironment: false,
      experienceMode: false,
      experienceWhiteboardId: null,
      whiteboardTool: "pen",
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
      },
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
        onWallFurnitureMove: async (id, deltaVertical, deltaHorizontal) => {
          await this.handleWallFurnitureMove(id, deltaVertical, deltaHorizontal);
        },
        isWallMounted: (id) => {
          return this.sceneManager?.isWallMounted(id) || false;
        },
        onUnmountFromWall: (id) => {
          this.sceneManager?.unmountFromWallAndFloat(id);
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
    this.modelUrlCache.forEach((url) => URL.revokeObjectURL(url));

    this.textureCache.clear();
    this.textureLoadingCache.clear();

    this.state.floorTextures.forEach((tex) => {
      if (tex.imagePath) URL.revokeObjectURL(tex.imagePath);
    });
    this.state.wallTextures.forEach((tex) => {
      if (tex.imagePath) URL.revokeObjectURL(tex.imagePath);
    });
  }

  async loadHome(digitalHome?: any): Promise<void> {
    if (!this.sceneManager) return;

    try {
      const response = await makeAuthenticatedRequest(
        `/digitalhomes/download_digital_home/${this.homeId}/`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const homeModel = new HomeModel(
          this.homeId,
          "Digital Home",
          parseInt(this.homeId),
          url,
          digitalHome?.spatialData?.boundary,
        );

        await this.sceneManager.setHomeModel(homeModel);
        this.debugHomeModelStructure();
      }
    } catch (error) {
      console.error("Failed to load home:", error);
    }
  }

  async loadFurnitureCatalog(): Promise<void> {
    this.updateState({ catalogLoading: true });
    try {
      const response = await makeAuthenticatedRequest(
        "/digitalhomes/list_available_items/",
      );

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
          wall_mountable: item.wall_mountable || false,
        }));

        this.updateState({ furnitureCatalog: items });

        for (const item of items) {
          await this.loadFurnitureModel(item.model_id);
        }
      }
    } catch (error) {
      console.error("Error loading furniture catalog:", error);
    } finally {
      this.updateState({ catalogLoading: false });
    }
  }

  private async loadFurnitureModel(modelId: number): Promise<void> {
    if (this.modelUrlCache.has(modelId)) return;

    try {
      const response = await makeAuthenticatedRequest(
        `/products/get_3d_model/${modelId}/`,
      );
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
        `/digitalhomes/get_deployed_items_details/${this.homeId}/`,
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
            },
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
      console.error("Error loading deployed items:", error);
    } finally {
      this.updateState({ loading: false });
    }
  }

  async loadTexturesForFurniture(furnitureId: string): Promise<void> {
    if (!this.sceneManager) return;

    const furniture = this.sceneManager.getFurniture(furnitureId);
    if (!furniture) return;

    const modelId = furniture.getModelId();
    const cacheKey = `model-${modelId}`;

    if (this.textureCache.has(cacheKey)) {
      return Promise.resolve().then(() => {
        this.updateState({
          textureOptions: this.textureCache.get(cacheKey) || [],
          selectedFurnitureTextureId: undefined,
        });
      });
    }

    if (this.textureLoadingCache.has(cacheKey)) {
      return this.textureLoadingCache.get(cacheKey)!;
    }

    const loadingPromise = this._fetchTexturesFromAPI(modelId, cacheKey);
    this.textureLoadingCache.set(cacheKey, loadingPromise);

    try {
      await loadingPromise;
    } finally {
      this.textureLoadingCache.delete(cacheKey);
    }
  }

  private async _fetchTexturesFromAPI(
    model_id: number,
    cacheKey: string,
  ): Promise<void> {
    if (!this.sceneManager) return;

    try {
      const response = await makeAuthenticatedRequest(
        `/products/get_texture/${model_id}/`,
      );

      if (!response.ok) {
        console.warn(`[TEXTURES] ⚠️ API failed (${response.status})`);
        this.updateState({
          textureOptions: [],
          selectedFurnitureTextureId: undefined,
        });
        return;
      }

      const data = await response.json();

      const textures: TextureOption[] = [];
      const textureLoaders: Promise<void>[] = [];

      for (let index = 0; index < data.textures.length; index++) {
        const texture = data.textures[index];

        const loadPromise = (async () => {
          try {
            const base64String = texture.file;

            const binaryString = atob(base64String);

            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: "image/jpeg" });

            const blobUrl = URL.createObjectURL(blob);

            const textureLoader = new THREE.TextureLoader();
            const three3DTexture = await new Promise<THREE.Texture>(
              (resolve, reject) => {
                textureLoader.load(
                  blobUrl,
                  (loadedTexture) => {
                    loadedTexture.wrapS = THREE.RepeatWrapping;
                    loadedTexture.wrapT = THREE.RepeatWrapping;
                    loadedTexture.magFilter = THREE.LinearFilter;
                    loadedTexture.minFilter = THREE.LinearFilter;
                    loadedTexture.needsUpdate = true;

                    resolve(loadedTexture);
                  },
                  undefined,
                  (error) => {
                    console.error(
                      `[TEXTURES] ❌ Failed to load THREE.Texture ${texture.texture_id}:`,
                      error,
                    );
                    reject(error);
                  },
                );
              },
            );

            textures.push({
              id: `texture-${texture.texture_id}`,
              name: `Texture ${index + 1}`,
              imagePath: blobUrl,
              color: "#ffffff",

              threeTexture: three3DTexture,
            });
          } catch (error) {
            console.error(
              `[TEXTURES] ❌ Failed to process texture ${texture.texture_id}:`,
              error,
            );
          }
        })();

        textureLoaders.push(loadPromise);
      }

      await Promise.all(textureLoaders);

      this.textureCache.set(cacheKey, textures);

      this.updateState({
        textureOptions: textures,
        selectedFurnitureTextureId: undefined,
      });
    } catch (error) {
      console.error("[TEXTURES] ❌ Error:", error);
      this.showNotificationMessage("Failed to load textures", "error");
      this.updateState({
        textureOptions: [],
        selectedFurnitureTextureId: undefined,
      });
    }
  }

  handleShowTextures(): void {
    if (!this.state.selectedItemId) {
      this.showNotificationMessage(
        "Please select a furniture item first",
        "info",
      );
      return;
    }

    this.loadTexturesForFurniture(this.state.selectedItemId).then(() => {
      const hasTextures =
        this.state.textureOptions && this.state.textureOptions.length > 0;
      if (!hasTextures) {
        this.showNotificationMessage(
          "No textures available for this item",
          "info",
        );
        return;
      }
      this.updateState({ showTexturePanel: true });
    });
  }

  async handleSelectTexture(
    textureId: string,
    texturePath: string,
  ): Promise<void> {
    if (!this.state.selectedItemId || !this.sceneManager) return;

    try {
      const furniture = this.sceneManager.getFurniture(
        this.state.selectedItemId,
      );
      if (!furniture) return;

      const textureLoader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(texturePath, resolve, undefined, reject);
      });

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      texture.repeat.set(20, 20);

      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 16;

      texture.needsUpdate = true;

      const group = furniture.getGroup();
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material.clone();
          material.map = texture;
          material.needsUpdate = true;
          child.material = material;
        }
      });

      this.updateState({
        selectedFurnitureTextureId: textureId,
      });
    } catch (error) {
      console.error("[TEXTURE] Failed to apply texture:", error);
      this.showNotificationMessage("Failed to load texture", "error");
    }
  }

  handleCloseTexturePanel(): void {
    this.updateState({ showTexturePanel: false });
  }

  async loadEnvironmentTextures(): Promise<void> {
    this.updateState({ loadingEnvironment: true });
    try {
      const floorResponse = await makeAuthenticatedRequest(
        `/digitalhomes/get_textures/${this.homeId}`,
      );

      if (floorResponse.ok) {
        const floorData = await floorResponse.json();
        const floorTextures = await this.processEnvironmentTextures(
          floorData.textures,
          "floor",
        );
        this.updateState({ floorTextures });
      }

      const wallResponse = await makeAuthenticatedRequest(
        `/digitalhomes/get_textures/${this.homeId}`,
      );

      if (wallResponse.ok) {
        const wallData = await wallResponse.json();
        const wallTextures = await this.processEnvironmentTextures(
          wallData.textures,
          "wall",
        );
        this.updateState({ wallTextures });
      }
    } catch (error) {
      console.error("Error loading environment textures:", error);
      this.showNotificationMessage(
        "Failed to load environment textures",
        "error",
      );
    } finally {
      this.updateState({ loadingEnvironment: false });
    }
  }

  private async processEnvironmentTextures(
    textures: any[],
    type: "floor" | "wall",
  ): Promise<EnvironmentOption[]> {
    const processedTextures: EnvironmentOption[] = [];
    const textureLoaders: Promise<void>[] = [];

    for (let index = 0; index < textures.length; index++) {
      const texture = textures[index];

      const loadPromise = (async () => {
        try {
          const base64String = texture.file;

          const binaryString = atob(base64String);

          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const blob = new Blob([bytes], { type: "image/jpeg" });

          const blobUrl = URL.createObjectURL(blob);

          const textureLoader = new THREE.TextureLoader();
          const three3DTexture = await new Promise<THREE.Texture>(
            (resolve, reject) => {
              textureLoader.load(
                blobUrl,
                (loadedTexture) => {
                  loadedTexture.wrapS = THREE.RepeatWrapping;
                  loadedTexture.wrapT = THREE.RepeatWrapping;
                  loadedTexture.magFilter = THREE.LinearFilter;
                  loadedTexture.minFilter = THREE.LinearFilter;
                  loadedTexture.needsUpdate = true;
                  resolve(loadedTexture);
                },
                undefined,
                reject,
              );
            },
          );

          processedTextures.push({
            id: `${type}-texture-${texture.texture_id}`,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`,
            type: type,
            imagePath: blobUrl,
            color: "#ffffff",
            threeTexture: three3DTexture,
          });
        } catch (error) {
          console.error(
            `[ENV-TEXTURES] Failed to process ${type} texture ${texture.texture_id}:`,
            error,
          );
        }
      })();

      textureLoaders.push(loadPromise);
    }

    await Promise.all(textureLoaders);

    return processedTextures;
  }

  async handleSelectFloorTexture(
    textureId: string,
    texturePath: string,
  ): Promise<void> {
    if (!this.sceneManager) return;

    try {
      const homeModel = this.sceneManager.getHomeModel();
      if (!homeModel) {
        this.showNotificationMessage("Home model not loaded", "error");
        return;
      }

      const textureLoader = new THREE.TextureLoader();

      textureLoader.load(
        texturePath,
        (loadedTexture) => {
          loadedTexture.wrapS = THREE.RepeatWrapping;
          loadedTexture.wrapT = THREE.RepeatWrapping;
          loadedTexture.repeat.set(20, 20);
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.anisotropy = 16;
          loadedTexture.needsUpdate = true;

          let floorCount = 0;
          homeModel.getGroup().traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              if (child.name === "Floor" || child.name.includes("Floor")) {
                const material = Array.isArray(child.material)
                  ? child.material.map((m) => m.clone())
                  : child.material.clone();

                if (Array.isArray(material)) {
                  material.forEach((m) => {
                    m.map = loadedTexture;
                    m.needsUpdate = true;
                  });
                } else {
                  material.map = loadedTexture;
                  material.needsUpdate = true;
                }

                child.material = material;
                floorCount++;
              }
            }
          });

          if (floorCount === 0) {
            console.warn("[FLOOR-TEXTURE] No floor meshes found!");
            this.showNotificationMessage(
              "No floor meshes found in model",
              "error",
            );
          } else {
            this.updateState({ selectedFloorId: textureId });
            this.showNotificationMessage(
              `Floor texture updated! (${floorCount} meshes)`,
              "success",
            );
          }
        },
        undefined,
        (error) => {
          console.error("[FLOOR-TEXTURE] Failed to load texture:", error);
          this.showNotificationMessage("Failed to load floor texture", "error");
        },
      );
    } catch (error) {
      console.error("[FLOOR-TEXTURE] Error:", error);
      this.showNotificationMessage("Failed to apply floor texture", "error");
    }
  }

  async handleSelectWallTexture(
    textureId: string,
    texturePath: string,
  ): Promise<void> {
    if (!this.sceneManager) return;

    try {
      const homeModel = this.sceneManager.getHomeModel();
      if (!homeModel) {
        this.showNotificationMessage("Home model not loaded", "error");
        return;
      }

      const textureLoader = new THREE.TextureLoader();

      textureLoader.load(
        texturePath,
        (loadedTexture) => {
          loadedTexture.wrapS = THREE.RepeatWrapping;
          loadedTexture.wrapT = THREE.RepeatWrapping;
          loadedTexture.repeat.set(20, 20);
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.anisotropy = 16;
          loadedTexture.needsUpdate = true;

          let wallCount = 0;
          homeModel.getGroup().traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              if (child.name === "Wall" || child.name.includes("Wall")) {
                const material = Array.isArray(child.material)
                  ? child.material.map((m) => m.clone())
                  : child.material.clone();

                if (Array.isArray(material)) {
                  material.forEach((m) => {
                    m.map = loadedTexture;
                    m.needsUpdate = true;
                  });
                } else {
                  material.map = loadedTexture;
                  material.needsUpdate = true;
                }

                child.material = material;
                wallCount++;
              }
            }
          });

          if (wallCount === 0) {
            console.warn("[WALL-TEXTURE] No wall meshes found!");
            this.showNotificationMessage(
              "No wall meshes found in model",
              "error",
            );
          } else {
            this.updateState({ selectedWallId: textureId });
            this.showNotificationMessage(
              `Wall texture updated! (${wallCount} meshes)`,
              "success",
            );
          }
        },
        undefined,
        (error) => {
          console.error("[WALL-TEXTURE] Failed to load texture:", error);
          this.showNotificationMessage("Failed to load wall texture", "error");
        },
      );
    } catch (error) {
      console.error("[WALL-TEXTURE] Error:", error);
      this.showNotificationMessage("Failed to apply wall texture", "error");
    }
  }

  debugHomeModelStructure(): void {
    if (!this.sceneManager) return;

    const homeModel = this.sceneManager.getHomeModel();
    if (!homeModel) {
      console.warn("[DEBUG] No home model loaded");
      return;
    }

    const meshes: any[] = [];

    homeModel.getGroup().traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        meshes.push({
          name: child.name,
          type: child.userData?.type || "unknown",
          materialType: child.material.constructor.name,
          hasMaterial: !!child.material,
        });
      }
    });
  }

  showNotificationMessage(
    message: string,
    type: "success" | "error" | "info" = "info",
    fromControlPanel: boolean = false,
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
    const { showMoveCloserPanel, showPreciseCheckPanel, showControlPanel, showInstructions, showFurniture, selectedItemId, experienceMode } = this.state;

    if (showMoveCloserPanel || showPreciseCheckPanel || experienceMode) return;

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

  handleAlignmentModeSelect(mode: "world" | "free"): void {
    if (mode === "world") {
      if (this.state.homeTransparent) {
        this.sceneManager?.getHomeModel()?.setOpacity(0.3);
      }
      this.updateState({
        alignmentMode: "world",
        alignmentStatus: "aligning",
        showAlignmentPanel: false,
        showAlignmentConfirm: true,
      });
    } else {
      // Free roam mode - skip alignment
      if (this.state.homeTransparent) {
        this.sceneManager?.getHomeModel()?.setOpacity(0.0);
      }
      this.updateState({
        alignmentMode: "free",
        alignmentStatus: "aligned",
        showAlignmentPanel: false,
        showAlignmentConfirm: false,
        showInstructions: true,
        showSidebar: true,
      });
    }
  }

  handleAlignmentConfirm(): void {
    if (this.state.homeTransparent) {
      this.sceneManager?.getHomeModel()?.setOpacity(0.0);
    }
    this.updateState({
      alignmentStatus: "aligned",
      showAlignmentConfirm: false,
      showInstructions: true,
      showSidebar: true,
    });
  }

  handleAlignmentCancel(): void {
    if (this.state.homeTransparent) {
      this.sceneManager?.getHomeModel()?.setOpacity(0.0);
    }
    this.updateState({
      alignmentMode: null,
      alignmentStatus: "pending",
      showAlignmentConfirm: false,
      showAlignmentPanel: true,
    });
  }

  handleToggleAlignmentMode(): void {
    if (this.state.alignmentStatus === "aligned" && this.state.alignmentMode === "world") {
      if (this.state.homeTransparent) {
        this.sceneManager?.getHomeModel()?.setOpacity(0.0);
      }
      this.updateState({
        alignmentMode: "free",
      });
    } else if (this.state.alignmentStatus === "aligned" && this.state.alignmentMode === "free") {
      if (this.state.homeTransparent) {
        this.sceneManager?.getHomeModel()?.setOpacity(0.3);
      }
      this.updateState({
        alignmentMode: "world",
        alignmentStatus: "aligning",
        showAlignmentConfirm: true,
      });
    }
  }

  handleToggleHomeTransparency(): void {
    const homeModel = this.sceneManager?.getHomeModel();
    if (!homeModel) return;
 
    const newTransparent = !this.state.homeTransparent;
    homeModel.setTransparent(newTransparent);
    this.updateState({ homeTransparent: newTransparent });
  }

  handleToggleExperienceMode(): void {
    const newExperienceMode = !this.state.experienceMode;
    
    if (this.furnitureController) {
      this.furnitureController.setEnabled(!newExperienceMode);
    }

    if (newExperienceMode) {
      if (this.state.selectedItemId) {
        this.sceneManager?.deselectFurniture(this.state.selectedItemId);
        this.furnitureController?.setSelectedFurniture(null);
      }
      this.updateState({
        experienceMode: newExperienceMode,
        selectedItemId: null,
        showSlider: false,
        showTransformGizmo: false,
        gizmoPosition: null,
        showRotationGizmo: false,
        rotationGizmoPosition: null,
        showScalePanel: false,
        showTexturePanel: false,
        showFurniture: false,
        showSidebar: false,
        sidebarActiveItem: null,
      });
    } else {
      this.updateState({
        experienceMode: newExperienceMode,
        showSidebar: true,
      });
    }
  }

  handleToggleControlPanel(): void {
    const { showMoveCloserPanel, showPreciseCheckPanel, showControlPanel } =
      this.state;

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

  handleSidebarItemSelect(itemId: string): void {
    if (this.state.experienceMode) return;
    this.updateState({ sidebarActiveItem: itemId });

    switch (itemId) {
      case "movement":
        this.updateState({
          showInstructions: false,
          showFurniture: false,
          showControlPanel: false,
          showSlider: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showTexturePanel: false,
          showEnvironmentPanel: false,
        });

        if (this.state.selectedItemId) {
          const furniture = this.sceneManager?.getFurniture(
            this.state.selectedItemId,
          );
          if (furniture) {
            this.updateState({
              showTransformGizmo: true,
              gizmoPosition: furniture.getPosition(),
            });
          }
        }

        break;

      case "rotation":
        if (this.state.selectedItemId) {
          const furniture = this.sceneManager?.getFurniture(
            this.state.selectedItemId,
          );
          if (furniture) {
            this.updateState({
              showRotationGizmo: true,
              rotationGizmoPosition: furniture.getPosition(),
              showFurniture: false,
              showControlPanel: false,
              showTransformGizmo: false,
              showSlider: false,
              showScalePanel: false,
              showTexturePanel: false,
              showEnvironmentPanel: false,
            });
          }
        }
        break;

      case "scale":
        if (this.state.selectedItemId) {
          const furniture = this.sceneManager?.getFurniture(
            this.state.selectedItemId,
          );
          if (furniture) {
            this.updateState({
              showScalePanel: true,
              showTransformGizmo: false,
              showRotationGizmo: false,
              showFurniture: false,
              showControlPanel: false,
              showSlider: false,
              showTexturePanel: false,
              showEnvironmentPanel: false,
            });
          }
        }

        break;

      case "environment":
        if (
          this.state.floorTextures.length === 0 &&
          this.state.wallTextures.length === 0
        ) {
          this.loadEnvironmentTextures();
        }
        this.updateState({
          showEnvironmentPanel: true,
          showFurniture: false,
          showControlPanel: false,
          showTransformGizmo: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showTexturePanel: false,
          showInstructions: false,
          showSlider: false,
        });
        break;

      case "texture":
        this.updateState({
          sidebarActiveItem: "texture",
          showFurniture: false,
          showControlPanel: false,
          showTransformGizmo: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showEnvironmentPanel: false,
          showInstructions: false,
          showSlider: false,
          showTexturePanel: false,
        });

        if (this.state.selectedItemId) {
          this.loadTexturesForFurniture(this.state.selectedItemId).then(() => {
            const hasTextures =
              this.state.textureOptions && this.state.textureOptions.length > 0;
            if (!hasTextures) {
              this.showNotificationMessage(
                "No textures available for this item",
                "info",
              );
              return;
            }
            this.updateState({
              showTexturePanel: true,
            });
          });
        } else {
          this.showNotificationMessage(
            "Texture mode: Click on furniture to change texture",
            "info",
          );
        }

        break;

      case "settings":
        this.updateState({
          showControlPanel: true,
          showFurniture: false,
          showSlider: false,
          showInstructions: false,
          showTransformGizmo: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showTexturePanel: false,
          showEnvironmentPanel: false,
        });
        break;

      case "customize":
        this.updateState({
          showFurniture: true,
          showControlPanel: false,
          showSlider: false,
          showInstructions: false,
          showTransformGizmo: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showTexturePanel: false,
          showEnvironmentPanel: false,
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
      formData.append("id", this.homeId);
      formData.append("deployedItems", JSON.stringify(sceneData.deployedItems));

      const response = await makeAuthenticatedRequest(
        "/digitalhomes/update_home_design/",
        {
          method: "POST",
          body: formData,
        },
      );

      if (response.ok) {
        this.showNotificationMessage(
          "Scene saved successfully!",
          "success",
          true,
        );
      } else {
        const error = await response.json();
        this.showNotificationMessage(
          `Failed to save scene: ${error.error}`,
          "error",
          true,
        );
      }
    } catch (error) {
      console.error("Error saving scene:", error);
      this.showNotificationMessage(
        "Error saving scene. Please try again.",
        "error",
        true,
      );
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

  private async handleFurnitureMove(
    id: string,
    delta: THREE.Vector3,
  ): Promise<void> {
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

    const result = await this.sceneManager.moveFurniture(
      id,
      newPos,
      isInAABBZone,
      false,
    );

    if (!result.success && result.needsConfirmation) {
      this.pendingMove = newPos;
      this.updateState({ showMoveCloserPanel: true });
    } else if (result.success && result.needsPreciseCheck) {
      this.currentAABBPosition = newPos;
      this.updateState({ showPreciseCheckPanel: true });
    } else if (!result.success && !result.needsConfirmation) {
      if (result.reason) {
        this.showNotificationMessage(`⚠️ ${result.reason}`, "error");
      }
      this.currentAABBPosition = null;
    } else if (result.success && !result.needsPreciseCheck) {
      this.currentAABBPosition = null;
    }
  }

  private async handleWallFurnitureMove(
    id: string,
    deltaVertical: number,
    deltaHorizontal: number,
  ): Promise<void> {
    if (!this.sceneManager) return;

    const furniture = this.sceneManager.getFurniture(id);
    if (!furniture || !furniture.isOnWall()) return;

    const result = await this.sceneManager.moveWallFurniture(
      id,
      deltaVertical,
      deltaHorizontal,
    );

    if (!result.success && result.needsConfirmation) {
      const newPos = furniture.moveAlongWall(deltaVertical, deltaHorizontal);
      this.pendingMove = newPos;
      this.updateState({ showMoveCloserPanel: true });
    } else if (result.success && result.needsPreciseCheck) {
      const newPos = furniture.getPosition();
      this.currentAABBPosition = newPos;
      this.updateState({ showPreciseCheckPanel: true });
    } else if (!result.success && !result.needsConfirmation) {
      if (result.reason) {
        this.showNotificationMessage(`⚠️ ${result.reason}`, "error");
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
    this.updateState({
      selectedItemId: null,
      showSlider: false,
      showTransformGizmo: false,
      gizmoPosition: null,
      showRotationGizmo: false,
      rotationGizmoPosition: null,
      showScalePanel: false,
      sidebarActiveItem: null,
      selectedItemPlacementMode: "floor",
      showTexturePanel: false,
      textureOptions: [],
      selectedFurnitureTextureId: undefined,
    });
    this.currentAABBPosition = null;
    this.pendingMove = null;
  }

  async handleConfirmMoveCloser(): Promise<void> {
    if (!this.state.selectedItemId || !this.sceneManager || !this.pendingMove)
      return;

    this.updateState({ showMoveCloserPanel: false, showControlPanel: false });

    const result = await this.sceneManager.moveFurniture(
      this.state.selectedItemId,
      this.pendingMove,
      true,
      false,
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
    if (
      !this.state.selectedItemId ||
      !this.sceneManager ||
      !this.currentAABBPosition
    )
      return;

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
        true,
      );

      if (!result.success) {
        this.showNotificationMessage(
          "⚠️ Precise overlap detected! Furniture moved back to safe position.",
          "error",
        );
        this.currentAABBPosition = null;
      } else {
        this.showNotificationMessage(
          "✅ Position validated! Furniture can stay here.",
          "success",
        );
      }
    } catch (error) {
      console.error("Error during precise collision check:", error);
      this.showNotificationMessage(
        "❌ Error checking collision. Please try again.",
        "error",
      );
    } finally {
      this.updateState({ preciseCheckInProgress: false });
    }
  }

  handleCancelPreciseCheck(): void {
    if (!this.state.selectedItemId || !this.sceneManager) return;

    const lastValid = this.sceneManager.getLastValidPosition(
      this.state.selectedItemId,
    );
    if (lastValid) {
      const furniture = this.sceneManager.getFurniture(
        this.state.selectedItemId,
      );
      if (furniture) {
        furniture.setPosition(lastValid);
        const collisionDetector = this.sceneManager.getCollisionDetector();
        collisionDetector.updateFurnitureBox(
          this.state.selectedItemId,
          furniture.getGroup(),
          furniture.getModelId(),
        );
        furniture.setCollision(false);
      }
    }

    this.updateState({ showPreciseCheckPanel: false });
    this.currentAABBPosition = null;
  }

  handleSelectFurniture(f: any, camera: THREE.Camera): void {
    if (!this.sceneManager || this.state.alignmentStatus !== "aligned" || this.state.experienceMode) return;

    const catalogId = f.id;
    const allFurniture = this.sceneManager.getAllFurniture();

    const getPlacedCatalogId = (itemId: string) =>
      itemId.replace(/-\d+$/, "") || itemId;
    const existingFurniture = allFurniture.find(
      (item) => getPlacedCatalogId(item.getId()) === catalogId,
    );

    if (existingFurniture) {
      this.sceneManager.removeFurniture(existingFurniture.getId());
      if (this.state.selectedItemId === existingFurniture.getId()) {
        this.updateState({ selectedItemId: null, showSlider: false });
      }
      return;
    }

    const spawnPos = this.sceneManager.calculateSpawnPosition(camera, 2);
    const initialRotation: [number, number, number] = [0, 0, 0];
    const uniqueId = `${f.id}-${Date.now()}`;

    if (f.widgetType === "clock") {
      const newFurniture = new ClockWidget(uniqueId, f.name, {
        position: spawnPos,
        rotation: initialRotation,
        scale: this.state.sliderValue,
      });
      newFurniture.setScale(this.state.sliderValue);

      this.sceneManager.addFurniture(newFurniture).then(() => {
        this.sceneManager!.selectFurniture(uniqueId);
        if (this.sceneManager!.selectFurniture(uniqueId)) {
          this.furnitureController?.setSelectedFurniture(uniqueId);
          this.updateState({
            selectedItemId: uniqueId,
            rotationValue: initialRotation[1],
            showSlider: true,
            selectedItemPlacementMode: "floor",
          });
        }
      });
      return;
    }

    if (f.widgetType === "whiteboard") {
      const newFurniture = new WhiteboardWidget(uniqueId, f.name, {
        position: spawnPos,
        rotation: initialRotation,
        scale: this.state.sliderValue,
      });
      newFurniture.setScale(this.state.sliderValue);

      this.sceneManager.addFurniture(newFurniture).then(() => {
        this.sceneManager!.selectFurniture(uniqueId);
        if (this.sceneManager!.selectFurniture(uniqueId)) {
          this.furnitureController?.setSelectedFurniture(uniqueId);
          this.updateState({
            selectedItemId: uniqueId,
            rotationValue: initialRotation[1],
            showSlider: true,
            selectedItemPlacementMode: "floor",
          });
        }
      });
      return;
    }

    const modelPath = this.modelUrlCache.get(f.model_id);
    if (!modelPath) {
      console.warn("Model not loaded yet for:", f.name);
      return;
    }

    const isWallMountable = f.wall_mountable || false;

    const metadata: FurnitureMetadata = {
      description: f.description,
      category: f.category,
      type: f.type,
      isContainer: f.is_container,
      image: f.image,
      wallMountable: isWallMountable,
    };

    const newFurniture = new FurnitureItem(
      uniqueId,
      f.name,
      f.model_id,
      modelPath,
      metadata,
      {
        position: spawnPos,
        rotation: initialRotation,
        scale: this.state.sliderValue,
      },
    );

    this.sceneManager.addFurniture(newFurniture).then(() => {
      this.sceneManager!.selectFurniture(uniqueId);
      if (this.sceneManager!.selectFurniture(uniqueId)) {
        this.furnitureController?.setSelectedFurniture(uniqueId);
        this.updateState({
          selectedItemId: uniqueId,
          rotationValue: initialRotation[1],
          showSlider: true,
         // showFurniture: false,
          selectedItemPlacementMode: 'floor',
        });
      }
    });
  }

  handleSelectItem(id: string): void {
    if (!this.sceneManager || this.state.experienceMode) {
      return;
    }

    if (
      this.state.selectedItemId === id &&
      (this.state.showTransformGizmo || this.state.showRotationGizmo)
    ) {
      return;
    }

  if (this.state.selectedItemId === id && !this.state.showTransformGizmo && !this.state.showRotationGizmo) {
    this.sceneManager.deselectFurniture(id);
    this.furnitureController?.setSelectedFurniture(null);
    this.updateState({
      selectedItemId: null,
      showSlider: false,
      showTransformGizmo: false,
      gizmoPosition: null,
      showRotationGizmo: false,
      rotationGizmoPosition: null,
      selectedItemPlacementMode: 'floor',
      showTexturePanel: false,
    });
    return;
  }

    if (this.state.selectedItemId) {
      this.sceneManager.deselectFurniture(this.state.selectedItemId);
    }

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

      const scaleValue = typeof scale === "number" ? scale : scale[0];

    // Show gizmo based on current sidebar mode
    const showMovementGizmo = this.state.sidebarActiveItem === 'movement';
    const showRotGizmo = this.state.sidebarActiveItem === 'rotation';
    const isTextureMode = this.state.sidebarActiveItem === "texture";

    // Track wall-mountable state
    const placementMode = furniture.getPlacementMode();

      this.updateState({
        selectedItemId: id,
        showSlider: !showMovementGizmo && !showRotGizmo && !isTextureMode,
        rotationValue: normalizedRotation,
        sliderValue: scaleValue,
        showTransformGizmo: showMovementGizmo,
        gizmoPosition: showMovementGizmo ? position : null,
        showRotationGizmo: showRotGizmo,
        rotationGizmoPosition: showRotGizmo ? position : null,
        selectedItemPlacementMode: placementMode,

        showTexturePanel: false,
        textureOptions: [],
      });

      if (isTextureMode) {
        this.loadTexturesForFurniture(id).then(() => {
          const hasTextures =
            this.state.textureOptions && this.state.textureOptions.length > 0;
          if (!hasTextures) {
            this.showNotificationMessage(
              "No textures available for this item",
              "info",
            );
            return;
          }
          this.updateState({
            showTexturePanel: true,
          });
        });
      }
    }
  }

  handleSelectWhiteboardInExperience(id: string): void {
    const furniture = this.sceneManager?.getFurniture(id);
    if (!furniture || furniture.getMetadata().type !== "Whiteboard") return;
    this.updateState({
      experienceWhiteboardId: id,
      whiteboardTool: "pen",
    });
  }

  handleExitWhiteboardDrawing(): void {
    const id = this.state.experienceWhiteboardId;
    if (id) {
      const wb = this.sceneManager?.getFurniture(id) as WhiteboardWidget | undefined;
      wb?.endStroke();
    }
    this.updateState({ experienceWhiteboardId: null });
  }

  handleSetWhiteboardTool(tool: WhiteboardTool): void {
    const id = this.state.experienceWhiteboardId;
    if (id) {
      const wb = this.sceneManager?.getFurniture(id) as WhiteboardWidget | undefined;
      wb?.endStroke();
    }
    this.updateState({ whiteboardTool: tool });
  }

  handleWhiteboardClear(): void {
    const id = this.state.experienceWhiteboardId;
    if (!id) return;
    const wb = this.sceneManager?.getFurniture(id) as WhiteboardWidget | undefined;
    wb?.clear?.();
  }

  recordWhiteboardPointerHit(whiteboardId: string, worldPoint: THREE.Vector3): void {
    this.lastWhiteboardPointerId = whiteboardId;
    if (!this.lastWhiteboardPointerPoint) this.lastWhiteboardPointerPoint = new THREE.Vector3();
    this.lastWhiteboardPointerPoint.copy(worldPoint);
  }

  clearWhiteboardPointerHit(): void {
    const wbId = this.state.experienceWhiteboardId;
    if (wbId) {
      const wb = this.sceneManager?.getFurniture(wbId) as WhiteboardWidget | undefined;
      wb?.endStroke();
    }
    this.lastWhiteboardPointerId = null;
  }

  handleGizmoMove(axis: "x" | "y" | "z", delta: number): void {
  if (!this.state.selectedItemId || !this.sceneManager) return;

  const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
  if (!furniture) return;

  const currentPos = furniture.getPosition();
  const newPos: [number, number, number] = [...currentPos];

  switch (axis) {
    case 'x': newPos[0] += delta; break;
    case 'y': newPos[1] += delta; break;
    case 'z': newPos[2] += delta; break;
  }

  
  this.updateState({ gizmoPosition: newPos });

  this.sceneManager.moveFurniture(this.state.selectedItemId, newPos, false, false)
    .then((result) => {
      if (!result.success) {
        if (result.needsConfirmation) {
          this.pendingMove = newPos;
          this.updateState({ showMoveCloserPanel: true });
        }
       
        const revertPos = furniture.getPosition();
        this.updateState({ gizmoPosition: revertPos });
      }
    })
    .catch((err) => {
      console.error(`[handleGizmoMove] Error:`, err);
      this.updateState({ gizmoPosition: furniture.getPosition() });
    });
}


  handleGizmoRotate(axis: "x" | "y" | "z", deltaRadians: number): void {
    if (!this.state.selectedItemId || !this.sceneManager) {
      console.warn(`[handleGizmoRotate] Invalid state:`, {
        selectedItemId: this.state.selectedItemId,
        hasSceneManager: !!this.sceneManager,
      });
      return;
    }

    const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
    if (!furniture) {
      console.warn(
        `[handleGizmoRotate] Furniture not found:`,
        this.state.selectedItemId,
      );
      return;
    }

    const currentRot = furniture.getRotation();
    const newRot: [number, number, number] = [...currentRot];

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


  this.sceneManager.rotateFurniture(this.state.selectedItemId, newRot);


  const twoPi = Math.PI * 2;
  let normalizedRotation = newRot[1] % twoPi;
  if (normalizedRotation < 0) normalizedRotation += twoPi;
  this.updateState({ rotationValue: normalizedRotation });
}

  handleScaleChange(newScale: number): void {
  const clampedScale = Math.max(0.5, Math.min(3, newScale));
  this.updateState({ sliderValue: clampedScale });
  
  if (this.state.selectedItemId && this.sceneManager) {
    this.sceneManager.scaleFurniture(this.state.selectedItemId, clampedScale);
  }
}

  handleRotationSliderChange(newRotation: number): void {
    this.updateState({ rotationValue: newRotation });
    if (this.state.selectedItemId && this.sceneManager) {
      const furniture = this.sceneManager.getFurniture(
        this.state.selectedItemId,
      );
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
    return this.sceneManager
      .getAllFurniture()
      .map((item) => {
        const id = item.getId();
        return id.replace(/-\d+$/, "") || id;
      });
  }

  updateFrame(session: any, camera: THREE.Camera, delta: number): void {
    if (!session) return;

    const isAligning = this.state.alignmentStatus === "aligning" && this.state.alignmentMode === "world";
    if (this.navigationController) {
      this.navigationController.setAlignmentMode(isAligning);

      if (isAligning && this.sceneManager?.getHomeModel()) {
        this.navigationController.setHomeModelGroup(this.sceneManager.getHomeModel()!.getGroup());
      } else {
        this.navigationController.setHomeModelGroup(null);
      }
    }

    let whiteboardDrawingThisFrame = false;
    const wbId = this.state.experienceWhiteboardId;
    if (this.state.experienceMode && wbId && this.sceneManager) {
      const wb = this.sceneManager.getFurniture(wbId) as WhiteboardWidget | undefined;
      if (wb) {
        let drawPoint: THREE.Vector3 | null = null;
        const usePointerHit =
          this.lastWhiteboardPointerId === wbId && this.lastWhiteboardPointerPoint;
        if (usePointerHit && session.inputSources) {
          for (let i = 0; i < session.inputSources.length; i++) {
            const gamepad = session.inputSources[i]?.gamepad;
            const trigger = gamepad?.buttons?.[0]?.pressed ?? false;
            const grip = gamepad?.buttons?.[1]?.pressed ?? false;
            if (trigger || grip) {
              drawPoint = this.lastWhiteboardPointerPoint;
              break;
            }
          }
        }
        if (!drawPoint && this.renderer?.xr && session.inputSources) {
          const boardMesh = wb.getBoardMesh?.();
          if (boardMesh) {
            const raycaster = new THREE.Raycaster();
            const origin = new THREE.Vector3();
            const direction = new THREE.Vector3();
            for (let i = 0; i <= 1; i++) {
              const controller = (this.renderer as any).xr.getController?.(i);
              if (!controller) continue;
              const gamepad = session.inputSources[i]?.gamepad;
              const trigger = gamepad?.buttons?.[0]?.pressed ?? false;
              const grip = gamepad?.buttons?.[1]?.pressed ?? false;
              if (!trigger && !grip) continue;
              controller.getWorldPosition(origin);
              controller.getWorldDirection(direction);
              raycaster.set(origin, direction);
              const hits = raycaster.intersectObject(boardMesh, true);
              if (hits.length > 0) {
                drawPoint = hits[0].point;
                break;
              }
            }
          }
        }
        if (drawPoint) {
          if (!this.lastFrameWhiteboardDrawing) wb.startStroke();
          wb.drawAt(drawPoint, this.state.whiteboardTool);
          whiteboardDrawingThisFrame = true;
        } else if (this.lastFrameWhiteboardDrawing) {
          wb.endStroke();
        }
      }
    }
    this.lastFrameWhiteboardDrawing = whiteboardDrawingThisFrame;

    const canNavigate = (this.state.alignmentStatus === "aligning" && this.state.alignmentMode === "world") ||
                       (this.state.alignmentStatus === "aligned" && this.state.alignmentMode === "free");
    if (canNavigate && !whiteboardDrawingThisFrame) {
      this.navigationController?.update(session, camera, delta);
    }

    if (this.state.alignmentStatus === "aligned" &&
        !this.state.navigationMode &&
        this.state.selectedItemId &&
        this.furnitureController &&
        !this.state.experienceMode) {
      this.furnitureController.update(session, camera, delta);
    }

    this.sceneManager?.updateAnimations(delta);
  }
}


export function SceneContent({ homeId, digitalHome, arModeRequested }: SceneContentProps) {
  const navigate = useNavigate();
  const { scene, camera } = useThree();
  const xr = useXR();
  const xrStore = useXRStore();

  const [state, setState] = useState<SceneState>({
    showSlider: false,
    showFurniture: false,
    showInstructions: false,
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
    showSidebar: true,
    sidebarActiveItem: null,
    showTransformGizmo: false,
    gizmoPosition: null,
    showRotationGizmo: false,
    rotationGizmoPosition: null,
    showScalePanel: false,
    selectedItemPlacementMode: "floor",
    showTexturePanel: false,
    textureOptions: [],
    selectedFurnitureTextureId: undefined,
    showEnvironmentPanel: false,
    floorTextures: [],
    wallTextures: [],
    selectedFloorId: undefined,
    selectedWallId: undefined,
    loadingEnvironment: false,
    alignmentStatus: 'pending',
    alignmentMode: null,
    showAlignmentPanel: true,
    showAlignmentConfirm: false,
    homeTransparent: false,
    experienceMode: false,
    experienceWhiteboardId: null,
    whiteboardTool: "pen",
  });

  const logicRef = useRef<SceneContentLogic | null>(null);

  useEffect(() => {
    const updateState = (
      update: Partial<SceneState> | ((prev: SceneState) => Partial<SceneState>),
    ) => {
      setState((prev) => {
        const newState = typeof update === "function" ? update(prev) : update;
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
  
  useEffect(() => {
    if (!xr.session || !logicRef.current || !arModeRequested) return;
 
    const homeModel = logicRef.current.sceneManager?.getHomeModel();
    if (homeModel && !homeModel.getIsTransparent()) {
      homeModel.setTransparent(true);
      logicRef.current.updateState({ homeTransparent: true });
    }
  }, [xr.session, arModeRequested, state.loading]);

 
  useEffect(() => {
    if (!logicRef.current) return;
    logicRef.current.loadHome(digitalHome);
  }, [homeId, digitalHome]);

  useEffect(() => {
    if (!logicRef.current) return;
    logicRef.current.loadFurnitureCatalog();
  }, []);

  useEffect(() => {
    if (!logicRef.current || logicRef.current.modelUrlCache.size === 0) return;
    logicRef.current.loadDeployedItems();
  }, [logicRef.current?.modelUrlCache.size]);

  useFrame((state, delta) => {
    if (!logicRef.current) return;
    logicRef.current.renderer = state.gl;

    logicRef.current.sceneManager?.updateAnimations(delta);

    const session = xr.session;
    if (!session) return;
    logicRef.current.updateFrame(session, camera, delta);
  });

  if (!logicRef.current) return null;

  const logic = logicRef.current;
  const isAligned = state.alignmentStatus === "aligned";
  const uiLocked = state.showFurniture || 
    state.showControlPanel || 
    state.showInstructions || 
    state.showSlider || 
    state.showNotification ||
    state.showMoveCloserPanel ||
    state.showScalePanel ||
    state.showPreciseCheckPanel ||
    state.showAlignmentPanel ||
    state.showAlignmentConfirm;

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
          
          {logic.sceneManager.getAllFurniture().map((furniture) => {
            const meta = furniture.getMetadata?.();
            const isWhiteboard = meta?.type === "Whiteboard";
            const boardMesh =
              isWhiteboard ? (furniture as WhiteboardWidget).getBoardMesh?.() ?? null : null;

            const handleFurnitureClick = (e: any) => {
              let target = e.object;
              let isGizmoClick = false;
              let depth = 0;

              while (target && depth < 10) {
                if (target.userData?.isGizmo) {
                  isGizmoClick = true;
                  break;
                }
                target = target.parent;
                depth++;
              }

              if (isGizmoClick) {
                e.stopPropagation();
                return;
              }

              if (state.alignmentStatus === "aligned" && !state.navigationMode && !uiLocked) {
                if (state.experienceMode) {
                  if (isWhiteboard) {
                    e.stopPropagation();
                    logic.handleSelectWhiteboardInExperience(furniture.getId());
                  }
                } else {
                  e.stopPropagation();
                  logic.handleSelectItem(furniture.getId());
                }
              }
            };

            return (
              <React.Fragment key={furniture.getId()}>
                <primitive
                  object={furniture.getGroup()}
                  onClick={handleFurnitureClick}
                  onPointerDown={handleFurnitureClick}
                />
                {isWhiteboard && state.experienceMode && boardMesh && (
                  <WhiteboardHitTarget
                    boardMesh={boardMesh}
                    isSelected={state.experienceWhiteboardId === furniture.getId()}
                    onSelect={() => logic.handleSelectWhiteboardInExperience(furniture.getId())}
                    onPointerMove={(point) =>
                      logic.recordWhiteboardPointerHit(furniture.getId(), point)
                    }
                    onPointerLeave={() => logic.clearWhiteboardPointerHit()}
                  />
                )}
              </React.Fragment>
            );
          })}

            {state.showTransformGizmo && state.gizmoPosition && (
              <TransformGizmo
                position={state.gizmoPosition}
                visible={state.showTransformGizmo}
                onMove={(axis, delta) => logic.handleGizmoMove(axis, delta)}
              />
            )}

       
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
      
      {state.alignmentStatus === "aligned" && (
        <>
          {!state.experienceMode && (
            <CatalogToggle onToggle={() => logic.handleToggleUI()} />
          )}
          <ControlPanelToggle onToggle={() => logic.handleToggleControlPanel()} />
        </>
      )}

      <HeadLockedUI distance={1.6} verticalOffset={0} enabled={state.showAlignmentPanel}>
        <VRAlignmentPanel 
          show={state.showAlignmentPanel} 
          onSelectMode={(mode) => logic.handleAlignmentModeSelect(mode)} 
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.6} verticalOffset={0} enabled={state.showAlignmentConfirm}>
        <VRAlignmentConfirmPanel 
          show={state.showAlignmentConfirm} 
          onConfirm={() => logic.handleAlignmentConfirm()} 
          onCancel={() => logic.handleAlignmentCancel()} 
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.6} verticalOffset={0} enabled={state.showInstructions}>
        <VRInstructionPanel 
          show={state.showInstructions} 
          onClose={() => logic.updateState({ showInstructions: false })} 
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.7}
        verticalOffset={0}
        enabled={state.showFurniture && !state.experienceMode}
      >
        <VRFurniturePanel
          show={state.showFurniture && !state.experienceMode}
          catalog={state.furnitureCatalog}
          loading={state.catalogLoading}
          onSelectItem={(f) => logic.handleSelectFurniture(f, camera)}
          placedFurnitureIds={logic.getPlacedCatalogIds()}
          onClose={() => logic.updateState({ showFurniture: false })}
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.7}
        verticalOffset={0}
        enabled={state.showControlPanel}
      >
        <VRControlPanel
          show={state.showControlPanel}
          onSave={() => logic.handleSaveScene()}
          onHelp={() => logic.handleHelp()}
          onBack={() => logic.handleBackToHome(xrStore)}
          onLogout={() => logic.handleLogout()}
          saving={state.saving}
          onClose={() => logic.updateState({ showControlPanel: false })}
          alignmentMode={state.alignmentMode}
          onToggleAlignment={() => logic.handleToggleAlignmentMode()}
          homeTransparent={state.homeTransparent}
          onToggleTransparency={() => logic.handleToggleHomeTransparency()}
          experienceMode={state.experienceMode}
          onToggleExperienceMode={() => logic.handleToggleExperienceMode()}
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.4}
        verticalOffset={0}
        enabled={state.showNotification}
      >
        <VRNotificationPanel
          show={state.showNotification}
          message={state.notificationMessage}
          type={state.notificationType}
          onClose={() =>
            logic.updateState({
              showNotification: false,
              notificationFromControlPanel: false,
            })
          }
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.5}
        verticalOffset={0}
        enabled={state.showMoveCloserPanel}
      >
        <VRPreciseCollisionPanel
          show={state.showMoveCloserPanel}
          onConfirm={() => logic.handleConfirmMoveCloser()}
          onCancel={() => logic.handleCancelMoveCloser()}
          isChecking={false}
          title="Move Furniture Closer?"
          message="The furniture is close to another object. Do you want to move it closer?"
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.5}
        verticalOffset={0}
        enabled={state.showPreciseCheckPanel}
      >
        <VRPreciseCollisionPanel
          show={state.showPreciseCheckPanel}
          onConfirm={() => logic.handleConfirmPreciseCheck()}
          onCancel={() => logic.handleCancelPreciseCheck()}
          isChecking={state.preciseCheckInProgress}
          title="Use precise collision detection?"
          message="Run precise API check to verify overlap? (Click No to move back to safe position)"
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.6}
        verticalOffset={0}
        enabled={state.showScalePanel}
      >
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
      <HeadLockedUI
        distance={1.5}
        verticalOffset={0}
        enabled={!!state.experienceWhiteboardId}
      >
        <group position={[0.4, 0, 0]}>
          <VRWhiteboardPanel
            show={!!state.experienceWhiteboardId}
            currentTool={state.whiteboardTool}
            onSelectTool={(tool) => logic.handleSetWhiteboardTool(tool)}
            onExit={() => logic.handleExitWhiteboardDrawing()}
            onClear={() => logic.handleWhiteboardClear()}
          />
        </group>
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.4}
        verticalOffset={0}
        enabled={state.showSidebar && !state.experienceMode}
      >
        <group position={[-0.8, 0, 0]}>
          <VRSidebar
            show={state.showSidebar && !state.experienceMode}
            onItemSelect={(itemId) => logic.handleSidebarItemSelect(itemId)}
          />
        </group>
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.3}
        verticalOffset={0}
        enabled={state.showTexturePanel}
      >
        <group position={[1, 0, 0]}>
          <TextureSelectorPanel
            show={state.showTexturePanel}
            onSelectTexture={(id, path) => logic.handleSelectTexture(id, path)}
            onClose={() => logic.handleCloseTexturePanel()}
            textures={state.textureOptions}
            selectedTextureId={state.selectedFurnitureTextureId}
            title={state.selectedItemId ? "Change Texture" : "Textures"}
          />
        </group>
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.3}
        verticalOffset={0}
        enabled={state.showEnvironmentPanel}
      >
        `{" "}
        <group position={[0, 0, 0]}>
          <EnvironmentSelectorPanel
            show={state.showEnvironmentPanel}
            onSelectFloor={(id, path) =>
              logic.handleSelectFloorTexture(id, path)
            }
            onSelectWall={(id, path) => logic.handleSelectWallTexture(id, path)}
            onClose={() => logic.updateState({ showEnvironmentPanel: false })}
            floorTextures={state.floorTextures}
            wallTextures={state.wallTextures}
            selectedFloorId={state.selectedFloorId}
            selectedWallId={state.selectedWallId}
            loadingFloor={state.loadingEnvironment}
            loadingWall={state.loadingEnvironment}
            title="Environment Settings"
          />
        </group>
      </HeadLockedUI>
      `
    </>
  );
} 


*/

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
import { VRWhiteboardPanel } from "../panel/VRWhiteboardPanel";
import { SceneManager } from "../../core/managers/SceneManager";
import {
  FurnitureItem,
  FurnitureMetadata,
} from "../../core/objects/FurnitureItem";
import { ClockWidget } from "../../core/objects/ClockWidget";
import { WhiteboardWidget, type WhiteboardTool } from "../../core/objects/WhiteboardWidget";
import { HomeModel } from "../../core/objects/HomeModel";
import {
  NavigationController,
  FurnitureEditController,
} from "../../core/controllers/XRControllerBase";
import { makeAuthenticatedRequest, logout } from "../../utils/Auth";
import { VRSidebar } from "../panel/VRSidebar";
import { VRAlignmentPanel, VRAlignmentConfirmPanel } from "../panel/VRAlignmentPanel";
import { TransformGizmo } from "../panel/TransformGizmo";
import { RotationGizmo } from "../panel/RotationGizmo";
import {
  TextureSelectorPanel,
  TextureOption,
} from "../panel/texture/TextureSelectorPanel";
import {
  EnvironmentSelectorPanel,
  EnvironmentOption,
} from "../panel/texture/EnvironmentSelectorPanel";

const DIGITAL_HOME_PLATFORM_BASE_URL = import.meta.env
  .VITE_DIGITAL_HOME_PLATFORM_URL;

function WhiteboardHitTarget({
  boardMesh,
  isSelected,
  onSelect,
  onPointerMove,
  onPointerLeave,
}: {
  boardMesh: THREE.Mesh;
  isSelected: boolean;
  onSelect: () => void;
  onPointerMove: (point: THREE.Vector3) => void;
  onPointerLeave: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current || !boardMesh) return;
    groupRef.current.position.setFromMatrixPosition(boardMesh.matrixWorld);
    groupRef.current.quaternion.setFromRotationMatrix(boardMesh.matrixWorld);
    groupRef.current.scale.setFromMatrixScale(boardMesh.matrixWorld);
  });
  return (
    <group ref={groupRef}>
      <mesh
        onPointerDown={(e: any) => {
          e.stopPropagation();
          onSelect();
        }}
        onClick={(e: any) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerMove={(e: any) => {
          e.stopPropagation();
          if (isSelected) onPointerMove(e.point.clone());
        }}
        onPointerLeave={() => onPointerLeave()}
      >
        <planeGeometry args={[1.0, 0.6]} />
        <meshBasicMaterial
          visible={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

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
  arModeRequested?: boolean;
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
  showSidebar: boolean;
  sidebarActiveItem: string | null;
  showTransformGizmo: boolean;
  gizmoPosition: [number, number, number] | null;
  showRotationGizmo: boolean;
  rotationGizmoPosition: [number, number, number] | null;
  showScalePanel: boolean;
  selectedItemPlacementMode: 'floor' | 'wall';
  alignmentStatus: 'pending' | 'aligning' | 'aligned';
  alignmentMode: 'world' | 'free' | null;
  showAlignmentPanel: boolean;
  showAlignmentConfirm: boolean;
  homeTransparent: boolean;
  showTexturePanel: boolean;
  textureOptions: TextureOption[];
  selectedFurnitureTextureId: string | undefined;
  showEnvironmentPanel: boolean;
  floorTextures: EnvironmentOption[];
  wallTextures: EnvironmentOption[];
  selectedFloorId: string | undefined;
  selectedWallId: string | undefined;
  loadingEnvironment: boolean;
  experienceMode: boolean;
  experienceWhiteboardId: string | null;
  whiteboardTool: WhiteboardTool;
  // --- OVERLAY LAYER STATE ---
  overlayReady: boolean;
  overlayFloorId: string | undefined;
  overlayWallId: string | undefined;
  // in SceneState interface
  showOriginalModel: boolean;

}

class SceneContentLogic {
  private state: SceneState;
  private setState: (
    updater: Partial<SceneState> | ((prev: SceneState) => Partial<SceneState>),
  ) => void;
  private homeId: string;
  private navigate: (path: string) => void;

  public sceneManager: SceneManager | null = null;
  public navigationController: NavigationController | null = null;
  public furnitureController: FurnitureEditController | null = null;
  public renderer: THREE.WebGLRenderer | null = null;
  private lastFrameWhiteboardDrawing = false;
  public lastWhiteboardPointerPoint: THREE.Vector3 | null = null;
  public lastWhiteboardPointerId: string | null = null;

  public pendingMove: [number, number, number] | null = null;
  public currentAABBPosition: [number, number, number] | null = null;
  public modelUrlCache: Map<number, string> = new Map();

  private textureCache: Map<string, TextureOption[]> = new Map();
  private textureLoadingCache: Map<string, Promise<void>> = new Map();

  // --- OVERLAY LAYER PROPERTIES ---
  // The cloned room that sits on top of the original.
  // Every wall/floor/ceiling mesh inside this clone has its own
  // transparent MeshBasicMaterial so we can change textures
  // independently without touching the original model.
  public overlayGroup: THREE.Group | null = null;
  // Maps original mesh uuid → overlay mesh so we can target
  // specific walls / floors when the user picks a texture.
  private overlayMeshMap: Map<string, THREE.Mesh> = new Map();

  constructor(
    homeId: string,
    navigate: (path: string) => void,
    setState: (
      updater:
        | Partial<SceneState>
        | ((prev: SceneState) => Partial<SceneState>),
    ) => void,
  ) {
    this.homeId = homeId;
    this.navigate = navigate;
    this.setState = setState;

    this.state = {
      showSlider: false,
      showFurniture: false,
      showInstructions: false,
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
      showSidebar: true,
      sidebarActiveItem: null,
      showTransformGizmo: false,
      gizmoPosition: null,
      showRotationGizmo: false,
      rotationGizmoPosition: null,
      showScalePanel: false,
      selectedItemPlacementMode: 'floor',
      alignmentStatus: 'pending',
      alignmentMode: null,
      showAlignmentPanel: true,
      showAlignmentConfirm: false,
      homeTransparent: false,
      showTexturePanel: false,
      textureOptions: [],
      selectedFurnitureTextureId: undefined,
      showEnvironmentPanel: false,
      floorTextures: [],
      wallTextures: [],
      selectedFloorId: undefined,
      selectedWallId: undefined,
      loadingEnvironment: false,
      experienceMode: false,
      experienceWhiteboardId: null,
      whiteboardTool: "pen",
      // overlay defaults
      overlayReady: false,
      overlayFloorId: undefined,
      overlayWallId: undefined,
      // in constructor initial state
      showOriginalModel: true,
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
      },
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
        onWallFurnitureMove: async (id, deltaVertical, deltaHorizontal) => {
          await this.handleWallFurnitureMove(id, deltaVertical, deltaHorizontal);
        },
        isWallMounted: (id) => {
          return this.sceneManager?.isWallMounted(id) || false;
        },
        onUnmountFromWall: (id) => {
          this.sceneManager?.unmountFromWallAndFloat(id);
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
    this.modelUrlCache.forEach((url) => URL.revokeObjectURL(url));

    this.textureCache.clear();
    this.textureLoadingCache.clear();

    this.state.floorTextures.forEach((tex) => {
      if (tex.imagePath) URL.revokeObjectURL(tex.imagePath);
    });
    this.state.wallTextures.forEach((tex) => {
      if (tex.imagePath) URL.revokeObjectURL(tex.imagePath);
    });

    // Dispose overlay meshes
    this.disposeOverlay();
  }

  // ─────────────────────────────────────────────────────────────────
  // OVERLAY LAYER — core helpers
  // ─────────────────────────────────────────────────────────────────

  /**
   * Called automatically right after the home model finishes loading.
   * Clones the entire home model group, replaces every mesh material
   * with a transparent MeshBasicMaterial, and adds the clone to the
   * same scene as the original.
   *
   * The clone sits at the exact same world position as the original.
   * polygonOffset pushes it slightly in front so there is no z-fighting.
   */
  createOverlayLayer(scene: THREE.Scene): void {
  const homeModel = this.sceneManager?.getHomeModel();
  if (!homeModel) return;

  this.disposeOverlay(scene);

  const originalGroup = homeModel.getGroup();
  const clone = originalGroup.clone(true);
  clone.name = "HomeModelOverlay";
  this.overlayMeshMap.clear();

  clone.traverse((child) => {
  if (!(child instanceof THREE.Mesh)) return;

  let originalMesh: THREE.Mesh | null = null;
  originalGroup.traverse((orig) => {
    if (orig instanceof THREE.Mesh && orig.name === child.name) {
      originalMesh = orig as THREE.Mesh; // ✅ explicit cast
    }
  });

  if (originalMesh) {
    const orig = originalMesh as THREE.Mesh; // ✅ assign to typed variable
    child.material = Array.isArray(orig.material)
      ? orig.material.map((m) => m.clone())
      : orig.material.clone();

    this.overlayMeshMap.set(orig.uuid, child);
  }
});

  clone.position.copy(originalGroup.position);
  clone.rotation.copy(originalGroup.rotation);
  clone.scale.copy(originalGroup.scale);

  scene.add(clone);
  this.overlayGroup = clone;

  // ✅ DON'T hide original here — let toggle control it
  // Start with overlay hidden, original visible
  clone.visible = false;

  this.updateState({ overlayReady: true, showOriginalModel: true });
}



handleToggleOriginalModel(): void {
  const homeModel = this.sceneManager?.getHomeModel();
  if (!homeModel || !this.overlayGroup) return;

  const newShowOriginal = !this.state.showOriginalModel;

  // Show original → hide overlay
  // Hide original → show overlay
  homeModel.getGroup().visible = newShowOriginal;
  this.overlayGroup.visible = !newShowOriginal;

  this.updateState({ showOriginalModel: newShowOriginal });
  this.showNotificationMessage(
    newShowOriginal ? "Showing original model" : "Showing overlay (texture mode)",
    "info"
  );
}
private disposeOverlay(scene?: THREE.Scene): void {
  if (!this.overlayGroup) return;

  // Always restore original visibility when overlay is disposed
  const homeModel = this.sceneManager?.getHomeModel();
  if (homeModel) homeModel.getGroup().visible = true;

  this.overlayGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else child.material.dispose();
    }
  });

  if (scene) scene.remove(this.overlayGroup);

  this.overlayGroup = null;
  this.overlayMeshMap.clear();
}

  /**
   * Returns all overlay meshes whose name contains the given keyword
   * (case-insensitive). Used by floor / wall texture helpers.
   */
  private getOverlayMeshesByName(keyword: string): THREE.Mesh[] {
    const results: THREE.Mesh[] = [];
    if (!this.overlayGroup) return results;

    this.overlayGroup.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.name.toLowerCase().includes(keyword.toLowerCase())
      ) {
        results.push(child);
      }
    });
    return results;
  }

  /**
   * Low-level helper: apply a texture to a set of overlay meshes and
   * make them visible. Pass opacity < 1 for a "preview" effect.
   */
  private applyTextureToOverlayMeshes(
  meshes: THREE.Mesh[],
  texture: THREE.Texture,
  opacity = 1.0,
): void {
  meshes.forEach((mesh) => {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.map = texture;
    mat.transparent = opacity < 1.0;  // ← keep consistent
    mat.opacity = opacity;
    mat.depthWrite = false;            // ← ensure it stays non-blocking
    mat.needsUpdate = true;
  });
}

  /**
   * Low-level helper: make overlay meshes invisible again (restore
   * original room appearance).
   */
  private clearOverlayMeshes(meshes: THREE.Mesh[]): void {
    meshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.map = null;
      mat.opacity = 0.0;
      mat.needsUpdate = true;
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // OVERLAY LAYER — public texture handlers
  // ─────────────────────────────────────────────────────────────────

  /**
   * Apply a texture to the OVERLAY floor layer.
   * The original model is NOT touched.
   * Call again with a different textureId to swap the texture.
   * Call clearOverlayFloorTexture() to revert to the original look.
   */
  async handleSelectOverlayFloorTexture(
    textureId: string,
    texturePath: string,
  ): Promise<void> {
    if (!this.overlayGroup) {
      this.showNotificationMessage("Overlay layer not ready", "error");
      return;
    }

    const meshes = this.getOverlayMeshesByName("floor");
    if (meshes.length === 0) {
      this.showNotificationMessage(
        "No floor meshes found in overlay layer",
        "error",
      );
      return;
    }

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      texturePath,
      (loadedTexture) => {
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.RepeatWrapping;
        loadedTexture.repeat.set(20, 20);
        loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.anisotropy = 16;
        loadedTexture.needsUpdate = true;

        this.applyTextureToOverlayMeshes(meshes, loadedTexture, 1.0);
        this.updateState({ overlayFloorId: textureId });
        this.showNotificationMessage(
          `Overlay floor texture applied! (${meshes.length} meshes)`,
          "success",
        );
      },
      undefined,
      (error) => {
        console.error("[OVERLAY-FLOOR] Failed to load texture:", error);
        this.showNotificationMessage(
          "Failed to load overlay floor texture",
          "error",
        );
      },
    );
  }

  /**
   * Apply a texture to the OVERLAY wall layer.
   * The original model is NOT touched.
   */
  async handleSelectOverlayWallTexture(
    textureId: string,
    texturePath: string,
  ): Promise<void> {
    if (!this.overlayGroup) {
      this.showNotificationMessage("Overlay layer not ready", "error");
      return;
    }

    const meshes = this.getOverlayMeshesByName("wall");
    if (meshes.length === 0) {
      this.showNotificationMessage(
        "No wall meshes found in overlay layer",
        "error",
      );
      return;
    }

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      texturePath,
      (loadedTexture) => {
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.RepeatWrapping;
        loadedTexture.repeat.set(20, 20);
        loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.anisotropy = 16;
        loadedTexture.needsUpdate = true;

        this.applyTextureToOverlayMeshes(meshes, loadedTexture, 1.0);
        this.updateState({ overlayWallId: textureId });
        this.showNotificationMessage(
          `Overlay wall texture applied! (${meshes.length} meshes)`,
          "success",
        );
      },
      undefined,
      (error) => {
        console.error("[OVERLAY-WALL] Failed to load texture:", error);
        this.showNotificationMessage(
          "Failed to load overlay wall texture",
          "error",
        );
      },
    );
  }

  /** Revert overlay floor to invisible (show original). */
  clearOverlayFloorTexture(): void {
    const meshes = this.getOverlayMeshesByName("floor");
    this.clearOverlayMeshes(meshes);
    this.updateState({ overlayFloorId: undefined });
  }

  /** Revert overlay wall to invisible (show original). */
  clearOverlayWallTexture(): void {
    const meshes = this.getOverlayMeshesByName("wall");
    this.clearOverlayMeshes(meshes);
    this.updateState({ overlayWallId: undefined });
  }

  /** Revert entire overlay (all surfaces) to invisible. */
  clearAllOverlayTextures(): void {
    if (!this.overlayGroup) return;
    const allMeshes: THREE.Mesh[] = [];
    this.overlayGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) allMeshes.push(child);
    });
    this.clearOverlayMeshes(allMeshes);
    this.updateState({ overlayFloorId: undefined, overlayWallId: undefined });
  }

  // ─────────────────────────────────────────────────────────────────
  // All original methods below — unchanged
  // ─────────────────────────────────────────────────────────────────

  async loadHome(digitalHome?: any): Promise<void> {
    if (!this.sceneManager) return;

    try {
      const response = await makeAuthenticatedRequest(
        `/digitalhomes/download_digital_home/${this.homeId}/`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const homeModel = new HomeModel(
          this.homeId,
          "Digital Home",
          parseInt(this.homeId),
          url,
          digitalHome?.spatialData?.boundary,
        );

        await this.sceneManager.setHomeModel(homeModel);
        this.debugHomeModelStructure();

        // ── NEW: build overlay immediately after model is loaded ──
        // We need the scene reference. SceneManager should expose it,
        // or we store it during initializeManagers. Here we grab it
        // from the homeModel's group parent as a fallback.
        const scene = homeModel.getGroup().parent as THREE.Scene | null;
        if (scene) {
          this.createOverlayLayer(scene);
        } else {
          // If the group hasn't been added to the scene yet, the parent
          // will be null. In that case the React JSX will render
          // <primitive object={overlayGroup} /> once overlayGroup is set,
          // so we still call createOverlayLayer but pass the sceneManager's
          // internal scene if available.
          // Most SceneManager implementations expose getScene():
          const mgr = this.sceneManager as any;
          if (mgr.scene) {
            this.createOverlayLayer(mgr.scene as THREE.Scene);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load home:", error);
    }
  }

  async loadFurnitureCatalog(): Promise<void> {
    this.updateState({ catalogLoading: true });
    try {
      const response = await makeAuthenticatedRequest(
        "/digitalhomes/list_available_items/",
      );

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
          wall_mountable: item.wall_mountable || false,
        }));

        this.updateState({ furnitureCatalog: items });

        for (const item of items) {
          await this.loadFurnitureModel(item.model_id);
        }
      }
    } catch (error) {
      console.error("Error loading furniture catalog:", error);
    } finally {
      this.updateState({ catalogLoading: false });
    }
  }

  private async loadFurnitureModel(modelId: number): Promise<void> {
    if (this.modelUrlCache.has(modelId)) return;

    try {
      const response = await makeAuthenticatedRequest(
        `/products/get_3d_model/${modelId}/`,
      );
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
        `/digitalhomes/get_deployed_items_details/${this.homeId}/`,
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
            },
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
      console.error("Error loading deployed items:", error);
    } finally {
      this.updateState({ loading: false });
    }
  }

  async loadTexturesForFurniture(furnitureId: string): Promise<void> {
    if (!this.sceneManager) return;

    const furniture = this.sceneManager.getFurniture(furnitureId);
    if (!furniture) return;

    const modelId = furniture.getModelId();
    const cacheKey = `model-${modelId}`;

    if (this.textureCache.has(cacheKey)) {
      return Promise.resolve().then(() => {
        this.updateState({
          textureOptions: this.textureCache.get(cacheKey) || [],
          selectedFurnitureTextureId: undefined,
        });
      });
    }

    if (this.textureLoadingCache.has(cacheKey)) {
      return this.textureLoadingCache.get(cacheKey)!;
    }

    const loadingPromise = this._fetchTexturesFromAPI(modelId, cacheKey);
    this.textureLoadingCache.set(cacheKey, loadingPromise);

    try {
      await loadingPromise;
    } finally {
      this.textureLoadingCache.delete(cacheKey);
    }
  }

  private async _fetchTexturesFromAPI(
    model_id: number,
    cacheKey: string,
  ): Promise<void> {
    if (!this.sceneManager) return;

    try {
      const response = await makeAuthenticatedRequest(
        `/products/get_texture/${model_id}/`,
      );

      if (!response.ok) {
        console.warn(`[TEXTURES] ⚠️ API failed (${response.status})`);
        this.updateState({
          textureOptions: [],
          selectedFurnitureTextureId: undefined,
        });
        return;
      }

      const data = await response.json();

      const textures: TextureOption[] = [];
      const textureLoaders: Promise<void>[] = [];

      for (let index = 0; index < data.textures.length; index++) {
        const texture = data.textures[index];

        const loadPromise = (async () => {
          try {
            const base64String = texture.file;

            const binaryString = atob(base64String);

            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: "image/jpeg" });

            const blobUrl = URL.createObjectURL(blob);

            const textureLoader = new THREE.TextureLoader();
            const three3DTexture = await new Promise<THREE.Texture>(
              (resolve, reject) => {
                textureLoader.load(
                  blobUrl,
                  (loadedTexture) => {
                    loadedTexture.wrapS = THREE.RepeatWrapping;
                    loadedTexture.wrapT = THREE.RepeatWrapping;
                    loadedTexture.magFilter = THREE.LinearFilter;
                    loadedTexture.minFilter = THREE.LinearFilter;
                    loadedTexture.needsUpdate = true;

                    resolve(loadedTexture);
                  },
                  undefined,
                  (error) => {
                    console.error(
                      `[TEXTURES] ❌ Failed to load THREE.Texture ${texture.texture_id}:`,
                      error,
                    );
                    reject(error);
                  },
                );
              },
            );

            textures.push({
              id: `texture-${texture.texture_id}`,
              name: `Texture ${index + 1}`,
              imagePath: blobUrl,
              color: "#ffffff",

              threeTexture: three3DTexture,
            });
          } catch (error) {
            console.error(
              `[TEXTURES] ❌ Failed to process texture ${texture.texture_id}:`,
              error,
            );
          }
        })();

        textureLoaders.push(loadPromise);
      }

      await Promise.all(textureLoaders);

      this.textureCache.set(cacheKey, textures);

      this.updateState({
        textureOptions: textures,
        selectedFurnitureTextureId: undefined,
      });
    } catch (error) {
      console.error("[TEXTURES] ❌ Error:", error);
      this.showNotificationMessage("Failed to load textures", "error");
      this.updateState({
        textureOptions: [],
        selectedFurnitureTextureId: undefined,
      });
    }
  }

  handleShowTextures(): void {
    if (!this.state.selectedItemId) {
      this.showNotificationMessage(
        "Please select a furniture item first",
        "info",
      );
      return;
    }

    this.loadTexturesForFurniture(this.state.selectedItemId).then(() => {
      const hasTextures =
        this.state.textureOptions && this.state.textureOptions.length > 0;
      if (!hasTextures) {
        this.showNotificationMessage(
          "No textures available for this item",
          "info",
        );
        return;
      }
      this.updateState({ showTexturePanel: true });
    });
  }

  async handleSelectTexture(
    textureId: string,
    texturePath: string,
  ): Promise<void> {
    if (!this.state.selectedItemId || !this.sceneManager) return;

    try {
      const furniture = this.sceneManager.getFurniture(
        this.state.selectedItemId,
      );
      if (!furniture) return;

      const textureLoader = new THREE.TextureLoader();
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(texturePath, resolve, undefined, reject);
      });

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      texture.repeat.set(20, 20);

      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 16;

      texture.needsUpdate = true;

      const group = furniture.getGroup();
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material.clone();
          material.map = texture;
          material.needsUpdate = true;
          child.material = material;
        }
      });

      this.updateState({
        selectedFurnitureTextureId: textureId,
      });
    } catch (error) {
      console.error("[TEXTURE] Failed to apply texture:", error);
      this.showNotificationMessage("Failed to load texture", "error");
    }
  }

  handleCloseTexturePanel(): void {
    this.updateState({ showTexturePanel: false });
  }

  async loadEnvironmentTextures(): Promise<void> {
    this.updateState({ loadingEnvironment: true });
    try {
      const floorResponse = await makeAuthenticatedRequest(
        `/digitalhomes/get_textures/${this.homeId}`,
      );

      if (floorResponse.ok) {
        const floorData = await floorResponse.json();
        const floorTextures = await this.processEnvironmentTextures(
          floorData.textures,
          "floor",
        );
        this.updateState({ floorTextures });
      }

      const wallResponse = await makeAuthenticatedRequest(
        `/digitalhomes/get_textures/${this.homeId}`,
      );

      if (wallResponse.ok) {
        const wallData = await wallResponse.json();
        const wallTextures = await this.processEnvironmentTextures(
          wallData.textures,
          "wall",
        );
        this.updateState({ wallTextures });
      }
    } catch (error) {
      console.error("Error loading environment textures:", error);
      this.showNotificationMessage(
        "Failed to load environment textures",
        "error",
      );
    } finally {
      this.updateState({ loadingEnvironment: false });
    }
  }

  private async processEnvironmentTextures(
    textures: any[],
    type: "floor" | "wall",
  ): Promise<EnvironmentOption[]> {
    const processedTextures: EnvironmentOption[] = [];
    const textureLoaders: Promise<void>[] = [];

    for (let index = 0; index < textures.length; index++) {
      const texture = textures[index];

      const loadPromise = (async () => {
        try {
          const base64String = texture.file;

          const binaryString = atob(base64String);

          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const blob = new Blob([bytes], { type: "image/jpeg" });

          const blobUrl = URL.createObjectURL(blob);

          const textureLoader = new THREE.TextureLoader();
          const three3DTexture = await new Promise<THREE.Texture>(
            (resolve, reject) => {
              textureLoader.load(
                blobUrl,
                (loadedTexture) => {
                  loadedTexture.wrapS = THREE.RepeatWrapping;
                  loadedTexture.wrapT = THREE.RepeatWrapping;
                  loadedTexture.magFilter = THREE.LinearFilter;
                  loadedTexture.minFilter = THREE.LinearFilter;
                  loadedTexture.needsUpdate = true;
                  resolve(loadedTexture);
                },
                undefined,
                reject,
              );
            },
          );

          processedTextures.push({
            id: `${type}-texture-${texture.texture_id}`,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`,
            type: type,
            imagePath: blobUrl,
            color: "#ffffff",
            threeTexture: three3DTexture,
          });
        } catch (error) {
          console.error(
            `[ENV-TEXTURES] Failed to process ${type} texture ${texture.texture_id}:`,
            error,
          );
        }
      })();

      textureLoaders.push(loadPromise);
    }

    await Promise.all(textureLoaders);

    return processedTextures;
  }
/*
  async handleSelectFloorTexture(
    textureId: string,
    texturePath: string,
  ): Promise<void> {
    if (!this.sceneManager) return;

    try {
      const homeModel = this.sceneManager.getHomeModel();
      if (!homeModel) {
        this.showNotificationMessage("Home model not loaded", "error");
        return;
      }

      const textureLoader = new THREE.TextureLoader();

      textureLoader.load(
        texturePath,
        (loadedTexture) => {
          loadedTexture.wrapS = THREE.RepeatWrapping;
          loadedTexture.wrapT = THREE.RepeatWrapping;
          loadedTexture.repeat.set(20, 20);
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.anisotropy = 16;
          loadedTexture.needsUpdate = true;

          let floorCount = 0;
          homeModel.getGroup().traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              if (child.name === "Floor" || child.name.includes("Floor")) {
                const material = Array.isArray(child.material)
                  ? child.material.map((m) => m.clone())
                  : child.material.clone();

                if (Array.isArray(material)) {
                  material.forEach((m) => {
                    m.map = loadedTexture;
                    m.needsUpdate = true;
                  });
                } else {
                  material.map = loadedTexture;
                  material.needsUpdate = true;
                }

                child.material = material;
                floorCount++;
              }
            }
          });

          if (floorCount === 0) {
            console.warn("[FLOOR-TEXTURE] No floor meshes found!");
            this.showNotificationMessage(
              "No floor meshes found in model",
              "error",
            );
          } else {
            this.updateState({ selectedFloorId: textureId });
            this.showNotificationMessage(
              `Floor texture updated! (${floorCount} meshes)`,
              "success",
            );
          }
        },
        undefined,
        (error) => {
          console.error("[FLOOR-TEXTURE] Failed to load texture:", error);
          this.showNotificationMessage("Failed to load floor texture", "error");
        },
      );
    } catch (error) {
      console.error("[FLOOR-TEXTURE] Error:", error);
      this.showNotificationMessage("Failed to apply floor texture", "error");
    }
  }

  async handleSelectWallTexture(
    textureId: string,
    texturePath: string,
  ): Promise<void> {
    if (!this.sceneManager) return;

    try {
      const homeModel = this.sceneManager.getHomeModel();
      if (!homeModel) {
        this.showNotificationMessage("Home model not loaded", "error");
        return;
      }

      const textureLoader = new THREE.TextureLoader();

      textureLoader.load(
        texturePath,
        (loadedTexture) => {
          loadedTexture.wrapS = THREE.RepeatWrapping;
          loadedTexture.wrapT = THREE.RepeatWrapping;
          loadedTexture.repeat.set(20, 20);
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.anisotropy = 16;
          loadedTexture.needsUpdate = true;

          let wallCount = 0;
          homeModel.getGroup().traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              if (child.name === "Wall" || child.name.includes("Wall")) {
                const material = Array.isArray(child.material)
                  ? child.material.map((m) => m.clone())
                  : child.material.clone();

                if (Array.isArray(material)) {
                  material.forEach((m) => {
                    m.map = loadedTexture;
                    m.needsUpdate = true;
                  });
                } else {
                  material.map = loadedTexture;
                  material.needsUpdate = true;
                }

                child.material = material;
                wallCount++;
              }
            }
          });

          if (wallCount === 0) {
            console.warn("[WALL-TEXTURE] No wall meshes found!");
            this.showNotificationMessage(
              "No wall meshes found in model",
              "error",
            );
          } else {
            this.updateState({ selectedWallId: textureId });
            this.showNotificationMessage(
              `Wall texture updated! (${wallCount} meshes)`,
              "success",
            );
          }
        },
        undefined,
        (error) => {
          console.error("[WALL-TEXTURE] Failed to load texture:", error);
          this.showNotificationMessage("Failed to load wall texture", "error");
        },
      );
    } catch (error) {
      console.error("[WALL-TEXTURE] Error:", error);
      this.showNotificationMessage("Failed to apply wall texture", "error");
    }
  } */

    async handleSelectFloorTexture(
  textureId: string,
  texturePath: string,
): Promise<void> {
  await this.handleSelectOverlayFloorTexture(textureId, texturePath);
  this.updateState({ selectedFloorId: textureId });
}

async handleSelectWallTexture(
  textureId: string,
  texturePath: string,
): Promise<void> {
  await this.handleSelectOverlayWallTexture(textureId, texturePath);
  this.updateState({ selectedWallId: textureId });
}

  debugHomeModelStructure(): void {
    if (!this.sceneManager) return;

    const homeModel = this.sceneManager.getHomeModel();
    if (!homeModel) {
      console.warn("[DEBUG] No home model loaded");
      return;
    }

    const meshes: any[] = [];

    homeModel.getGroup().traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        meshes.push({
          name: child.name,
          type: child.userData?.type || "unknown",
          materialType: child.material.constructor.name,
          hasMaterial: !!child.material,
        });
      }
    });
  }

  showNotificationMessage(
    message: string,
    type: "success" | "error" | "info" = "info",
    fromControlPanel: boolean = false,
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
    const { showMoveCloserPanel, showPreciseCheckPanel, showControlPanel, showInstructions, showFurniture, selectedItemId, experienceMode } = this.state;

    if (showMoveCloserPanel || showPreciseCheckPanel || experienceMode) return;

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

  handleAlignmentModeSelect(mode: "world" | "free"): void {
    if (mode === "world") {
      if (this.state.homeTransparent) {
        this.sceneManager?.getHomeModel()?.setOpacity(0.3);
      }
      this.updateState({
        alignmentMode: "world",
        alignmentStatus: "aligning",
        showAlignmentPanel: false,
        showAlignmentConfirm: true,
      });
    } else {
      // Free roam mode - skip alignment
      if (this.state.homeTransparent) {
        this.sceneManager?.getHomeModel()?.setOpacity(0.0);
      }
      this.updateState({
        alignmentMode: "free",
        alignmentStatus: "aligned",
        showAlignmentPanel: false,
        showAlignmentConfirm: false,
        showInstructions: true,
        showSidebar: true,
      });
    }
  }

  handleAlignmentConfirm(): void {
    if (this.state.homeTransparent) {
      this.sceneManager?.getHomeModel()?.setOpacity(0.0);
    }
    this.updateState({
      alignmentStatus: "aligned",
      showAlignmentConfirm: false,
      showInstructions: true,
      showSidebar: true,
    });
  }

  handleAlignmentCancel(): void {
    if (this.state.homeTransparent) {
      this.sceneManager?.getHomeModel()?.setOpacity(0.0);
    }
    this.updateState({
      alignmentMode: null,
      alignmentStatus: "pending",
      showAlignmentConfirm: false,
      showAlignmentPanel: true,
    });
  }

  handleToggleAlignmentMode(): void {
    if (this.state.alignmentStatus === "aligned" && this.state.alignmentMode === "world") {
      if (this.state.homeTransparent) {
        this.sceneManager?.getHomeModel()?.setOpacity(0.0);
      }
      this.updateState({
        alignmentMode: "free",
      });
    } else if (this.state.alignmentStatus === "aligned" && this.state.alignmentMode === "free") {
      if (this.state.homeTransparent) {
        this.sceneManager?.getHomeModel()?.setOpacity(0.3);
      }
      this.updateState({
        alignmentMode: "world",
        alignmentStatus: "aligning",
        showAlignmentConfirm: true,
      });
    }
  }

  handleToggleHomeTransparency(): void {
    const homeModel = this.sceneManager?.getHomeModel();
    if (!homeModel) return;
 
    const newTransparent = !this.state.homeTransparent;
    homeModel.setTransparent(newTransparent);
    this.updateState({ homeTransparent: newTransparent });
  }

  handleToggleExperienceMode(): void {
    const newExperienceMode = !this.state.experienceMode;
    
    if (this.furnitureController) {
      this.furnitureController.setEnabled(!newExperienceMode);
    }

    if (newExperienceMode) {
      if (this.state.selectedItemId) {
        this.sceneManager?.deselectFurniture(this.state.selectedItemId);
        this.furnitureController?.setSelectedFurniture(null);
      }
      this.updateState({
        experienceMode: newExperienceMode,
        selectedItemId: null,
        showSlider: false,
        showTransformGizmo: false,
        gizmoPosition: null,
        showRotationGizmo: false,
        rotationGizmoPosition: null,
        showScalePanel: false,
        showTexturePanel: false,
        showFurniture: false,
        showSidebar: false,
        sidebarActiveItem: null,
      });
    } else {
      this.updateState({
        experienceMode: newExperienceMode,
        showSidebar: true,
      });
    }
  }

  handleToggleControlPanel(): void {
    const { showMoveCloserPanel, showPreciseCheckPanel, showControlPanel } =
      this.state;

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

  handleSidebarItemSelect(itemId: string): void {
    if (this.state.experienceMode) return;
    this.updateState({ sidebarActiveItem: itemId });

    switch (itemId) {
      case "movement":
        this.updateState({
          showInstructions: false,
          showFurniture: false,
          showControlPanel: false,
          showSlider: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showTexturePanel: false,
          showEnvironmentPanel: false,
        });

        if (this.state.selectedItemId) {
          const furniture = this.sceneManager?.getFurniture(
            this.state.selectedItemId,
          );
          if (furniture) {
            this.updateState({
              showTransformGizmo: true,
              gizmoPosition: furniture.getPosition(),
            });
          }
        }

        break;

      case "rotation":
        if (this.state.selectedItemId) {
          const furniture = this.sceneManager?.getFurniture(
            this.state.selectedItemId,
          );
          if (furniture) {
            this.updateState({
              showRotationGizmo: true,
              rotationGizmoPosition: furniture.getPosition(),
              showFurniture: false,
              showControlPanel: false,
              showTransformGizmo: false,
              showSlider: false,
              showScalePanel: false,
              showTexturePanel: false,
              showEnvironmentPanel: false,
            });
          }
        }
        break;

      case "scale":
        if (this.state.selectedItemId) {
          const furniture = this.sceneManager?.getFurniture(
            this.state.selectedItemId,
          );
          if (furniture) {
            this.updateState({
              showScalePanel: true,
              showTransformGizmo: false,
              showRotationGizmo: false,
              showFurniture: false,
              showControlPanel: false,
              showSlider: false,
              showTexturePanel: false,
              showEnvironmentPanel: false,
            });
          }
        }

        break;

      case "environment":
        if (
          this.state.floorTextures.length === 0 &&
          this.state.wallTextures.length === 0
        ) {
          this.loadEnvironmentTextures();
        }
        this.updateState({
          showEnvironmentPanel: true,
          showFurniture: false,
          showControlPanel: false,
          showTransformGizmo: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showTexturePanel: false,
          showInstructions: false,
          showSlider: false,
        });
        break;

      case "texture":
        this.updateState({
          sidebarActiveItem: "texture",
          showFurniture: false,
          showControlPanel: false,
          showTransformGizmo: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showEnvironmentPanel: false,
          showInstructions: false,
          showSlider: false,
          showTexturePanel: false,
        });

        if (this.state.selectedItemId) {
          this.loadTexturesForFurniture(this.state.selectedItemId).then(() => {
            const hasTextures =
              this.state.textureOptions && this.state.textureOptions.length > 0;
            if (!hasTextures) {
              this.showNotificationMessage(
                "No textures available for this item",
                "info",
              );
              return;
            }
            this.updateState({
              showTexturePanel: true,
            });
          });
        } else {
          this.showNotificationMessage(
            "Texture mode: Click on furniture to change texture",
            "info",
          );
        }

        break;

      case "settings":
        this.updateState({
          showControlPanel: true,
          showFurniture: false,
          showSlider: false,
          showInstructions: false,
          showTransformGizmo: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showTexturePanel: false,
          showEnvironmentPanel: false,
        });
        break;

      case "customize":
        this.updateState({
          showFurniture: true,
          showControlPanel: false,
          showSlider: false,
          showInstructions: false,
          showTransformGizmo: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showTexturePanel: false,
          showEnvironmentPanel: false,
        });
        break;
      case "toggleModel":
      this.handleToggleOriginalModel();
      break;
    }
   
  }

  async handleSaveScene(): Promise<void> {
    if (this.state.saving || !this.sceneManager) return;

    this.updateState({ saving: true });
    try {
      const sceneData = this.sceneManager.serializeScene();

      const formData = new FormData();
      formData.append("id", this.homeId);
      formData.append("deployedItems", JSON.stringify(sceneData.deployedItems));

      const response = await makeAuthenticatedRequest(
        "/digitalhomes/update_home_design/",
        {
          method: "POST",
          body: formData,
        },
      );

      if (response.ok) {
        this.showNotificationMessage(
          "Scene saved successfully!",
          "success",
          true,
        );
      } else {
        const error = await response.json();
        this.showNotificationMessage(
          `Failed to save scene: ${error.error}`,
          "error",
          true,
        );
      }
    } catch (error) {
      console.error("Error saving scene:", error);
      this.showNotificationMessage(
        "Error saving scene. Please try again.",
        "error",
        true,
      );
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

  private async handleFurnitureMove(
    id: string,
    delta: THREE.Vector3,
  ): Promise<void> {
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

    const result = await this.sceneManager.moveFurniture(
      id,
      newPos,
      isInAABBZone,
      false,
    );

    if (!result.success && result.needsConfirmation) {
      this.pendingMove = newPos;
      this.updateState({ showMoveCloserPanel: true });
    } else if (result.success && result.needsPreciseCheck) {
      this.currentAABBPosition = newPos;
      this.updateState({ showPreciseCheckPanel: true });
    } else if (!result.success && !result.needsConfirmation) {
      if (result.reason) {
        this.showNotificationMessage(`⚠️ ${result.reason}`, "error");
      }
      this.currentAABBPosition = null;
    } else if (result.success && !result.needsPreciseCheck) {
      this.currentAABBPosition = null;
    }
  }

  private async handleWallFurnitureMove(
    id: string,
    deltaVertical: number,
    deltaHorizontal: number,
  ): Promise<void> {
    if (!this.sceneManager) return;

    const furniture = this.sceneManager.getFurniture(id);
    if (!furniture || !furniture.isOnWall()) return;

    const result = await this.sceneManager.moveWallFurniture(
      id,
      deltaVertical,
      deltaHorizontal,
    );

    if (!result.success && result.needsConfirmation) {
      const newPos = furniture.moveAlongWall(deltaVertical, deltaHorizontal);
      this.pendingMove = newPos;
      this.updateState({ showMoveCloserPanel: true });
    } else if (result.success && result.needsPreciseCheck) {
      const newPos = furniture.getPosition();
      this.currentAABBPosition = newPos;
      this.updateState({ showPreciseCheckPanel: true });
    } else if (!result.success && !result.needsConfirmation) {
      if (result.reason) {
        this.showNotificationMessage(`⚠️ ${result.reason}`, "error");
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
    this.updateState({
      selectedItemId: null,
      showSlider: false,
      showTransformGizmo: false,
      gizmoPosition: null,
      showRotationGizmo: false,
      rotationGizmoPosition: null,
      showScalePanel: false,
      sidebarActiveItem: null,
      selectedItemPlacementMode: "floor",
      showTexturePanel: false,
      textureOptions: [],
      selectedFurnitureTextureId: undefined,
    });
    this.currentAABBPosition = null;
    this.pendingMove = null;
  }

  async handleConfirmMoveCloser(): Promise<void> {
    if (!this.state.selectedItemId || !this.sceneManager || !this.pendingMove)
      return;

    this.updateState({ showMoveCloserPanel: false, showControlPanel: false });

    const result = await this.sceneManager.moveFurniture(
      this.state.selectedItemId,
      this.pendingMove,
      true,
      false,
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
    if (
      !this.state.selectedItemId ||
      !this.sceneManager ||
      !this.currentAABBPosition
    )
      return;

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
        true,
      );

      if (!result.success) {
        this.showNotificationMessage(
          "⚠️ Precise overlap detected! Furniture moved back to safe position.",
          "error",
        );
        this.currentAABBPosition = null;
      } else {
        this.showNotificationMessage(
          "✅ Position validated! Furniture can stay here.",
          "success",
        );
      }
    } catch (error) {
      console.error("Error during precise collision check:", error);
      this.showNotificationMessage(
        "❌ Error checking collision. Please try again.",
        "error",
      );
    } finally {
      this.updateState({ preciseCheckInProgress: false });
    }
  }

  handleCancelPreciseCheck(): void {
    if (!this.state.selectedItemId || !this.sceneManager) return;

    const lastValid = this.sceneManager.getLastValidPosition(
      this.state.selectedItemId,
    );
    if (lastValid) {
      const furniture = this.sceneManager.getFurniture(
        this.state.selectedItemId,
      );
      if (furniture) {
        furniture.setPosition(lastValid);
        const collisionDetector = this.sceneManager.getCollisionDetector();
        collisionDetector.updateFurnitureBox(
          this.state.selectedItemId,
          furniture.getGroup(),
          furniture.getModelId(),
        );
        furniture.setCollision(false);
      }
    }

    this.updateState({ showPreciseCheckPanel: false });
    this.currentAABBPosition = null;
  }

  handleSelectFurniture(f: any, camera: THREE.Camera): void {
    if (!this.sceneManager || this.state.alignmentStatus !== "aligned" || this.state.experienceMode) return;

    const catalogId = f.id;
    const allFurniture = this.sceneManager.getAllFurniture();

    const getPlacedCatalogId = (itemId: string) =>
      itemId.replace(/-\d+$/, "") || itemId;
    const existingFurniture = allFurniture.find(
      (item) => getPlacedCatalogId(item.getId()) === catalogId,
    );

    if (existingFurniture) {
      this.sceneManager.removeFurniture(existingFurniture.getId());
      if (this.state.selectedItemId === existingFurniture.getId()) {
        this.updateState({ selectedItemId: null, showSlider: false });
      }
      return;
    }

    const spawnPos = this.sceneManager.calculateSpawnPosition(camera, 2);
    const initialRotation: [number, number, number] = [0, 0, 0];
    const uniqueId = `${f.id}-${Date.now()}`;

    if (f.widgetType === "clock") {
      const newFurniture = new ClockWidget(uniqueId, f.name, {
        position: spawnPos,
        rotation: initialRotation,
        scale: this.state.sliderValue,
      });
      newFurniture.setScale(this.state.sliderValue);

      this.sceneManager.addFurniture(newFurniture).then(() => {
        this.sceneManager!.selectFurniture(uniqueId);
        if (this.sceneManager!.selectFurniture(uniqueId)) {
          this.furnitureController?.setSelectedFurniture(uniqueId);
          this.updateState({
            selectedItemId: uniqueId,
            rotationValue: initialRotation[1],
            showSlider: true,
            selectedItemPlacementMode: "floor",
          });
        }
      });
      return;
    }

    if (f.widgetType === "whiteboard") {
      const newFurniture = new WhiteboardWidget(uniqueId, f.name, {
        position: spawnPos,
        rotation: initialRotation,
        scale: this.state.sliderValue,
      });
      newFurniture.setScale(this.state.sliderValue);

      this.sceneManager.addFurniture(newFurniture).then(() => {
        this.sceneManager!.selectFurniture(uniqueId);
        if (this.sceneManager!.selectFurniture(uniqueId)) {
          this.furnitureController?.setSelectedFurniture(uniqueId);
          this.updateState({
            selectedItemId: uniqueId,
            rotationValue: initialRotation[1],
            showSlider: true,
            selectedItemPlacementMode: "floor",
          });
        }
      });
      return;
    }

    const modelPath = this.modelUrlCache.get(f.model_id);
    if (!modelPath) {
      console.warn("Model not loaded yet for:", f.name);
      return;
    }

    const isWallMountable = f.wall_mountable || false;

    const metadata: FurnitureMetadata = {
      description: f.description,
      category: f.category,
      type: f.type,
      isContainer: f.is_container,
      image: f.image,
      wallMountable: isWallMountable,
    };

    const newFurniture = new FurnitureItem(
      uniqueId,
      f.name,
      f.model_id,
      modelPath,
      metadata,
      {
        position: spawnPos,
        rotation: initialRotation,
        scale: this.state.sliderValue,
      },
    );

    this.sceneManager.addFurniture(newFurniture).then(() => {
      this.sceneManager!.selectFurniture(uniqueId);
      if (this.sceneManager!.selectFurniture(uniqueId)) {
        this.furnitureController?.setSelectedFurniture(uniqueId);
        this.updateState({
          selectedItemId: uniqueId,
          rotationValue: initialRotation[1],
          showSlider: true,
          selectedItemPlacementMode: 'floor',
        });
      }
    });
  }

  handleSelectItem(id: string): void {
    if (!this.sceneManager || this.state.experienceMode) {
      return;
    }

    if (
      this.state.selectedItemId === id &&
      (this.state.showTransformGizmo || this.state.showRotationGizmo)
    ) {
      return;
    }

  if (this.state.selectedItemId === id && !this.state.showTransformGizmo && !this.state.showRotationGizmo) {
    this.sceneManager.deselectFurniture(id);
    this.furnitureController?.setSelectedFurniture(null);
    this.updateState({
      selectedItemId: null,
      showSlider: false,
      showTransformGizmo: false,
      gizmoPosition: null,
      showRotationGizmo: false,
      rotationGizmoPosition: null,
      selectedItemPlacementMode: 'floor',
      showTexturePanel: false,
    });
    return;
  }

    if (this.state.selectedItemId) {
      this.sceneManager.deselectFurniture(this.state.selectedItemId);
    }

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

      const scaleValue = typeof scale === "number" ? scale : scale[0];

    const showMovementGizmo = this.state.sidebarActiveItem === 'movement';
    const showRotGizmo = this.state.sidebarActiveItem === 'rotation';
    const isTextureMode = this.state.sidebarActiveItem === "texture";

    const placementMode = furniture.getPlacementMode();

      this.updateState({
        selectedItemId: id,
        showSlider: !showMovementGizmo && !showRotGizmo && !isTextureMode,
        rotationValue: normalizedRotation,
        sliderValue: scaleValue,
        showTransformGizmo: showMovementGizmo,
        gizmoPosition: showMovementGizmo ? position : null,
        showRotationGizmo: showRotGizmo,
        rotationGizmoPosition: showRotGizmo ? position : null,
        selectedItemPlacementMode: placementMode,

        showTexturePanel: false,
        textureOptions: [],
      });

      if (isTextureMode) {
        this.loadTexturesForFurniture(id).then(() => {
          const hasTextures =
            this.state.textureOptions && this.state.textureOptions.length > 0;
          if (!hasTextures) {
            this.showNotificationMessage(
              "No textures available for this item",
              "info",
            );
            return;
          }
          this.updateState({
            showTexturePanel: true,
          });
        });
      }
    }
  }

  handleSelectWhiteboardInExperience(id: string): void {
    const furniture = this.sceneManager?.getFurniture(id);
    if (!furniture || furniture.getMetadata().type !== "Whiteboard") return;
    this.updateState({
      experienceWhiteboardId: id,
      whiteboardTool: "pen",
    });
  }

  handleExitWhiteboardDrawing(): void {
    const id = this.state.experienceWhiteboardId;
    if (id) {
      const wb = this.sceneManager?.getFurniture(id) as WhiteboardWidget | undefined;
      wb?.endStroke();
    }
    this.updateState({ experienceWhiteboardId: null });
  }

  handleSetWhiteboardTool(tool: WhiteboardTool): void {
    const id = this.state.experienceWhiteboardId;
    if (id) {
      const wb = this.sceneManager?.getFurniture(id) as WhiteboardWidget | undefined;
      wb?.endStroke();
    }
    this.updateState({ whiteboardTool: tool });
  }

  handleWhiteboardClear(): void {
    const id = this.state.experienceWhiteboardId;
    if (!id) return;
    const wb = this.sceneManager?.getFurniture(id) as WhiteboardWidget | undefined;
    wb?.clear?.();
  }

  recordWhiteboardPointerHit(whiteboardId: string, worldPoint: THREE.Vector3): void {
    this.lastWhiteboardPointerId = whiteboardId;
    if (!this.lastWhiteboardPointerPoint) this.lastWhiteboardPointerPoint = new THREE.Vector3();
    this.lastWhiteboardPointerPoint.copy(worldPoint);
  }

  clearWhiteboardPointerHit(): void {
    const wbId = this.state.experienceWhiteboardId;
    if (wbId) {
      const wb = this.sceneManager?.getFurniture(wbId) as WhiteboardWidget | undefined;
      wb?.endStroke();
    }
    this.lastWhiteboardPointerId = null;
  }

  handleGizmoMove(axis: "x" | "y" | "z", delta: number): void {
  if (!this.state.selectedItemId || !this.sceneManager) return;

  const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
  if (!furniture) return;

  const currentPos = furniture.getPosition();
  const newPos: [number, number, number] = [...currentPos];

  switch (axis) {
    case 'x': newPos[0] += delta; break;
    case 'y': newPos[1] += delta; break;
    case 'z': newPos[2] += delta; break;
  }

  
  this.updateState({ gizmoPosition: newPos });

  this.sceneManager.moveFurniture(this.state.selectedItemId, newPos, false, false)
    .then((result) => {
      if (!result.success) {
        if (result.needsConfirmation) {
          this.pendingMove = newPos;
          this.updateState({ showMoveCloserPanel: true });
        }
       
        const revertPos = furniture.getPosition();
        this.updateState({ gizmoPosition: revertPos });
      }
    })
    .catch((err) => {
      console.error(`[handleGizmoMove] Error:`, err);
      this.updateState({ gizmoPosition: furniture.getPosition() });
    });
}


  handleGizmoRotate(axis: "x" | "y" | "z", deltaRadians: number): void {
    if (!this.state.selectedItemId || !this.sceneManager) {
      return;
    }

    const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
    if (!furniture) {
      return;
    }

    const currentRot = furniture.getRotation();
    const newRot: [number, number, number] = [...currentRot];

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


  this.sceneManager.rotateFurniture(this.state.selectedItemId, newRot);


  const twoPi = Math.PI * 2;
  let normalizedRotation = newRot[1] % twoPi;
  if (normalizedRotation < 0) normalizedRotation += twoPi;
  this.updateState({ rotationValue: normalizedRotation });
}

  handleScaleChange(newScale: number): void {
  const clampedScale = Math.max(0.5, Math.min(3, newScale));
  this.updateState({ sliderValue: clampedScale });
  
  if (this.state.selectedItemId && this.sceneManager) {
    this.sceneManager.scaleFurniture(this.state.selectedItemId, clampedScale);
  }
}

  handleRotationSliderChange(newRotation: number): void {
    this.updateState({ rotationValue: newRotation });
    if (this.state.selectedItemId && this.sceneManager) {
      const furniture = this.sceneManager.getFurniture(
        this.state.selectedItemId,
      );
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
    return this.sceneManager
      .getAllFurniture()
      .map((item) => {
        const id = item.getId();
        return id.replace(/-\d+$/, "") || id;
      });
  }

  updateFrame(session: any, camera: THREE.Camera, delta: number): void {
    if (!session) return;

    const isAligning = this.state.alignmentStatus === "aligning" && this.state.alignmentMode === "world";
    if (this.navigationController) {
      this.navigationController.setAlignmentMode(isAligning);

      if (isAligning && this.sceneManager?.getHomeModel()) {
        this.navigationController.setHomeModelGroup(this.sceneManager.getHomeModel()!.getGroup());
      } else {
        this.navigationController.setHomeModelGroup(null);
      }
    }

    let whiteboardDrawingThisFrame = false;
    const wbId = this.state.experienceWhiteboardId;
    if (this.state.experienceMode && wbId && this.sceneManager) {
      const wb = this.sceneManager.getFurniture(wbId) as WhiteboardWidget | undefined;
      if (wb) {
        let drawPoint: THREE.Vector3 | null = null;
        const usePointerHit =
          this.lastWhiteboardPointerId === wbId && this.lastWhiteboardPointerPoint;
        if (usePointerHit && session.inputSources) {
          for (let i = 0; i < session.inputSources.length; i++) {
            const gamepad = session.inputSources[i]?.gamepad;
            const trigger = gamepad?.buttons?.[0]?.pressed ?? false;
            const grip = gamepad?.buttons?.[1]?.pressed ?? false;
            if (trigger || grip) {
              drawPoint = this.lastWhiteboardPointerPoint;
              break;
            }
          }
        }
        if (!drawPoint && this.renderer?.xr && session.inputSources) {
          const boardMesh = wb.getBoardMesh?.();
          if (boardMesh) {
            const raycaster = new THREE.Raycaster();
            const origin = new THREE.Vector3();
            const direction = new THREE.Vector3();
            for (let i = 0; i <= 1; i++) {
              const controller = (this.renderer as any).xr.getController?.(i);
              if (!controller) continue;
              const gamepad = session.inputSources[i]?.gamepad;
              const trigger = gamepad?.buttons?.[0]?.pressed ?? false;
              const grip = gamepad?.buttons?.[1]?.pressed ?? false;
              if (!trigger && !grip) continue;
              controller.getWorldPosition(origin);
              controller.getWorldDirection(direction);
              raycaster.set(origin, direction);
              const hits = raycaster.intersectObject(boardMesh, true);
              if (hits.length > 0) {
                drawPoint = hits[0].point;
                break;
              }
            }
          }
        }
        if (drawPoint) {
          if (!this.lastFrameWhiteboardDrawing) wb.startStroke();
          wb.drawAt(drawPoint, this.state.whiteboardTool);
          whiteboardDrawingThisFrame = true;
        } else if (this.lastFrameWhiteboardDrawing) {
          wb.endStroke();
        }
      }
    }
    this.lastFrameWhiteboardDrawing = whiteboardDrawingThisFrame;

    const canNavigate = (this.state.alignmentStatus === "aligning" && this.state.alignmentMode === "world") ||
                       (this.state.alignmentStatus === "aligned" && this.state.alignmentMode === "free");
    if (canNavigate && !whiteboardDrawingThisFrame) {
      this.navigationController?.update(session, camera, delta);
    }

    if (this.state.alignmentStatus === "aligned" &&
        !this.state.navigationMode &&
        this.state.selectedItemId &&
        this.furnitureController &&
        !this.state.experienceMode) {
      this.furnitureController.update(session, camera, delta);
    }

    this.sceneManager?.updateAnimations(delta);
  }
}


export function SceneContent({ homeId, digitalHome, arModeRequested }: SceneContentProps) {
  const navigate = useNavigate();
  const { scene, camera } = useThree();
  const xr = useXR();
  const xrStore = useXRStore();

  const [state, setState] = useState<SceneState>({
    showSlider: false,
    showFurniture: false,
    showInstructions: false,
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
    showSidebar: true,
    sidebarActiveItem: null,
    showTransformGizmo: false,
    gizmoPosition: null,
    showRotationGizmo: false,
    rotationGizmoPosition: null,
    showScalePanel: false,
    selectedItemPlacementMode: "floor",
    showTexturePanel: false,
    textureOptions: [],
    selectedFurnitureTextureId: undefined,
    showEnvironmentPanel: false,
    floorTextures: [],
    wallTextures: [],
    selectedFloorId: undefined,
    selectedWallId: undefined,
    loadingEnvironment: false,
    alignmentStatus: 'pending',
    alignmentMode: null,
    showAlignmentPanel: true,
    showAlignmentConfirm: false,
    homeTransparent: false,
    experienceMode: false,
    experienceWhiteboardId: null,
    whiteboardTool: "pen",
    overlayReady: false,
    overlayFloorId: undefined,
    overlayWallId: undefined,
    // in constructor initial state
showOriginalModel: true,
  });

  const logicRef = useRef<SceneContentLogic | null>(null);

  useEffect(() => {
    const updateState = (
      update: Partial<SceneState> | ((prev: SceneState) => Partial<SceneState>),
    ) => {
      setState((prev) => {
        const newState = typeof update === "function" ? update(prev) : update;
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
  
  useEffect(() => {
    if (!xr.session || !logicRef.current || !arModeRequested) return;
 
    const homeModel = logicRef.current.sceneManager?.getHomeModel();
    if (homeModel && !homeModel.getIsTransparent()) {
      homeModel.setTransparent(true);
      logicRef.current.updateState({ homeTransparent: true });
    }
  }, [xr.session, arModeRequested, state.loading]);

  useEffect(() => {
    if (!logicRef.current) return;
    logicRef.current.loadHome(digitalHome);
  }, [homeId, digitalHome]);

  useEffect(() => {
    if (!logicRef.current) return;
    logicRef.current.loadFurnitureCatalog();
  }, []);

  useEffect(() => {
    if (!logicRef.current || logicRef.current.modelUrlCache.size === 0) return;
    logicRef.current.loadDeployedItems();
  }, [logicRef.current?.modelUrlCache.size]);

  // ── NEW: if overlay wasn't created inside loadHome (scene not ready yet),
  // create it now once the model finishes loading and scene is available.
  useEffect(() => {
    if (!logicRef.current || state.loading) return;
    if (logicRef.current.overlayGroup) return; // already created
    const homeModel = logicRef.current.sceneManager?.getHomeModel();
    if (!homeModel) return;
    logicRef.current.createOverlayLayer(scene);
  }, [state.loading, scene]);

  useFrame((state, delta) => {
    if (!logicRef.current) return;
    logicRef.current.renderer = state.gl;

    logicRef.current.sceneManager?.updateAnimations(delta);

    const session = xr.session;
    if (!session) return;
    logicRef.current.updateFrame(session, camera, delta);
  });

  if (!logicRef.current) return null;

  const logic = logicRef.current;
  const isAligned = state.alignmentStatus === "aligned";
  const uiLocked = state.showFurniture || 
    state.showControlPanel || 
    state.showInstructions || 
    state.showSlider || 
    state.showNotification ||
    state.showMoveCloserPanel ||
    state.showScalePanel ||
    state.showPreciseCheckPanel ||
    state.showAlignmentPanel ||
    state.showAlignmentConfirm;

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

          {/* ── OVERLAY LAYER ──────────────────────────────────────────────
              Renders the cloned room on top of the original. All overlay
              meshes start with opacity 0 so they are invisible until the
              user picks a texture via handleSelectOverlayFloorTexture /
              handleSelectOverlayWallTexture.
              The group is managed imperatively inside SceneContentLogic
              (added directly to the Three.js scene), but we also keep a
              <primitive> here so React-Three-Fiber is aware of it and
              includes it in the render loop without needing an extra scene.add().
              If createOverlayLayer already added it to the scene we still
              use the same object reference, so there is no duplication.
          ────────────────────────────────────────────────────────────────── */}
          {logic.overlayGroup && (
            <primitive object={logic.overlayGroup} />
          )}
          
          {logic.sceneManager.getAllFurniture().map((furniture) => {
            const meta = furniture.getMetadata?.();
            const isWhiteboard = meta?.type === "Whiteboard";
            const boardMesh =
              isWhiteboard ? (furniture as WhiteboardWidget).getBoardMesh?.() ?? null : null;

            const handleFurnitureClick = (e: any) => {
              let target = e.object;
              let isGizmoClick = false;
              let depth = 0;

              while (target && depth < 10) {
                if (target.userData?.isGizmo) {
                  isGizmoClick = true;
                  break;
                }
                target = target.parent;
                depth++;
              }

              if (isGizmoClick) {
                e.stopPropagation();
                return;
              }

              if (state.alignmentStatus === "aligned" && !state.navigationMode && !uiLocked) {
                if (state.experienceMode) {
                  if (isWhiteboard) {
                    e.stopPropagation();
                    logic.handleSelectWhiteboardInExperience(furniture.getId());
                  }
                } else {
                  e.stopPropagation();
                  logic.handleSelectItem(furniture.getId());
                }
              }
            };

            return (
              <React.Fragment key={furniture.getId()}>
                <primitive
                  object={furniture.getGroup()}
                  onClick={handleFurnitureClick}
                  onPointerDown={handleFurnitureClick}
                />
                {isWhiteboard && state.experienceMode && boardMesh && (
                  <WhiteboardHitTarget
                    boardMesh={boardMesh}
                    isSelected={state.experienceWhiteboardId === furniture.getId()}
                    onSelect={() => logic.handleSelectWhiteboardInExperience(furniture.getId())}
                    onPointerMove={(point) =>
                      logic.recordWhiteboardPointerHit(furniture.getId(), point)
                    }
                    onPointerLeave={() => logic.clearWhiteboardPointerHit()}
                  />
                )}
              </React.Fragment>
            );
          })}

            {state.showTransformGizmo && state.gizmoPosition && (
              <TransformGizmo
                position={state.gizmoPosition}
                visible={state.showTransformGizmo}
                onMove={(axis, delta) => logic.handleGizmoMove(axis, delta)}
              />
            )}

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
      
      {state.alignmentStatus === "aligned" && (
        <>
          {!state.experienceMode && (
            <CatalogToggle onToggle={() => logic.handleToggleUI()} />
          )}
          <ControlPanelToggle onToggle={() => logic.handleToggleControlPanel()} />
        </>
      )}

      <HeadLockedUI distance={1.6} verticalOffset={0} enabled={state.showAlignmentPanel}>
        <VRAlignmentPanel 
          show={state.showAlignmentPanel} 
          onSelectMode={(mode) => logic.handleAlignmentModeSelect(mode)} 
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.6} verticalOffset={0} enabled={state.showAlignmentConfirm}>
        <VRAlignmentConfirmPanel 
          show={state.showAlignmentConfirm} 
          onConfirm={() => logic.handleAlignmentConfirm()} 
          onCancel={() => logic.handleAlignmentCancel()} 
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.6} verticalOffset={0} enabled={state.showInstructions}>
        <VRInstructionPanel 
          show={state.showInstructions} 
          onClose={() => logic.updateState({ showInstructions: false })} 
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.7}
        verticalOffset={0}
        enabled={state.showFurniture && !state.experienceMode}
      >
        <VRFurniturePanel
          show={state.showFurniture && !state.experienceMode}
          catalog={state.furnitureCatalog}
          loading={state.catalogLoading}
          onSelectItem={(f) => logic.handleSelectFurniture(f, camera)}
          placedFurnitureIds={logic.getPlacedCatalogIds()}
          onClose={() => logic.updateState({ showFurniture: false })}
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.7}
        verticalOffset={0}
        enabled={state.showControlPanel}
      >
        <VRControlPanel
          show={state.showControlPanel}
          onSave={() => logic.handleSaveScene()}
          onHelp={() => logic.handleHelp()}
          onBack={() => logic.handleBackToHome(xrStore)}
          onLogout={() => logic.handleLogout()}
          saving={state.saving}
          onClose={() => logic.updateState({ showControlPanel: false })}
          alignmentMode={state.alignmentMode}
          onToggleAlignment={() => logic.handleToggleAlignmentMode()}
          homeTransparent={state.homeTransparent}
          onToggleTransparency={() => logic.handleToggleHomeTransparency()}
          experienceMode={state.experienceMode}
          onToggleExperienceMode={() => logic.handleToggleExperienceMode()}
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.4}
        verticalOffset={0}
        enabled={state.showNotification}
      >
        <VRNotificationPanel
          show={state.showNotification}
          message={state.notificationMessage}
          type={state.notificationType}
          onClose={() =>
            logic.updateState({
              showNotification: false,
              notificationFromControlPanel: false,
            })
          }
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.5}
        verticalOffset={0}
        enabled={state.showMoveCloserPanel}
      >
        <VRPreciseCollisionPanel
          show={state.showMoveCloserPanel}
          onConfirm={() => logic.handleConfirmMoveCloser()}
          onCancel={() => logic.handleCancelMoveCloser()}
          isChecking={false}
          title="Move Furniture Closer?"
          message="The furniture is close to another object. Do you want to move it closer?"
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.5}
        verticalOffset={0}
        enabled={state.showPreciseCheckPanel}
      >
        <VRPreciseCollisionPanel
          show={state.showPreciseCheckPanel}
          onConfirm={() => logic.handleConfirmPreciseCheck()}
          onCancel={() => logic.handleCancelPreciseCheck()}
          isChecking={state.preciseCheckInProgress}
          title="Use precise collision detection?"
          message="Run precise API check to verify overlap? (Click No to move back to safe position)"
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.6}
        verticalOffset={0}
        enabled={state.showScalePanel}
      >
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
      <HeadLockedUI
        distance={1.5}
        verticalOffset={0}
        enabled={!!state.experienceWhiteboardId}
      >
        <group position={[0.4, 0, 0]}>
          <VRWhiteboardPanel
            show={!!state.experienceWhiteboardId}
            currentTool={state.whiteboardTool}
            onSelectTool={(tool) => logic.handleSetWhiteboardTool(tool)}
            onExit={() => logic.handleExitWhiteboardDrawing()}
            onClear={() => logic.handleWhiteboardClear()}
          />
        </group>
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.4}
        verticalOffset={0}
        enabled={state.showSidebar && !state.experienceMode}
      >
        <group position={[-0.8, 0, 0]}>
          <VRSidebar
            show={state.showSidebar && !state.experienceMode}
            onItemSelect={(itemId) => logic.handleSidebarItemSelect(itemId)}
            showOriginalModel={state.showOriginalModel} //add
          />
        </group>
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.3}
        verticalOffset={0}
        enabled={state.showTexturePanel}
      >
        <group position={[1, 0, 0]}>
          <TextureSelectorPanel
            show={state.showTexturePanel}
            onSelectTexture={(id, path) => logic.handleSelectTexture(id, path)}
            onClose={() => logic.handleCloseTexturePanel()}
            textures={state.textureOptions}
            selectedTextureId={state.selectedFurnitureTextureId}
            title={state.selectedItemId ? "Change Texture" : "Textures"}
          />
        </group>
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.3}
        verticalOffset={0}
        enabled={state.showEnvironmentPanel}
      >
        <group position={[0, 0, 0]}>
          <EnvironmentSelectorPanel
            show={state.showEnvironmentPanel}
            onSelectFloor={(id, path) =>
              logic.handleSelectFloorTexture(id, path)
            }
            onSelectWall={(id, path) => logic.handleSelectWallTexture(id, path)}
            onClose={() => logic.updateState({ showEnvironmentPanel: false })}
            floorTextures={state.floorTextures}
            wallTextures={state.wallTextures}
            selectedFloorId={state.selectedFloorId}
            selectedWallId={state.selectedWallId}
            loadingFloor={state.loadingEnvironment}
            loadingWall={state.loadingEnvironment}
            title="Environment Settings"
          />
        </group>
      </HeadLockedUI>
    </>
  );
}