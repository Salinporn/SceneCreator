/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Environment, PerspectiveCamera, OrbitControls } from "@react-three/drei";
import { useXRStore, useXR, isXRInputSourceState } from "@react-three/xr";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
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
import { WallPositionPanel, WALL_PANEL_STEP } from "../panel/WallPositionPanel";
import { WallSelectionPanel } from "../panel/WallSelectionPanel";
import { WallpaperCutoutPanel } from "../panel/WallpaperCutoutPanel";
import { WallpaperLassoOverlay } from "./WallpaperLassoOverlay";
import { WallpaperLassoPointerRaycast } from "./WallpaperLassoPointerRaycast";
import { VRWhiteboardPanel } from "../panel/VRWhiteboardPanel";
import { SceneManager, type WallInfo, MAX_WALL_MOUNT_DISTANCE } from "../../core/managers/SceneManager";
import {
  FurnitureItem,
  FurnitureMetadata,
  type WallPlacementInfo,
} from "../../core/objects/FurnitureItem";
import { WallpaperItem } from "../../core/objects/WallpaperItem";
import { ClockWidget } from "../../core/objects/ClockWidget";
import { WhiteboardWidget, type WhiteboardTool } from "../../core/objects/WhiteboardWidget";
import { HomeModel } from "../../core/objects/HomeModel";
import {
  NavigationController,
  FurnitureEditController,
} from "../../core/controllers/XRControllerBase";
import { makeAuthenticatedRequest, logout } from "../../utils/Auth";
import { compressWallpaperEntriesInDeployedItems } from "../../utils/compressImageForStorage";
import { VRSidebar } from "../panel/VRSidebar";
import { VRAlignmentPanel } from "../panel/VRAlignmentPanel";
import { TransformGizmo } from "../panel/TransformGizmo";
import { RotationGizmo } from "../panel/RotationGizmo";
import { CornerSelectionVisualization } from "../panel/CornerSelectionVisualization";
import { AlignmentLineVisualization } from "../panel/AlignmentLineVisualization";
import { ARSessionHandler } from "./ARSessionHandler";
import { WeatherWidget } from "../../core/objects/WeatherWidget";
import { TextureSelectorPanel, TextureOption } from "../panel/texture/TextureSelectorPanel";
import { AvatarController, AVATAR_URL_MAP } from "./AvatarController";

const DIGITAL_HOME_PLATFORM_BASE_URL = import.meta.env
  .VITE_DIGITAL_HOME_PLATFORM_URL;
const BUILTIN_WIDGET_NAMES = ["clock", "whiteboard", "weather"] as const;

function getBuiltInWidgetType(itemData: {
  category?: string;
  name?: string;
}): (typeof BUILTIN_WIDGET_NAMES)[number] | null {
  if (itemData.category?.toLowerCase() !== "widget") return null;
  const name = itemData.name?.toLowerCase();
  if (!name || !BUILTIN_WIDGET_NAMES.includes(name as any)) return null;
  return name as (typeof BUILTIN_WIDGET_NAMES)[number];
}

function FakeVRPassthroughBlocker({ enabled }: { enabled: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!enabled || !meshRef.current) return;
    meshRef.current.position.setFromMatrixPosition(camera.matrixWorld);
  });

  if (!enabled) return null;

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={-1000}>
      <sphereGeometry args={[35, 32, 24]} />
      <meshBasicMaterial
        color="#808080"
        side={THREE.BackSide}
        depthTest={false}
        depthWrite={false}
        fog={false}
      />
    </mesh>
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
      positions?: number[];
      rotation?: number[];
      scale?: number | number[];
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
  showUnmountPanel: boolean;
  showPreciseCheckPanel: boolean;
  preciseCheckInProgress: boolean;
  awaitingCollisionAck: boolean;
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
  showWallPanel: boolean;
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
  selectedFloorId: string | undefined;
  selectedWallId: string | undefined;
  loadingEnvironment: boolean;
  experienceMode: boolean;
  experienceWhiteboardId: string | null;
  showAvatarMode: boolean;
  avatarLoadError: boolean;
  selectedAvatarIndex: number;
  avatarSpawnPosition: [number, number, number] | null;
  avatarHomeModelGroup: THREE.Group | null;
  whiteboardTool: WhiteboardTool;
  showCornerSelection: boolean;
  showHeadTrackingAlignment: boolean;
  alignmentState: 'idle' | 'selectingCorner' | 'aligningFirstCorner' | 'aligningSecondCorner' | 'aligningThirdCorner' | 'aligningFourthCorner' | 'completed';
  alignmentARModeRequested: boolean;
  waitingForAlignmentConfirmation: boolean;
  legacyManualAlignment: boolean;
  showWallSelectionPanel: boolean;
  pendingWallpaperItem: {
    id: string;
    name: string;
    model_id: number;
    image: string;
    description?: string;
    category: string;
    type: string;
  } | null;
  wallpaperCutoutState: {
    wallpaperId: string;
    step: 'prompt' | 'drawing';
    lassoRegions: { x: number; y: number; width: number; height: number }[];
  } | null;
  lassoStart: { x: number; y: number } | null;
  lassoPreview: { x: number; y: number; width: number; height: number } | null;
  isLassoDrawing: boolean;
  immersiveSessionKind: 'vr' | 'ar' | null;
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
  public lastWhiteboardPointerUv: THREE.Vector2 | null = null;
  public lastWhiteboardPointerId: string | null = null;
  public lastWhiteboardPointerInputSource: XRInputSource | null = null;

  public pendingMove: [number, number, number] | null = null;
  public currentAABBPosition: [number, number, number] | null = null;
  public modelUrlCache: Map<number, string> = new Map();
  private prevTriggerState: Map<string, boolean> = new Map();
  private xrStore: any = null;
  private xrStoreUnsubscribe: (() => void) | null = null;
  private isRequestingAR: boolean = false;
  private cornerSelectionReady: boolean = false;
  private alignmentReady: boolean = false;
  private pendingARAfterAlignment = false;
  private homeWorldMatrixBeforeAlignment: THREE.Matrix4 | null = null;
  private skipAlignmentSessionSwap = false;
  private homeGroupSnapshotBeforeFirstAlignment: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    scale: THREE.Vector3;
  } | null = null;
  private lastCompletedAlignmentDelta: THREE.Matrix4 | null = null;

  private textureCache: Map<string, TextureOption[]> = new Map();
  private textureLoadingCache: Map<string, Promise<void>> = new Map();
  public lassoHandledByPrimitiveRef: { current: boolean } | null = null;

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
      showUnmountPanel: false,
      showPreciseCheckPanel: false,
      preciseCheckInProgress: false,
      awaitingCollisionAck: false,
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
      showWallPanel: false,
      selectedItemPlacementMode: 'floor',
      alignmentStatus: 'pending',
      alignmentMode: null,
      showAlignmentPanel: true,
      showAlignmentConfirm: false,
      homeTransparent: false,
      showCornerSelection: false,
      showHeadTrackingAlignment: false,
      alignmentState: 'idle',
      alignmentARModeRequested: false,
      waitingForAlignmentConfirmation: false,
      legacyManualAlignment: false,
      showWallSelectionPanel: false,
      pendingWallpaperItem: null,
      wallpaperCutoutState: null,
      lassoStart: null,
      lassoPreview: null,
      isLassoDrawing: false,
      showTexturePanel: false,
      textureOptions: [],
      selectedFurnitureTextureId: undefined,
      showEnvironmentPanel: false,
      selectedFloorId: undefined,
      selectedWallId: undefined,
      loadingEnvironment: false,
      experienceMode: false,
      experienceWhiteboardId: null,
      whiteboardTool: "pen",
      showAvatarMode: false,
      avatarLoadError: false,
      selectedAvatarIndex: parseInt(localStorage.getItem("selectedAvatarIndex") ?? "4", 10),
      avatarSpawnPosition: null,
      avatarHomeModelGroup: null,
      immersiveSessionKind: null,
    };
  }

  getState(): SceneState {
    return this.state;
  }

  updateState(update: Partial<SceneState>): void {
    this.state = { ...this.state, ...update };
    this.setState(update);
    if (
      'homeTransparent' in update ||
      'showHeadTrackingAlignment' in update ||
      'alignmentARModeRequested' in update
    ) {
      this.syncImmersiveSessionKindFromXRStore();
    }
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
          if (this.state.selectedItemId === id) {
            this.updateState({ selectedItemPlacementMode: "floor" });
          }
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

  setXRStore(xrStore: any): void {
    if (this.xrStoreUnsubscribe) {
      this.xrStoreUnsubscribe();
      this.xrStoreUnsubscribe = null;
    }
    this.xrStore = xrStore;
    if (xrStore?.subscribe) {
      this.xrStoreUnsubscribe = xrStore.subscribe(() => {
        this.syncImmersiveSessionKindFromXRStore();
      });
    }
    this.syncImmersiveSessionKindFromXRStore();
  }

  private syncImmersiveSessionKindFromXRStore(): void {
    if (!this.xrStore) {
      if (this.state.immersiveSessionKind !== null) {
        this.updateState({ immersiveSessionKind: null });
      }
      return;
    }
    const s = this.xrStore.getState();
    const session = s.session;
    const rawMode =
      (session && (session as { mode?: XRSessionMode }).mode) ?? s.mode ?? null;

    let next: 'vr' | 'ar' | null = null;
    if (rawMode === 'immersive-vr') {
      next = 'vr';
    } else if (rawMode === 'immersive-ar') {
      const borrowingARForAlignment =
        this.state.showHeadTrackingAlignment || this.state.alignmentARModeRequested;
      const userChosePassthroughAR =
        this.state.homeTransparent && !borrowingARForAlignment;
      next = userChosePassthroughAR ? 'ar' : 'vr';
    }

    if (this.state.immersiveSessionKind !== next) {
      this.updateState({ immersiveSessionKind: next });
    }
  }

  async requestARMode(): Promise<void> {
    if (this.isRequestingAR) {
      return;
    }

    if (!this.xrStore) {
      console.warn('XR store not available');
      return;
    }

    this.isRequestingAR = true;

    try {
      if (!navigator.xr || !(navigator.xr as any).isSessionSupported) {
        console.warn('XR not available');
        this.isRequestingAR = false;
        return;
      }

      const isARSupported = await (navigator.xr as any).isSessionSupported('immersive-ar');
      if (!isARSupported) {
        console.warn('AR not supported');
        this.isRequestingAR = false;
        return;
      }

      const currentSession = this.xrStore.getState().session;
      
      if (currentSession && (currentSession as any).mode === 'immersive-ar') {
        this.isRequestingAR = false;
        return;
      }

      let gl = this.xrStore.getState().gl;
      let retries = 0;
      const maxRetries = 30;
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      while ((!gl || !gl.xr) && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        gl = this.xrStore.getState().gl;
        retries++;
        if (gl && gl.xr) {
          break;
        }
      }

      if (!gl || !gl.xr) {
        console.error('Renderer not available after waiting', {
          hasGl: !!gl,
          hasXr: !!(gl && gl.xr),
          retries
        });
        this.isRequestingAR = false;
        return;
      }

      if (currentSession && (currentSession as any).mode !== 'immersive-ar') {
        try {
          if (!currentSession.ended) {
            await currentSession.end();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.warn('Error ending previous session:', err);
        }
      }

      const arSession = await (navigator.xr as any).requestSession('immersive-ar', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking', 'layers']
      });

      if (gl && gl.xr) {
        await gl.xr.setSession(arSession);
        this.xrStore.setState({ session: arSession });
      } else {
        console.error('Renderer lost during session request');
        await arSession.end();
      }
    } catch (err) {
      console.error('Failed to request AR mode:', err);
      if (err instanceof Error && err.message.includes('cancelled')) {
        console.warn('AR session request was cancelled (likely called multiple times)');
      }
    } finally {
      this.isRequestingAR = false;
    }
  }

  cleanup(): void {
    if (this.xrStoreUnsubscribe) {
      this.xrStoreUnsubscribe();
      this.xrStoreUnsubscribe = null;
    }
    this.xrStore = null;

    this.sceneManager?.dispose();
    this.navigationController?.reset();
    this.furnitureController?.reset();
    this.modelUrlCache.forEach((url) => URL.revokeObjectURL(url));

    this.textureCache.clear();
    this.textureLoadingCache.clear();

  }

  private applySavedHomeSpatialData(digitalHome?: SceneContentProps["digitalHome"]): void {
    const home = this.sceneManager?.getHomeModel();
    if (!home || !digitalHome?.spatialData) return;

    const sd = digitalHome.spatialData;
    if (sd.positions && Array.isArray(sd.positions) && sd.positions.length >= 3) {
      home.setPosition([
        Number(sd.positions[0]),
        Number(sd.positions[1]),
        Number(sd.positions[2]),
      ]);
    }
    if (sd.rotation && Array.isArray(sd.rotation) && sd.rotation.length >= 3) {
      home.setRotation([
        Number(sd.rotation[0]),
        Number(sd.rotation[1]),
        Number(sd.rotation[2]),
      ]);
    }
    if (sd.scale !== undefined && sd.scale !== null) {
      if (Array.isArray(sd.scale)) {
        if (sd.scale.length >= 3) {
          home.setScale([Number(sd.scale[0]), Number(sd.scale[1]), Number(sd.scale[2])]);
        } else if (sd.scale.length >= 1) {
          home.setScale(Number(sd.scale[0]));
        }
      } else if (typeof sd.scale === "number") {
        home.setScale(sd.scale);
      }
    }
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
        this.applySavedHomeSpatialData(digitalHome);
        this.sceneManager.updateRoomBoundaryFromHomeModel();
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
        const items = data.available_items.map((item: any) => {
          const widgetType = getBuiltInWidgetType(item);
          return {
            id: item.id.toString(),
            name: item.name,
            description: item.description,
            model_id: item.model_id,
            image: item.image,
            category: item.category,
            type: item.type,
            is_container: item.is_container,
            wall_mountable: item.wall_mountable || false,
            ...(widgetType && { widgetType }),
          };
        });

        this.updateState({ furnitureCatalog: items });

        for (const item of items) {
          if (getBuiltInWidgetType(item)) continue;
          if (item.category?.toLowerCase() === 'wallpaper' || item.type?.toLowerCase() === 'wallpaper') continue;
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
    if (!this.sceneManager) return;

    this.updateState({ loading: true });
    try {
      const response = await makeAuthenticatedRequest(
        `/digitalhomes/get_deployed_items_details/${this.homeId}/`,
      );

      if (response.ok) {
        const data = await response.json();

        const normalizePlacementMode = (pm: unknown): string => {
          if (typeof pm !== "string") return "";
          return pm.toLowerCase().trim();
        };

        const coerceWallPlacement = (wp: unknown): WallPlacementInfo | null => {
          const raw = wp as any;
          if (!raw) return null;

          const wallNormalRaw = raw.wallNormal ?? raw.wall_normal;
          const wallPositionRaw = raw.wallPosition ?? raw.wall_position;

          if (!Array.isArray(wallNormalRaw) || wallNormalRaw.length < 3) return null;

          const wallPositionNum = typeof wallPositionRaw === "number"
            ? wallPositionRaw
            : Number(wallPositionRaw);
          if (!Number.isFinite(wallPositionNum)) return null;

          const wallNormal: [number, number, number] = [
            Number(wallNormalRaw[0]),
            Number(wallNormalRaw[1]),
            Number(wallNormalRaw[2]),
          ];
          if (!wallNormal.every((n) => Number.isFinite(n))) return null;

          const len = Math.hypot(wallNormal[0], wallNormal[1], wallNormal[2]);
          const wallNormalNormalized: [number, number, number] =
            len > 1e-9
              ? [wallNormal[0] / len, wallNormal[1] / len, wallNormal[2] / len]
              : wallNormal;

          const roomBoundary = this.sceneManager?.collisionDetector.getRoomBoundary();
          let wallPositionPlane = wallPositionNum;
          if (roomBoundary) {
            const nx = wallNormalNormalized[0];
            const nz = wallNormalNormalized[2];
            const isAxisX = Math.abs(nx) >= 0.99 && Math.abs(nz) < 0.01;
            const isAxisZ = Math.abs(nz) >= 0.99 && Math.abs(nx) < 0.01;

            if (isAxisX) {
              wallPositionPlane = nx > 0 ? roomBoundary.min.x : -roomBoundary.max.x;
            } else if (isAxisZ) {
              wallPositionPlane = nz > 0 ? roomBoundary.min.z : -roomBoundary.max.z;
            }
          }

          return { wallNormal: wallNormalNormalized, wallPosition: wallPositionPlane };
        };

        const getWallPlacementFromRoomBoundarySideId = (
          wallSideId: unknown
        ): WallPlacementInfo | null => {
          if (typeof wallSideId !== "string") return null;
          const roomBoundary = this.sceneManager?.collisionDetector.getRoomBoundary();
          if (!roomBoundary) return null;

          const { min, max } = roomBoundary;
          switch (wallSideId) {
            case "wall-x-max":
              return { wallNormal: [-1, 0, 0], wallPosition: -max.x };
            case "wall-x-min":
              return { wallNormal: [1, 0, 0], wallPosition: min.x };
            case "wall-z-min":
              return { wallNormal: [0, 0, 1], wallPosition: min.z };
            case "wall-z-max":
              return { wallNormal: [0, 0, -1], wallPosition: -max.z };
            default:
              return null;
          }
        };

        const maybeMountWallIfCloseToBoundary = (
          furniture: FurnitureItem,
          position: [number, number, number]
        ): void => {
          if (!furniture.isWallMountable() || furniture.getWallPlacement()) return;
          const roomBoundary = this.sceneManager?.collisionDetector.getRoomBoundary();
          if (!roomBoundary) return;

          const { min, max } = roomBoundary;
          const x = position[0];
          const z = position[2];

          const candidates: Array<{
            wallNormal: [number, number, number];
            wallPosition: number;
            dist: number;
          }> = [
            { wallNormal: [1, 0, 0], wallPosition: min.x, dist: Math.abs(x - min.x) },
            { wallNormal: [-1, 0, 0], wallPosition: -max.x, dist: Math.abs(x - max.x) },
            { wallNormal: [0, 0, 1], wallPosition: min.z, dist: Math.abs(z - min.z) },
            { wallNormal: [0, 0, -1], wallPosition: -max.z, dist: Math.abs(z - max.z) },
          ];

          const nearest = candidates.reduce((best, c) => (c.dist < best.dist ? c : best), candidates[0]);
          const mountTolerance = 0.2;
          if (nearest.dist <= MAX_WALL_MOUNT_DISTANCE + mountTolerance) {
            furniture.setWallPlacement({
              wallNormal: nearest.wallNormal,
              wallPosition: nearest.wallPosition,
            });
          }
        };

        for (const itemObj of data.deployed_items) {
          const itemId = Object.keys(itemObj)[0];
          const itemData = itemObj[itemId];

          const widgetType = getBuiltInWidgetType(itemData);
          if (widgetType) {
            const sd = itemData.spatialData;
            const interp = this.sceneManager.interpretSpatialDataForLoad(
              sd as Record<string, unknown> | undefined,
            );
            const scaleRaw = sd?.scale;
            const scaleVal = Array.isArray(scaleRaw)
              ? Number(scaleRaw[0] ?? 1)
              : typeof scaleRaw === "number"
                ? scaleRaw
                : 1;
            const initialTransform = {
              position: interp.position,
              rotation: interp.rotation,
              scale: scaleVal,
            };
            let furniture;
            if (widgetType === "clock") {
              furniture = new ClockWidget(itemId, itemData.name, initialTransform);
            } else if (widgetType === "whiteboard") {
              furniture = new WhiteboardWidget(itemId, itemData.name, initialTransform);
            } else if (widgetType === "weather") {
              furniture = new WeatherWidget(itemId, initialTransform);
            }
            if (furniture) {
              const placementMode = normalizePlacementMode(sd?.placement_mode);
              const shouldBeWallMounted =
                placementMode === "wall" ||
                Boolean(sd?.wall_placement) ||
                Boolean(sd?.wall_side_id) ||
                Boolean(interp.wallPlacement);

              if (shouldBeWallMounted) {
                const wp =
                  coerceWallPlacement(interp.wallPlacement) ??
                  coerceWallPlacement(sd?.wall_placement) ??
                  getWallPlacementFromRoomBoundarySideId(sd?.wall_side_id) ??
                  null;
                if (wp) furniture.setWallPlacement(wp);
                else furniture.setPlacementMode("wall");
              }

              maybeMountWallIfCloseToBoundary(furniture, interp.position);

              await this.sceneManager.addFurniture(furniture);
              if (widgetType === "whiteboard") {
                const wbImage = itemData.whiteboard_image;
                if (typeof wbImage === "string" && wbImage.length > 0) {
                  (furniture as WhiteboardWidget).applySerializedImage(wbImage);
                }
              }
              if (sd) {
                this.sceneManager.registerDeployedSpatialSnapshot(
                  itemId,
                  sd as Record<string, unknown>,
                );
              }
            }
            continue;
          }

          // Plane for wallpaper creation
          const isWallpaper = (itemData.category?.toLowerCase() === 'wallpaper' || itemData.type?.toLowerCase() === 'wallpaper');
          if (isWallpaper && itemData.image) {
            const sd = itemData.spatialData as Record<string, unknown> | undefined;
            const interp = this.sceneManager.interpretSpatialDataForLoad(sd);
            const wallPlacement =
              interp.wallPlacement ??
              (sd?.wall_placement as { wallNormal: [number, number, number]; wallPosition: number }) ??
              { wallNormal: [0, 0, -1] as [number, number, number], wallPosition: 0 };
            const wallWidth = Number(itemData.wall_width ?? sd?.wall_width ?? 4);
            const wallHeight = Number(itemData.wall_height ?? sd?.wall_height ?? 2.5);
            const wallpaper = new WallpaperItem(
              itemId,
              itemData.name,
              itemData.model_id ?? 0,
              wallWidth,
              wallHeight,
              wallPlacement,
              itemData.image as string,
              {
                description: itemData.description,
                category: itemData.category,
                type: itemData.type,
              },
              {
                position: interp.position,
                rotation: interp.rotation,
                scale: 1,
              },
            );
            await this.sceneManager.addFurniture(wallpaper);
            const cutouts = itemData.wallpaper_cutouts as
              | { x: number; y: number; width: number; height: number }[]
              | undefined;
            if (Array.isArray(cutouts) && cutouts.length > 0) {
              wallpaper.applyCutouts(cutouts);
            }
            if (sd) {
              const snapshot: Record<string, unknown> = {
                ...sd,
                wall_width: wallWidth,
                wall_height: wallHeight,
              };
              if (cutouts?.length) snapshot.wallpaper_cutouts = cutouts;
              this.sceneManager.registerDeployedSpatialSnapshot(itemId, snapshot);
            }
            continue;
          }

          const modelPath = this.modelUrlCache.get(itemData.model_id);
          if (!modelPath) continue;

          const metadata: FurnitureMetadata = {
            description: itemData.description,
            category: itemData.category,
            type: itemData.type,
            isContainer: itemData.is_container,
            wallMountable: itemData.wall_mountable || false,
          };

          const sd = itemData.spatialData;
          const interp = this.sceneManager.interpretSpatialDataForLoad(
            sd as Record<string, unknown> | undefined,
          );
          const furniture = new FurnitureItem(
            itemId,
            itemData.name,
            itemData.model_id,
            modelPath,
            metadata,
            {
              position: interp.position,
              rotation: interp.rotation,
              scale: sd.scale[0],
            },
          );

          const placementMode = normalizePlacementMode(sd?.placement_mode);
          const shouldBeWallMounted =
            placementMode === "wall" ||
            Boolean(sd?.wall_placement) ||
            Boolean(sd?.wall_side_id) ||
            Boolean(interp.wallPlacement);

          if (shouldBeWallMounted) {
            const wp =
              coerceWallPlacement(interp.wallPlacement) ??
              coerceWallPlacement(sd?.wall_placement) ??
              getWallPlacementFromRoomBoundarySideId(sd?.wall_side_id) ??
              null;
            if (wp) furniture.setWallPlacement(wp);
            else furniture.setPlacementMode("wall");
          }

          maybeMountWallIfCloseToBoundary(furniture, interp.position);

          await this.sceneManager.addFurniture(furniture);
          if (sd) {
            this.sceneManager.registerDeployedSpatialSnapshot(
              itemId,
              sd as Record<string, unknown>,
            );
          }
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
      showUnmountPanel: false,
      showPreciseCheckPanel: false,
      notificationMessage: message,
      notificationType: type,
      notificationFromControlPanel: fromControlPanel,
      showNotification: true,
    });
  }

  handleToggleUI(): void {
    const { showMoveCloserPanel, showUnmountPanel, showPreciseCheckPanel, showControlPanel, showInstructions, showFurniture, selectedItemId, experienceMode } = this.state;

    if (showMoveCloserPanel || showUnmountPanel || showPreciseCheckPanel || experienceMode) return;

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
  
  private restoreHomeAndFurnitureToBaselineForRealignment(): void {
    if (
      !this.sceneManager ||
      !this.homeGroupSnapshotBeforeFirstAlignment
    ) {
      return;
    }
    this.sceneManager.restorePreAlignmentBaseline(
      this.homeGroupSnapshotBeforeFirstAlignment,
      this.lastCompletedAlignmentDelta,
    );
    this.lastCompletedAlignmentDelta = null;
    this.navigationController?.resetAlignment();
  }

  handleAlignmentModeSelect(mode: "world" | "free"): void {
    if (mode === "world") {
      const state = this.xrStore?.getState();
      if (state?.session && state?.mode === 'immersive-vr') {
          this.skipAlignmentSessionSwap = false;
          this.xrStore.setState({ mode: "immersive-ar" });
      } else {
        this.skipAlignmentSessionSwap = this.state.alignmentStatus === "aligned";
      }

      // model in VR mode
      const homeModel = this.sceneManager?.getHomeModel();
      if (homeModel) {
        homeModel.setOpacity(1.0);
        homeModel.setVisible(true);
      }
      
      // Initialize automatic alignment
      if (this.navigationController && homeModel) {
        const modelGroup = homeModel.getGroup();
        if (!modelGroup) {
          console.error('Model group not available');
          return;
        }

        if (this.skipAlignmentSessionSwap) {
          this.restoreHomeAndFurnitureToBaselineForRealignment();
        }

        if (!this.homeGroupSnapshotBeforeFirstAlignment) {
          modelGroup.updateMatrixWorld(true);
          this.homeGroupSnapshotBeforeFirstAlignment = {
            position: modelGroup.position.clone(),
            quaternion: modelGroup.quaternion.clone(),
            scale: modelGroup.scale.clone(),
          };
        }

        this.navigationController.setHomeModelGroup(modelGroup);
        const boundingBox = new THREE.Box3().setFromObject(modelGroup);
        if (boundingBox.isEmpty()) {
          console.warn('Bounding box is empty, waiting for model to load...');
          setTimeout(() => {
            const retryBox = new THREE.Box3().setFromObject(modelGroup);
            if (!retryBox.isEmpty()) {
              this.navigationController?.setBoundingBox(retryBox);
            }
          }, 500);
        } else {
          this.navigationController.setBoundingBox(boundingBox);
        }

        modelGroup.updateMatrixWorld(true);
        this.homeWorldMatrixBeforeAlignment = modelGroup.matrixWorld.clone();

        this.navigationController.setAlignmentCallbacks(
          (state, _data) => {
            void _data;
            this.updateState({ alignmentState: state });

            if (state === 'selectingCorner') {
              if (homeModel) {
                homeModel.setVisible(true);
                homeModel.setOpacity(1.0);
                homeModel.setTransparent(false);
              }
              this.cornerSelectionReady = false;
              this.updateState({
                showCornerSelection: true,
                showHeadTrackingAlignment: false,
                showControlPanel: false,
                homeTransparent: false,
              });
              setTimeout(() => {
                this.cornerSelectionReady = true;
              }, 500);
            } else if (state === 'aligningFirstCorner') {
              this.alignmentReady = false;
              
              if (homeModel) {
                homeModel.setVisible(false);
              }

              const skipAR = this.skipAlignmentSessionSwap;
              this.updateState({
                showCornerSelection: false,
                showHeadTrackingAlignment: true,
                showControlPanel: false,
                homeTransparent: !skipAR,
                alignmentARModeRequested: !skipAR,
              });
              
              if (skipAR) {
                setTimeout(() => {
                  this.alignmentReady = true;
                }, 150);
              } else if (this.xrStore) {
                const checkARSession = setInterval(() => {
                  const session = this.xrStore?.getState()?.session;
                  if (session && (session as any).mode === 'immersive-ar') {
                    this.alignmentReady = true;
                    clearInterval(checkARSession);
                  }
                }, 100);
                
                setTimeout(() => {
                  clearInterval(checkARSession);
                  if (!this.alignmentReady) {
                    console.warn('AR session not detected after timeout, enabling alignment anyway');
                    this.alignmentReady = true;
                  }
                }, 5000);
              } else {
                setTimeout(() => {
                  this.alignmentReady = true;
                }, 1000);
              }
            } else if (state === 'aligningSecondCorner') {
              this.alignmentReady = false;
              setTimeout(() => {
                this.alignmentReady = true;
              }, 800);
              this.updateState({ 
                showHeadTrackingAlignment: true,
                showControlPanel: false,
                alignmentARModeRequested: !this.skipAlignmentSessionSwap,
              });
            } else if (state === 'aligningThirdCorner') {
              this.alignmentReady = false;
              setTimeout(() => {
                this.alignmentReady = true;
              }, 800);
              this.updateState({ 
                showHeadTrackingAlignment: true,
                showControlPanel: false,
                alignmentARModeRequested: !this.skipAlignmentSessionSwap,
              });
            } else if (state === 'aligningFourthCorner') {
              this.alignmentReady = false;
              setTimeout(() => {
                this.alignmentReady = true;
              }, 800);
              this.updateState({ 
                showHeadTrackingAlignment: true,
                showControlPanel: false,
                alignmentARModeRequested: !this.skipAlignmentSessionSwap,
              });
            } else if (state === 'completed') {
              this.sceneManager?.updateRoomBoundaryFromHomeModel();
              const switchToVR = async () => {
                const currentSession = this.xrStore?.getState()?.session;
                
                if (currentSession && (currentSession as any).mode === 'immersive-ar') {
                  try {
                    await currentSession.end();
                    await new Promise(resolve => setTimeout(resolve, 800));
                  } catch (err: any) {
                    console.warn('Error ending AR session:', err);
                  }
                }
                
                try {
                  if (navigator.xr && (navigator.xr as any).isSessionSupported) {
                    const isVRSupported = await (navigator.xr as any).isSessionSupported('immersive-vr');
                    if (isVRSupported) {
                      await this.xrStore.enterVR();
                    } else {
                      console.warn('VR not supported');
                    }
                  }
                } catch (vrErr) {
                  console.warn('Failed to enter VR mode:', vrErr);
                }
              };
              
              if (!this.skipAlignmentSessionSwap) {
                switchToVR();
              }
              this.skipAlignmentSessionSwap = false;
              
              // Show model with new alignment
              if (homeModel) {
                homeModel.setVisible(true);
                homeModel.setOpacity(1.0);
                homeModel.setTransparent(false);
              }
              
              this.updateState({
                alignmentStatus: "aligned",
                showHeadTrackingAlignment: false,
                showCornerSelection: false,
                showControlPanel: false,
                showInstructions: false,
                showSidebar: true,
                showAlignmentConfirm: true,
                alignmentARModeRequested: false,
                homeTransparent: false,
                waitingForAlignmentConfirmation: true,
              });
              
              this.showNotificationMessage(
                '✅ Alignment complete! Please confirm the position.',
                'success'
              );
            }
          },
          (_transform) => {
            void _transform;
            homeModel.syncTransformFromGroup();
            const g = homeModel.getGroup();
            g.updateMatrixWorld(true);
            const newM = g.matrixWorld.clone();
            const oldM = this.homeWorldMatrixBeforeAlignment;
            if (oldM) {
              this.lastCompletedAlignmentDelta = new THREE.Matrix4().multiplyMatrices(
                newM,
                new THREE.Matrix4().copy(oldM).invert(),
              );
            }
            if (oldM && this.sceneManager) {
              void this.sceneManager.onHomeAlignmentFinished(oldM, newM);
            }
            this.homeWorldMatrixBeforeAlignment = null;
          }
        );
        
        this.prevTriggerState.clear();
        this.cornerSelectionReady = false;

        this.updateState({
          alignmentMode: "world",
          alignmentStatus: "aligning",
          showAlignmentPanel: false,
          showAlignmentConfirm: false,
          showControlPanel: false,
          showCornerSelection: true,
          showHeadTrackingAlignment: false,
          alignmentState: 'selectingCorner',
          homeTransparent: false,
        });
        
        this.navigationController.startAutomaticAlignment();
      } else {
        const hm = this.sceneManager?.getHomeModel();
        if (hm) {
          const mg = hm.getGroup();
          mg.updateMatrixWorld(true);
          this.homeWorldMatrixBeforeAlignment = mg.matrixWorld.clone();
        }
        this.updateState({
          alignmentMode: "world",
          alignmentStatus: "aligning",
          showAlignmentPanel: false,
          showAlignmentConfirm: false,
          showControlPanel: false,
          showCornerSelection: true,
          showHeadTrackingAlignment: false,
          alignmentState: 'selectingCorner',
          homeTransparent: false,
        });
      }
    } else {
      this.homeWorldMatrixBeforeAlignment = null;
      if (this.state.homeTransparent) {
        this.sceneManager?.getHomeModel()?.setOpacity(0.0);
      }
      this.updateState({
        alignmentMode: "free",
        alignmentStatus: "aligned",
        showAlignmentPanel: false,
        showAlignmentConfirm: false,  
        showInstructions: false,
        waitingForAlignmentConfirmation: false,
        navigationMode: false,
        showSidebar: true,
      });
    }
  }

  // switch to manual alignment mode
  handleManualAlignCancel(): void {
    this.skipAlignmentSessionSwap = false;
    if (this.navigationController) {
      this.navigationController.resetAlignment();
    }

    const homeModel = this.sceneManager?.getHomeModel();
    if (homeModel) {
      const g = homeModel.getGroup();
      g.updateMatrixWorld(true);
      this.homeWorldMatrixBeforeAlignment = g.matrixWorld.clone();
      homeModel.setOpacity(0.5);
    }

    this.updateState({
      alignmentMode: "world",
      alignmentStatus: "aligning",
      alignmentState: 'idle',
      waitingForAlignmentConfirmation: false,
      showAlignmentConfirm: false,
      legacyManualAlignment: true,
    });

    this.showNotificationMessage(
      'Use grip to position the model. Close when done.',
      'info'
    );
  }

  handleLegacyAlignmentConfirm(): void {
    const homeModel = this.sceneManager?.getHomeModel();
    if (homeModel) {
      homeModel.syncTransformFromGroup();
      const g = homeModel.getGroup();
      g.updateMatrixWorld(true);
      const newM = g.matrixWorld.clone();
      const oldM = this.homeWorldMatrixBeforeAlignment;
      if (oldM) {
        this.lastCompletedAlignmentDelta = new THREE.Matrix4().multiplyMatrices(
          newM,
          new THREE.Matrix4().copy(oldM).invert(),
        );
      }
      if (oldM && this.sceneManager) {
        void this.sceneManager.onHomeAlignmentFinished(oldM, newM);
      }
      this.homeWorldMatrixBeforeAlignment = null;
    }
    this.sceneManager?.updateRoomBoundaryFromHomeModel();
    const currentSession = this.xrStore?.getState()?.session;
    const isAR = currentSession && (currentSession as any).mode === 'immersive-ar';

    if (homeModel) {
      homeModel.setOpacity(isAR ? 0.0 : 1.0);
      if (isAR) {
        homeModel.setTransparent(true);
      } else {
        homeModel.setTransparent(false);
      }
    }

    this.updateState({
      alignmentStatus: "aligned",
      legacyManualAlignment: false,
      showNotification: false,
      notificationFromControlPanel: false,
      showAlignmentConfirm: false,
      showInstructions: true,
      showSidebar: true,
      alignmentARModeRequested: isAR,
      homeTransparent: isAR,
    });

    if (this.pendingARAfterAlignment) {
      this.pendingARAfterAlignment = false;
      void this.applyHomeTransparentXR(true);
    }
  }

  handleAlignmentCancel(): void {
    this.skipAlignmentSessionSwap = false;
    this.pendingARAfterAlignment = false;
    this.homeWorldMatrixBeforeAlignment = null;
    // Cleanup hit test source
    if (this.navigationController) {
      this.navigationController.resetAlignment();
    }
    
    // Reset to initial state
    if (this.state.homeTransparent) {
      this.sceneManager?.getHomeModel()?.setOpacity(0.0);
    }
    
    // End AR session if active
    const currentSession = this.xrStore?.getState()?.session;
    if (currentSession && (currentSession as any).mode === 'immersive-ar') {
      currentSession.end().catch((err: any) => {
        console.warn('Error ending AR session:', err);
      });
    }
    
    this.updateState({
      alignmentMode: null,
      alignmentStatus: "pending",
      showAlignmentConfirm: false,
      showAlignmentPanel: true,
      showCornerSelection: false,
      showHeadTrackingAlignment: false,
      alignmentState: 'idle',
      alignmentARModeRequested: false,
      legacyManualAlignment: false,
    });
  }

  handleCornerSelect(cornerIndex: number): void {
    if (!this.cornerSelectionReady) {
      return;
    }
    
    if (this.navigationController) {
      this.navigationController.selectCorner(cornerIndex);
    }
    this.cornerSelectionReady = false;
    this.updateState({
      showCornerSelection: false,
    });
  }

  handleConfirmAlignmentPoint(): void {
    if (!this.navigationController) return;
  }

  handleToggleAlignmentMode(): void {
    if (this.state.alignmentStatus === "aligned" && this.state.alignmentMode === "world") {
      if (this.state.homeTransparent) {
        this.sceneManager?.getHomeModel()?.setOpacity(0.0);
      }
      this.handleAlignmentModeSelect("free");
    } else if (this.state.alignmentStatus === "aligned" && this.state.alignmentMode === "free") {
      this.handleAlignmentModeSelect("world");
    }
  }

  getSessionMode(): 'vr' | 'ar' | null {
    return this.state.immersiveSessionKind;
  }

  getPendingARAfterAlignment(): boolean {
    return this.pendingARAfterAlignment;
  }

  setPendingARAfterAlignment(pending: boolean): void {
    this.pendingARAfterAlignment = pending;
  }

  public async applyHomeTransparentXR(newTransparent: boolean): Promise<void> {
    const homeModel = this.sceneManager?.getHomeModel();
    if (!homeModel) return;

    if (newTransparent && this.xrStore) {
      try {
        if (navigator.xr && (navigator.xr as any).isSessionSupported) {
          const isARSupported = await (navigator.xr as any).isSessionSupported('immersive-ar');

          if (isARSupported) {
            const currentSession = this.xrStore.getState().session;
            if (currentSession && (currentSession as any).mode !== 'immersive-ar') {
              const session = await (navigator.xr as any).requestSession('immersive-ar', {
                requiredFeatures: ['local-floor'],
                optionalFeatures: ['bounded-floor', 'hand-tracking', 'layers'],
              });

              await currentSession.end();
              const gl = this.xrStore.getState().gl;
              if (gl && gl.xr) {
                await gl.xr.setSession(session);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to switch to AR mode:', err);
      }
    } else if (!newTransparent && this.xrStore) {
      try {
        const currentSession = this.xrStore.getState().session;
        if (currentSession && (currentSession as any).mode === 'immersive-ar') {
          await currentSession.end();
          await new Promise((resolve) => setTimeout(resolve, 500));
          await this.xrStore.enterVR();
        }
      } catch (err) {
        console.warn('Failed to switch to VR mode:', err);
      }
    }

    homeModel.setTransparent(newTransparent);
    this.updateState({ homeTransparent: newTransparent });
  }

  async handleToggleHomeTransparency(): Promise<void> {
    const homeModel = this.sceneManager?.getHomeModel();
    if (!homeModel) return;

    const newTransparent = !this.state.homeTransparent;
    if (
      newTransparent &&
      this.state.alignmentMode === 'free' &&
      this.state.alignmentStatus === 'aligned'
    ) {
      this.pendingARAfterAlignment = true;
      this.updateState({ showControlPanel: false });
      this.handleAlignmentModeSelect('world');
      return;
    }
    await this.applyHomeTransparentXR(newTransparent);
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
        showControlPanel: false,
        showSidebar: true,
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
    const { showMoveCloserPanel, showUnmountPanel, showPreciseCheckPanel, showControlPanel } =
      this.state;

    if (showMoveCloserPanel || showUnmountPanel || showPreciseCheckPanel) return;

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
      showUnmountPanel: false,
      showPreciseCheckPanel: false,
    });
  }

  handleSidebarItemSelect(itemId: string): void {
    if (
      this.state.experienceMode &&
      itemId !== "settings" &&
      itemId !== "avatar"
    ) {
      return;
    }

    if (this.state.sidebarActiveItem === itemId) {
    this.updateState({
      sidebarActiveItem: null,
      showFurniture: false,
      showControlPanel: false,
      showTransformGizmo: false,
      gizmoPosition: null,
      showRotationGizmo: false,
      rotationGizmoPosition: null,
      showScalePanel: false,
      showWallPanel: false,
      showTexturePanel: false,
      showEnvironmentPanel: false,
      showSlider: false,
      showInstructions: false,
    });
    return; 
  }

    this.updateState({ sidebarActiveItem: itemId });

    switch (itemId) {
      case "movement":
        if (this.state.selectedItemId) {
          const furniture = this.sceneManager?.getFurniture(this.state.selectedItemId);
          if (furniture?.isWallpaper?.()) break;
        }
        this.updateState({
          showInstructions: false,
          showFurniture: false,
          showControlPanel: false,
          showSlider: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showWallPanel: false,
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
          if (furniture?.isWallpaper?.()) break;
          if (furniture) {
            this.updateState({
              showRotationGizmo: true,
              rotationGizmoPosition: furniture.getPosition(),
              showFurniture: false,
              showControlPanel: false,
              showTransformGizmo: false,
              showSlider: false,
              showScalePanel: false,
              showWallPanel: false,
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
              showWallPanel: false,
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

      case "wall":
        this.updateState({
          showWallPanel: true,
          showScalePanel: false,
          showTransformGizmo: false,
          showRotationGizmo: false,
          showFurniture: false,
          showControlPanel: false,
          showSlider: false,
          showTexturePanel: false,
          showEnvironmentPanel: false,
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

    case "avatar":
      if (this.state.showAvatarMode) {
        // Deactivate avatar mode
        this.navigationController?.setEnabled(true);
        this.updateState({
          showAvatarMode: false,
          sidebarActiveItem: null,
        });
      } else {
        this.navigationController?.setEnabled(false);
        const savedAvatarIdx = parseInt(localStorage.getItem("selectedAvatarIndex") ?? "4", 10);

        let spawnPos: [number, number, number] | null = null;
        let homeModelGroup: THREE.Group | null = null;
        const homeModel = this.sceneManager?.getHomeModel();
        if (homeModel) {
          const group = homeModel.getGroup();
          if (group) {
            const bbox = new THREE.Box3().setFromObject(group);
            if (!bbox.isEmpty()) {
              const center = new THREE.Vector3();
              bbox.getCenter(center);
              spawnPos = [center.x, 0, center.z];
              homeModelGroup = group;
            }
          }
        }

        this.updateState({
          showAvatarMode: true,
          avatarSpawnPosition: spawnPos,
          avatarHomeModelGroup: homeModelGroup,
          selectedAvatarIndex: savedAvatarIdx,
          showFurniture: false,
          showControlPanel: false,
          showSlider: false,
          showInstructions: false,
          showTransformGizmo: false,
          showRotationGizmo: false,
          showScalePanel: false,
          showTexturePanel: false,
          showEnvironmentPanel: false,
          showWallPanel: false,
        });
      }
      break;
  }
}
  async handleSaveScene(): Promise<void> {
    if (this.state.saving || !this.sceneManager) return;

    this.updateState({ saving: true });
    try {
      this.sceneManager.getHomeModel()?.syncTransformFromGroup();
      const sceneData = this.sceneManager.serializeScene();
      const deployedForSave = await compressWallpaperEntriesInDeployedItems(
        sceneData.deployedItems as Record<string, unknown>,
      );

      const formData = new FormData();
      formData.append("id", this.homeId);
      formData.append("deployedItems", JSON.stringify(deployedForSave));

      const home = sceneData.home as Record<string, unknown> | null | undefined;
      if (home) {
        const pos = home.position as [number, number, number] | undefined;
        const spatialPayload = {
          positions: pos ? [pos[0], pos[1], pos[2]] : [0, 0, 0],
          rotation: home.rotation,
          scale: home.scale,
          boundary: home.boundary,
        };
        formData.append("spatial_data", JSON.stringify(spatialPayload));
      }

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
    if (this.state.preciseCheckInProgress || this.state.awaitingCollisionAck || this.state.showPreciseCheckPanel) return;

    const furniture = this.sceneManager.getFurniture(id);
    if (!furniture || furniture.isWallpaper?.()) return;

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

    if (result.success && result.needsConfirmation) {
      if (!this.state.showMoveCloserPanel) {
        this.pendingMove = [...currentPos] as [number, number, number];
        this.updateState({ showMoveCloserPanel: true });
      }
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
      if (this.state.showMoveCloserPanel) {
        this.updateState({ showMoveCloserPanel: false });
        this.pendingMove = null;
      }
      if (this.state.selectedItemId === id) {
        const updatedFurniture = this.sceneManager.getFurniture(id);
        if (updatedFurniture?.isOnWall()) {
          this.updateState({ selectedItemPlacementMode: "wall" });
        }
      }
    }
    if (result.success) {
      this.sceneManager.refreshDeployedSpatialSnapshotFromLive(id);
    }
  }

  private async handleWallFurnitureMove(
    id: string,
    deltaVertical: number,
    deltaHorizontal: number,
  ): Promise<void> {
    if (!this.sceneManager) return;
    if (this.state.preciseCheckInProgress || this.state.awaitingCollisionAck || this.state.showPreciseCheckPanel) return;

    const furniture = this.sceneManager.getFurniture(id);
    if (!furniture || !furniture.isOnWall()) return;
    if (furniture.isWallpaper?.()) return;

    const result = await this.sceneManager.moveWallFurniture(
      id,
      deltaVertical,
      deltaHorizontal,
    );

    if (result.success && result.needsConfirmation) {
      if (!this.state.showMoveCloserPanel) {
        const preMovePosForWall = this.sceneManager.getLastValidPosition(id);
        this.pendingMove = preMovePosForWall ? [...preMovePosForWall] as [number, number, number] : furniture.getPosition();
        this.updateState({ showMoveCloserPanel: true });
      }
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
    if (result.success) {
      this.sceneManager.refreshDeployedSpatialSnapshotFromLive(id);
    }
  }

  private handleFurnitureRotate(id: string, deltaY: number): void {
    if (!this.sceneManager) return;

    const furniture = this.sceneManager.getFurniture(id);
    if (!furniture || furniture.isWallpaper?.()) return;

    const currentRot = furniture.getRotation();
    const newRot: [number, number, number] = [
      currentRot[0],
      currentRot[1] + deltaY,
      currentRot[2],
    ];

    this.sceneManager.rotateFurniture(id, newRot);
    this.sceneManager.refreshDeployedSpatialSnapshotFromLive(id);

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

  handleConfirmMoveCloser(): void {
    if (!this.state.selectedItemId || !this.sceneManager) return;

    const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
    if (!furniture) return;

    this.currentAABBPosition = furniture.getPosition();
    this.updateState({ showMoveCloserPanel: false, showPreciseCheckPanel: true, showControlPanel: false });
  }

  handleCancelMoveCloser(): void {
    if (this.state.selectedItemId && this.sceneManager && this.pendingMove) {
      const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
      if (furniture) {
        furniture.setPosition(this.pendingMove);
        const collisionDetector = this.sceneManager.getCollisionDetector();
        collisionDetector.updateFurnitureBox(
          this.state.selectedItemId,
          furniture.getGroup(),
          furniture.getModelId(),
        );
        furniture.setCollision(false);
        this.sceneManager.refreshDeployedSpatialSnapshotFromLive(this.state.selectedItemId);
        this.updateState({ showMoveCloserPanel: false, gizmoPosition: this.pendingMove });
      } else {
        this.updateState({ showMoveCloserPanel: false });
      }
    } else {
      this.updateState({ showMoveCloserPanel: false });
    }
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
        if (this.pendingMove) {
          const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
          if (furniture) {
            furniture.setPosition(this.pendingMove);
            const collisionDetector = this.sceneManager.getCollisionDetector();
            collisionDetector.updateFurnitureBox(
              this.state.selectedItemId,
              furniture.getGroup(),
              furniture.getModelId(),
            );
            furniture.setCollision(false);
            this.sceneManager.refreshDeployedSpatialSnapshotFromLive(this.state.selectedItemId);
            this.updateState({ gizmoPosition: this.pendingMove });
          }
        }
        this.showNotificationMessage(
          "⚠️ Precise overlap detected! Furniture moved back to safe position.",
          "error",
        );
        this.currentAABBPosition = null;
        this.pendingMove = null;
      } else {
        this.sceneManager.refreshDeployedSpatialSnapshotFromLive(
          this.state.selectedItemId,
        );
        this.showNotificationMessage(
          "✅ Position validated! Furniture can stay here.",
          "success",
        );
        this.pendingMove = null;
      }
    } catch (error) {
      console.error("Error during precise collision check:", error);
      this.showNotificationMessage(
        "❌ Error checking collision. Please try again.",
        "error",
      );
    } finally {
      this.updateState({ preciseCheckInProgress: false, awaitingCollisionAck: true });
    }
  }

  handleCancelPreciseCheck(): void {
    if (!this.state.selectedItemId || !this.sceneManager) return;

    if (this.pendingMove) {
      const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
      if (furniture) {
        furniture.setPosition(this.pendingMove);
        const collisionDetector = this.sceneManager.getCollisionDetector();
        collisionDetector.updateFurnitureBox(
          this.state.selectedItemId,
          furniture.getGroup(),
          furniture.getModelId(),
        );
        furniture.setCollision(false);
      }
      this.sceneManager.refreshDeployedSpatialSnapshotFromLive(this.state.selectedItemId);
      this.updateState({ showPreciseCheckPanel: false, gizmoPosition: this.pendingMove });
    } else {
      this.updateState({ showPreciseCheckPanel: false });
    }

    this.currentAABBPosition = null;
    this.pendingMove = null;
  }

  handleSelectFurniture(f: any, camera: THREE.Camera): void {
    if (!this.sceneManager || this.state.alignmentStatus !== "aligned" || this.state.experienceMode) return;

    const catalogId = f.id;
    const allFurniture = this.sceneManager.getAllFurniture();

    const getPlacedCatalogId = (itemId: string) =>
      itemId.replace(/-\d+$/, "") || itemId;
    const existingFurniture = allFurniture.find((item) => {
      if (catalogId === "sys-widget-weather" && item.getMetadata?.().type === "weather_widget") return true;
      return getPlacedCatalogId(item.getId()) === catalogId;
    });

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

    if (f.widgetType === "weather") {
      const widget = new WeatherWidget(uniqueId, {
        position: spawnPos,
        rotation: initialRotation,
        scale: this.state.sliderValue,
      });
      widget.setScale(this.state.sliderValue);

      this.sceneManager.addFurniture(widget).then(() => {
        this.sceneManager!.selectFurniture(uniqueId);
        this.furnitureController?.setSelectedFurniture(uniqueId);
        this.updateState({
          selectedItemId: uniqueId,
          rotationValue: initialRotation[1],
          showSlider: true,
          selectedItemPlacementMode: "floor",
        });
      });
      return;
    }

    // Wallpaper selection panel trigger
    const isWallpaper = (f.category?.toLowerCase() === 'wallpaper' || f.type?.toLowerCase() === 'wallpaper');
    if (isWallpaper) {
      const walls = this.sceneManager.getAvailableWalls();
      if (walls.length === 0) {
        this.showNotificationMessage("No walls available in this home", "error");
        return;
      }
      if (!f.image) {
        this.showNotificationMessage("Wallpaper has no image", "error");
        return;
      }
      this.updateState({
        showWallSelectionPanel: true,
        pendingWallpaperItem: {
          id: f.id,
          name: f.name,
          model_id: f.model_id ?? 0,
          image: f.image,
          description: f.description,
          category: f.category ?? 'wallpaper',
          type: f.type ?? 'wallpaper',
        },
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

  handleSelectWallForWallpaper(wall: WallInfo): void {
    const pending = this.state.pendingWallpaperItem;
    if (!pending || !this.sceneManager) return;

    const uniqueId = `${pending.id}-${Date.now()}`;
    const wallPlacement = {
      wallNormal: wall.wallNormal,
      wallPosition: wall.wallPosition,
    };

    const wallpaper = new WallpaperItem(
      uniqueId,
      pending.name,
      pending.model_id,
      wall.width,
      wall.height,
      wallPlacement,
      pending.image,
      {
        description: pending.description,
        category: pending.category,
        type: pending.type,
      },
      {
        position: wall.center,
        rotation: [0, 0, 0],
        scale: 1,
      }
    );

    this.sceneManager.addFurniture(wallpaper).then(() => {
      this.sceneManager!.selectFurniture(uniqueId);
      this.furnitureController?.setSelectedFurniture(uniqueId);
      this.updateState({
        selectedItemId: uniqueId,
        showSlider: false,
        selectedItemPlacementMode: 'wall',
        showWallSelectionPanel: false,
        pendingWallpaperItem: null,
        wallpaperCutoutState: { wallpaperId: uniqueId, step: 'prompt', lassoRegions: [] },
      });
      this.showNotificationMessage("Wallpaper added!", "success");
    });
  }

  handleCancelWallSelection(): void {
    this.updateState({
      showWallSelectionPanel: false,
      pendingWallpaperItem: null,
    });
  }

  handleWallpaperCutoutYes(): void {
    const cutout = this.state.wallpaperCutoutState;
    if (!cutout || !this.sceneManager) return;
    const wallpaper = this.sceneManager.getFurniture(cutout.wallpaperId) as WallpaperItem | undefined;
    if (wallpaper?.isWallpaper?.()) {
      wallpaper.setMaterialOpacity(0.5);
      this.updateState({
        wallpaperCutoutState: { ...cutout, step: 'drawing' },
      });
    }
  }

  handleWallpaperCutoutNo(): void {
    this.updateState({
      wallpaperCutoutState: null,
      lassoStart: null,
      lassoPreview: null,
      isLassoDrawing: false,
    });
  }

  handleWallpaperCutoutUndo(): void {
    const cutout = this.state.wallpaperCutoutState;
    if (!cutout || cutout.lassoRegions.length === 0) return;
    const next = cutout.lassoRegions.slice(0, -1);
    this.updateState({
      wallpaperCutoutState: { ...cutout, lassoRegions: next },
    });
  }

  handleWallpaperCutoutConfirm(): void {
    const cutout = this.state.wallpaperCutoutState;
    if (!cutout || !this.sceneManager) return;
    const wallpaper = this.sceneManager.getFurniture(cutout.wallpaperId) as WallpaperItem | undefined;
    if (wallpaper?.isWallpaper?.()) {
      if (cutout.lassoRegions.length > 0) {
        wallpaper.applyCutouts(cutout.lassoRegions);
      }
      wallpaper.setMaterialOpacity(1);
    }
    this.updateState({
      wallpaperCutoutState: null,
      lassoStart: null,
      lassoPreview: null,
      isLassoDrawing: false,
    });
    this.showNotificationMessage("Cut-outs applied.", "success");
  }

  handleWallpaperLassoPoint(localPoint: { x: number; y: number }): void {
    const cutout = this.state.wallpaperCutoutState;
    if (!cutout || cutout.step !== 'drawing') return;
    const first = this.state.lassoStart;
    if (first == null) {
      this.updateState({
        lassoStart: { x: localPoint.x, y: localPoint.y },
        isLassoDrawing: true,
        lassoPreview: { x: localPoint.x, y: localPoint.y, width: 0, height: 0 },
      });
    } else {
      const x = Math.min(first.x, localPoint.x);
      const y = Math.min(first.y, localPoint.y);
      const width = Math.abs(localPoint.x - first.x);
      const height = Math.abs(localPoint.y - first.y);
      const minSize = 0.05;
      const newRegion = width >= minSize && height >= minSize ? { x, y, width, height } : null;
      this.updateState({
        lassoStart: null,
        isLassoDrawing: false,
        lassoPreview: null,
        wallpaperCutoutState: newRegion
          ? { ...cutout, lassoRegions: [...cutout.lassoRegions, newRegion] }
          : cutout,
      });
    }
  }

  handleWallpaperLassoPointerDown(e: any, furniture: FurnitureItem): void {
    const cutout = this.state.wallpaperCutoutState;
    if (!cutout || cutout.step !== 'drawing' || cutout.wallpaperId !== furniture.getId()) return;
    const wallpaper = furniture as WallpaperItem;
    const plane = wallpaper.getPlaneMesh();
    if (!plane) return;
    const local = new THREE.Vector3().copy(e.point);
    plane.worldToLocal(local);
    e.stopPropagation();
    if (e.target?.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    this.updateState({
      lassoStart: { x: local.x, y: local.y },
      isLassoDrawing: true,
      lassoPreview: null,
    });
  }

  handleWallpaperLassoPointerMove(e: any, furniture: FurnitureItem): void {
    if (!this.state.isLassoDrawing || this.state.lassoStart == null) return;
    const cutout = this.state.wallpaperCutoutState;
    if (!cutout || cutout.wallpaperId !== furniture.getId()) return;
    const wallpaper = furniture as WallpaperItem;
    const plane = wallpaper.getPlaneMesh();
    if (!plane) return;
    const local = new THREE.Vector3().copy(e.point);
    plane.worldToLocal(local);
    const start = this.state.lassoStart;
    const x = Math.min(start.x, local.x);
    const y = Math.min(start.y, local.y);
    const width = Math.abs(local.x - start.x);
    const height = Math.abs(local.y - start.y);
    this.updateState({
      lassoPreview: { x, y, width, height },
    });
  }

  handleWallpaperLassoPointerUp(e: any, furniture: FurnitureItem): void {
    if (!this.state.isLassoDrawing || this.state.lassoStart == null) return;
    const cutout = this.state.wallpaperCutoutState;
    if (!cutout || cutout.wallpaperId !== furniture.getId()) return;
    const wallpaper = furniture as WallpaperItem;
    const plane = wallpaper.getPlaneMesh();
    if (!plane) return;
    const local = new THREE.Vector3().copy(e.point);
    plane.worldToLocal(local);
    const start = this.state.lassoStart!;
    const x = Math.min(start.x, local.x);
    const y = Math.min(start.y, local.y);
    const width = Math.abs(local.x - start.x);
    const height = Math.abs(local.y - start.y);
    if (e.target?.releasePointerCapture) e.target.releasePointerCapture(e.pointerId);
    const minSize = 0.05;
    const newRegion = width >= minSize && height >= minSize
      ? { x, y, width, height }
      : null;
    this.updateState({
      lassoStart: null,
      isLassoDrawing: false,
      lassoPreview: null,
      wallpaperCutoutState: newRegion
        ? { ...cutout, lassoRegions: [...cutout.lassoRegions, newRegion] }
        : cutout,
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
    const isWallpaper = furniture.isWallpaper?.() ?? false;
    const showMovementGizmo = !isWallpaper && this.state.sidebarActiveItem === 'movement';
    const showRotGizmo = !isWallpaper && this.state.sidebarActiveItem === 'rotation';
    const isTextureMode = this.state.sidebarActiveItem === "texture";
    const isScaleMode = this.state.sidebarActiveItem === "scale";

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
        showWallPanel: false,
        showTexturePanel: false,
        textureOptions: [],
        showScalePanel: isScaleMode, 
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
    const sameBoard = this.state.experienceWhiteboardId === id;
    this.updateState({
      experienceWhiteboardId: id,
      ...(sameBoard ? {} : { whiteboardTool: "pen" }),
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

  recordWhiteboardPointerHit(
    whiteboardId: string,
    worldPoint: THREE.Vector3,
    inputSource: XRInputSource | null,
    geometryUv?: THREE.Vector2 | null,
  ): void {
    this.lastWhiteboardPointerId = whiteboardId;
    if (!this.lastWhiteboardPointerPoint) this.lastWhiteboardPointerPoint = new THREE.Vector3();
    this.lastWhiteboardPointerPoint.copy(worldPoint);
    this.lastWhiteboardPointerInputSource = inputSource;
    this.lastWhiteboardPointerUv = geometryUv ? geometryUv.clone() : null;
  }

  clearWhiteboardPointerHit(): void {
    const wbId = this.state.experienceWhiteboardId;
    if (wbId) {
      const wb = this.sceneManager?.getFurniture(wbId) as WhiteboardWidget | undefined;
      wb?.endStroke();
    }
    this.lastWhiteboardPointerId = null;
    this.lastWhiteboardPointerInputSource = null;
    this.lastWhiteboardPointerUv = null;
    this.lastWhiteboardPointerPoint = null;
  }

  handleGizmoMove(axis: "x" | "y" | "z", delta: number): void {
    if (!this.state.selectedItemId || !this.sceneManager) return;
    if (this.state.preciseCheckInProgress || this.state.awaitingCollisionAck || this.state.showPreciseCheckPanel) return;
    const sceneManager = this.sceneManager;

    const selectedId = this.state.selectedItemId;
    const furniture = sceneManager.getFurniture(selectedId);
    if (!furniture || furniture.isWallpaper?.()) return;
    const currentPos = furniture.getPosition();
    const revertPos: [number, number, number] = [...currentPos];

    const optimisticPos: [number, number, number] = [...currentPos];
    switch (axis) {
      case "x":
        optimisticPos[0] += delta;
        break;
      case "y":
        optimisticPos[1] += delta;
        break;
      case "z":
        optimisticPos[2] += delta;
        break;
    }
    this.updateState({ gizmoPosition: optimisticPos });

    // Wall-mounted Gizmo handling
    if (furniture.isOnWall?.()) {
      const wallPlacement = furniture.getWallPlacement?.();
      if (wallPlacement) {
        const [nx, , nz] = wallPlacement.wallNormal;

        let deltaVertical = 0;
        let deltaHorizontal = 0;
        let deltaInOut = 0;

        if (axis === "y") {
          deltaVertical = delta;
        } else if (axis === "x") {
          if (Math.abs(nx) > Math.abs(nz)) {
            deltaInOut = delta;
          } else {
            deltaHorizontal = delta;
          }
        } else if (axis === "z") {
          if (Math.abs(nz) > Math.abs(nx)) {
            deltaInOut = delta;
          } else {
            deltaHorizontal = delta;
          }
        }

        sceneManager
          .moveWallFurniture(selectedId, deltaVertical, deltaHorizontal, deltaInOut)
          .then((result) => {
            if (result.needsConfirmation) {
              if (!this.state.showMoveCloserPanel) {
                this.pendingMove = revertPos;
                this.updateState({ showMoveCloserPanel: true });
              }
              const updated = sceneManager.getFurniture(selectedId);
              if (updated) {
                this.updateState({ gizmoPosition: updated.getPosition() });
              }
              return;
            }

            if (!result.success) {
              if (result.needsUnmountConfirm) {
                this.updateState({ showUnmountPanel: true });
              }
              this.updateState({ gizmoPosition: revertPos });
              return;
            }

            if (result.success) {
              void sceneManager.refreshDeployedSpatialSnapshotFromLive(selectedId);
              const updated = sceneManager.getFurniture(selectedId);
              if (updated) {
                this.updateState({ gizmoPosition: updated.getPosition() });
              }
            }
          })
          .catch((err) => {
            console.error(`[handleGizmoMove] Wall move error:`, err);
            this.updateState({ gizmoPosition: revertPos });
          });

        return;
      }
    }

    const isInAABBZone = this.currentAABBPosition !== null;

    sceneManager
      .moveFurniture(selectedId, optimisticPos, isInAABBZone, false)
      .then((result) => {
        if (result.success && result.needsConfirmation) {
          // Entered AABB zone — show panel, keep furniture at new position
          if (!this.state.showMoveCloserPanel) {
            this.pendingMove = revertPos;
            this.updateState({ showMoveCloserPanel: true });
          }
          const updated = sceneManager.getFurniture(selectedId);
          if (updated) {
            this.updateState({ gizmoPosition: updated.getPosition() });
          }
          return;
        }

        if (result.success && result.needsPreciseCheck) {
          // Inside AABB zone (skipAABBBlock was true) — prompt for precise check
          this.currentAABBPosition = optimisticPos;
          this.updateState({ showPreciseCheckPanel: true });
          const updated = sceneManager.getFurniture(selectedId);
          if (updated) {
            this.updateState({ gizmoPosition: updated.getPosition() });
          }
          return;
        }

        if (!result.success) {
          if (result.needsUnmountConfirm) {
            this.updateState({ showUnmountPanel: true });
          }
          this.updateState({ gizmoPosition: revertPos });
          return;
        }

        // Successful move to safe (non-AABB) position
        void sceneManager.refreshDeployedSpatialSnapshotFromLive(selectedId);
        const updated = sceneManager.getFurniture(selectedId);
        if (updated) {
          const pos = updated.getPosition();
          if (this.state.showMoveCloserPanel) {
            // Furniture moved back out of AABB zone — dismiss the panel
            this.updateState({ showMoveCloserPanel: false, gizmoPosition: pos });
            this.pendingMove = null;
          } else {
            this.updateState({ gizmoPosition: pos });
          }
        }
      })
      .catch((err) => {
        console.error(`[handleGizmoMove] Error:`, err);
        this.updateState({ gizmoPosition: revertPos });
      });
  }

  handleConfirmUnmount(): void {
    if (!this.state.selectedItemId || !this.sceneManager) return;
    this.sceneManager.unmountFromWallAndFloat(this.state.selectedItemId);
    const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
    this.updateState({
      showUnmountPanel: false,
      gizmoPosition: furniture ? furniture.getPosition() : this.state.gizmoPosition,
      selectedItemPlacementMode: "floor",
    });
  }

  handleCancelUnmount(): void {
    this.updateState({ showUnmountPanel: false });
  }

  async handleWallMoveInOut(deltaInOut: number): Promise<void> {
    if (!this.state.selectedItemId || !this.sceneManager) return;
    const result = await this.sceneManager.moveWallFurniture(
      this.state.selectedItemId,
      0,
      0,
      deltaInOut,
    );
    if (result.needsUnmountConfirm) {
      const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
      if (!furniture?.isWallpaper?.()) {
        this.updateState({ showUnmountPanel: true });
      }
    } else if (result.success) {
      this.sceneManager.refreshDeployedSpatialSnapshotFromLive(
        this.state.selectedItemId,
      );
      const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
      if (furniture) {
        this.updateState({ gizmoPosition: furniture.getPosition() });
      }
    }
  }

  handleGizmoRotate(axis: "x" | "y" | "z", deltaRadians: number): void {
    if (!this.state.selectedItemId || !this.sceneManager) {
      console.warn(`[handleGizmoRotate] Invalid state:`, {
        selectedItemId: this.state.selectedItemId,
        hasSceneManager: !!this.sceneManager,
      });
      return;
    }
    if (this.state.preciseCheckInProgress || this.state.awaitingCollisionAck || this.state.showPreciseCheckPanel || this.state.showMoveCloserPanel) return;

    const furniture = this.sceneManager.getFurniture(this.state.selectedItemId);
    if (furniture?.isWallpaper?.()) return;
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
  this.sceneManager.refreshDeployedSpatialSnapshotFromLive(
    this.state.selectedItemId,
  );

  const twoPi = Math.PI * 2;
  let normalizedRotation = newRot[1] % twoPi;
  if (normalizedRotation < 0) normalizedRotation += twoPi;
  this.updateState({ rotationValue: normalizedRotation });
}

  handleScaleChange(newScale: number): void {
  if (this.state.preciseCheckInProgress || this.state.awaitingCollisionAck || this.state.showPreciseCheckPanel) return;
  const clampedScale = Math.max(0.5, Math.min(3, newScale));
  this.updateState({ sliderValue: clampedScale });

  if (this.state.selectedItemId && this.sceneManager) {
    this.sceneManager.scaleFurniture(this.state.selectedItemId, clampedScale);
    this.sceneManager.refreshDeployedSpatialSnapshotFromLive(
      this.state.selectedItemId,
    );
  }
}

  handleRotationSliderChange(newRotation: number): void {
    if (this.state.preciseCheckInProgress || this.state.awaitingCollisionAck || this.state.showPreciseCheckPanel || this.state.showMoveCloserPanel) return;
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
        this.sceneManager.refreshDeployedSpatialSnapshotFromLive(
          this.state.selectedItemId,
        );
      }
    }
  }

  getPlacedCatalogIds(): string[] {
    if (!this.sceneManager) return [];
    return this.sceneManager
      .getAllFurniture()
      .map((item) => {
        const meta = item.getMetadata?.();
        if (meta?.type === "weather_widget") return "sys-widget-weather";
        const id = item.getId();
        return id.replace(/-\d+$/, "") || id;
      });
  }

  updateFrame(session: any, camera: THREE.Camera, delta: number, frame?: XRFrame, gl?: THREE.WebGLRenderer): void {
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

    // Handle corner selection with head tracking
    if (this.state.showCornerSelection && this.navigationController && this.sceneManager) {
      const homeModel = this.sceneManager.getHomeModel();
      if (homeModel && session.inputSources) {
        const raycaster = new THREE.Raycaster();
        const cameraPosition = new THREE.Vector3();
        camera.getWorldPosition(cameraPosition);
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        raycaster.set(cameraPosition, cameraDirection);

        homeModel.getGroup().updateMatrixWorld(true);
        const cornerEntries = this.navigationController.getModelCornersPublic();

        let closestSemanticCornerIndex = -1;
        let smallestAngle = Infinity;
        const maxAimRad = THREE.MathUtils.degToRad(28);
        cornerEntries.forEach((entry) => {
          const toCorner = entry.position.clone().sub(cameraPosition);
          const dist = toCorner.length();
          if (dist < 1e-4) return;
          toCorner.multiplyScalar(1 / dist);
          const dot = THREE.MathUtils.clamp(cameraDirection.dot(toCorner), -1, 1);
          const angle = Math.acos(dot);
          if (angle < smallestAngle) {
            smallestAngle = angle;
            closestSemanticCornerIndex = entry.index;
          }
        });
        const aimOk = smallestAngle <= maxAimRad;

        if (this.cornerSelectionReady) {
          session.inputSources.forEach((source: any) => {
            const gamepad = source.gamepad;
            if (!gamepad || !gamepad.buttons) return;
            const handedness = source.handedness as string;
            if (!handedness || handedness === 'none') return;
            
            const triggerButton = gamepad.buttons[0];
            const wasPressed = this.prevTriggerState.get(handedness) || false;
            const isPressed = triggerButton?.pressed || false;
            
            this.prevTriggerState.set(handedness, isPressed);
            
            if (isPressed && !wasPressed && aimOk && closestSemanticCornerIndex >= 0) {
              this.handleCornerSelect(closestSemanticCornerIndex);
            }
          });
        }
      }
    }

    if (this.state.showHeadTrackingAlignment && this.navigationController && this.sceneManager) {
      const raycaster = new THREE.Raycaster();
      const homeModel = this.sceneManager.getHomeModel();
      const sceneObjects: THREE.Object3D[] = [];
      if (homeModel) {
        sceneObjects.push(homeModel.getGroup());
      }
      this.sceneManager.getAllFurniture().forEach(f => sceneObjects.push(f.getGroup()));
      
      const xrReferenceSpace = gl?.xr?.getReferenceSpace() || null;
      
      const hitPoint = this.navigationController.updateHeadTrackingAlignment(
        camera,
        session,
        raycaster,
        { children: sceneObjects } as THREE.Scene,
        frame,
        xrReferenceSpace
      );

      let confirmedThisFrame = false;
      if (session.inputSources) {
        const sources = Array.from(session.inputSources as Iterable<any>);
        for (const source of sources) {
          if (confirmedThisFrame) break;
          
          const gamepad = source.gamepad;
          if (!gamepad || !gamepad.buttons) continue;
          const handedness = source.handedness as string;
          if (!handedness || handedness === 'none') continue;

          const triggerButton = gamepad.buttons[0];
          const wasPressed = this.prevTriggerState.get(handedness) || false;
          const isPressed = triggerButton?.pressed || false;
          
          this.prevTriggerState.set(handedness, isPressed);
          
          if (!this.alignmentReady) continue;
          
          if (isPressed && !wasPressed) {
            const alignmentState = this.navigationController?.getAlignmentState();
            
            let confirmPoint = hitPoint;
            if (!confirmPoint) {
              console.warn('Trigger pressed but no hitPoint available - using fallback');
              const cameraPosition = new THREE.Vector3();
              camera.getWorldPosition(cameraPosition);
              const cameraDirection = new THREE.Vector3();
              camera.getWorldDirection(cameraDirection);
              confirmPoint = cameraPosition.clone().addScaledVector(cameraDirection, 3.0);
            }
            
            if (alignmentState === 'aligningFirstCorner' && this.navigationController) {
              this.navigationController.confirmFirstCornerAlignment(confirmPoint);
              confirmedThisFrame = true;
              this.updateState({ showHeadTrackingAlignment: true });
            } else if (alignmentState === 'aligningSecondCorner' && this.navigationController) {
              this.navigationController.confirmSecondCornerAlignment(confirmPoint);
              confirmedThisFrame = true;
            } else if (alignmentState === 'aligningThirdCorner' && this.navigationController) {
              this.navigationController.confirmThirdCornerAlignment(confirmPoint);
              confirmedThisFrame = true;
            } else if (alignmentState === 'aligningFourthCorner' && this.navigationController) {
              this.navigationController.confirmFourthCornerAlignment(confirmPoint);
              confirmedThisFrame = true;
            }
          }
        }
      }
    }

    let whiteboardDrawingThisFrame = false;
    const wbId = this.state.experienceWhiteboardId;
    if (this.state.experienceMode && wbId && this.sceneManager) {
      const wb = this.sceneManager.getFurniture(wbId) as WhiteboardWidget | undefined;
      if (wb) {
        let drawSample: { point: THREE.Vector3; uv: THREE.Vector2 } | null = null;
        let whiteboardPinnedHandOnly = false;
        const boardMesh = wb.getBoardMesh?.();
        const refSpace = this.renderer?.xr?.getReferenceSpace?.() ?? null;
        const xrFrame =
          frame ?? (this.renderer?.xr as THREE.WebXRManager | undefined)?.getFrame?.() ?? null;
        const raycaster = new THREE.Raycaster();
        const rayOrigin = new THREE.Vector3();
        const rayDir = new THREE.Vector3();
        const hitBoardFromInputSource = (
          inputSource: XRInputSource,
        ): { point: THREE.Vector3; uv: THREE.Vector2 } | null => {
          if (!boardMesh || !xrFrame || !refSpace) return null;
          if (inputSource.targetRayMode !== "tracked-pointer") return null;
          const inputPose = xrFrame.getPose(inputSource.targetRaySpace, refSpace);
          if (!inputPose) return null;
          wb.getGroup().updateWorldMatrix(true, true);
          const m = inputPose.transform.matrix as unknown as number[] | Float32Array;
          rayOrigin.set(m[12], m[13], m[14]);
          const cast = (): { point: THREE.Vector3; uv: THREE.Vector2 } | null => {
            raycaster.set(rayOrigin, rayDir);
            const hits = raycaster.intersectObject(boardMesh, true);
            if (hits.length === 0) return null;
            const h = hits[0];
            const uv =
              h.uv?.clone() ?? (h.point ? wb.worldPointToBoardUv(h.point) : null);
            if (!uv) return null;
            return { point: h.point.clone(), uv };
          };
          rayDir.set(-m[8], -m[9], -m[10]);
          if (rayDir.lengthSq() < 1e-12) return null;
          rayDir.normalize();
          let hit = cast();
          if (hit) return hit;
          rayDir.set(m[8], m[9], m[10]);
          if (rayDir.lengthSq() < 1e-12) return null;
          rayDir.normalize();
          hit = cast();
          return hit;
        };

        const usePointerHit =
          this.lastWhiteboardPointerId === wbId && this.lastWhiteboardPointerPoint;
        if (usePointerHit && session.inputSources) {
          const pinned = this.lastWhiteboardPointerInputSource;
          if (pinned) {
            const stillActive = Array.from(session.inputSources as Iterable<XRInputSource>).some(
              (s) => s === pinned,
            );
            const gamepad = stillActive ? pinned.gamepad : null;
            const triggerOnly = gamepad?.buttons?.[0]?.pressed ?? false;
            if (triggerOnly) {
              drawSample = hitBoardFromInputSource(pinned);
              if (!drawSample && this.lastWhiteboardPointerPoint) {
                wb.getGroup().updateWorldMatrix(true, true);
                const uv =
                  this.lastWhiteboardPointerUv?.clone() ??
                  wb.worldPointToBoardUv(this.lastWhiteboardPointerPoint);
                if (uv) {
                  drawSample = { point: this.lastWhiteboardPointerPoint, uv };
                }
              }
              if (drawSample) {
                whiteboardPinnedHandOnly = true;
              }
            }
          }
        }
        if (
          !drawSample &&
          !whiteboardPinnedHandOnly &&
          this.renderer?.xr &&
          session.inputSources &&
          boardMesh &&
          xrFrame &&
          refSpace
        ) {
          for (const inputSource of session.inputSources as Iterable<XRInputSource>) {
            if (inputSource.targetRayMode !== "tracked-pointer") continue;
            const gamepad = inputSource.gamepad;
            if (!gamepad?.buttons?.[0]?.pressed) continue;
            const hit = hitBoardFromInputSource(inputSource);
            if (hit) {
              drawSample = hit;
              break;
            }
          }
        }
        if (drawSample) {
          if (!this.lastFrameWhiteboardDrawing) wb.startStroke();
          wb.drawAt(drawSample.point, this.state.whiteboardTool, drawSample.uv);
          whiteboardDrawingThisFrame = true;
        } else if (this.lastFrameWhiteboardDrawing) {
          wb.endStroke();
        }
      }
    }
    this.lastFrameWhiteboardDrawing = whiteboardDrawingThisFrame;

    const canNavigate = !this.state.showAvatarMode &&
      ((this.state.alignmentStatus === "aligning" && this.state.alignmentMode === "world") ||
       (this.state.alignmentStatus === "aligned" && this.state.alignmentMode === "free"));
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
    showUnmountPanel: false,
    showPreciseCheckPanel: false,
    preciseCheckInProgress: false,
    awaitingCollisionAck: false,
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
    showWallPanel: false,
    selectedItemPlacementMode: "floor",
    showTexturePanel: false,
    textureOptions: [],
    selectedFurnitureTextureId: undefined,
    showEnvironmentPanel: false,
    selectedFloorId: undefined,
    selectedWallId: undefined,
    loadingEnvironment: false,
    alignmentStatus: 'pending',
    alignmentMode: null,
    showAlignmentPanel: true,
    showAlignmentConfirm: false,
    homeTransparent: false,
    showCornerSelection: false,
    showHeadTrackingAlignment: false,
    alignmentState: 'idle',
    alignmentARModeRequested: false,
    waitingForAlignmentConfirmation: false,
    legacyManualAlignment: false,
    showWallSelectionPanel: false,
    pendingWallpaperItem: null,
    wallpaperCutoutState: null,
    lassoStart: null,
    lassoPreview: null,
    isLassoDrawing: false,
    experienceMode: false,
    experienceWhiteboardId: null,
    whiteboardTool: "pen",
    showAvatarMode: false,
    avatarLoadError: false,
    selectedAvatarIndex: 4,
    avatarSpawnPosition: null,
    avatarHomeModelGroup: null,
    immersiveSessionKind: null,
  });

  const logicRef = useRef<SceneContentLogic | null>(null);
  const lassoHandledByPrimitiveRef = useRef(false);
  const forcingOpaqueSessionRef = useRef(false);

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
    logicRef.current.lassoHandledByPrimitiveRef = lassoHandledByPrimitiveRef;
    logicRef.current.initializeManagers(scene);
    logicRef.current.setXRStore(xrStore);

    return () => {
      logicRef.current?.cleanup();
    };
  }, [homeId, navigate, scene, xrStore]);

  useEffect(() => {
    if (!xr.session || !logicRef.current) return;
    logicRef.current.setupXRRig(scene, camera);
    
    const sessionMode = (xr.session as any)?.mode;
    const isInAlignmentMode = state.showHeadTrackingAlignment;
    const shouldUsePassthroughAR =
      state.homeTransparent ||
      state.showHeadTrackingAlignment ||
      state.alignmentARModeRequested ||
      Boolean(arModeRequested);
    if (sessionMode === 'immersive-ar' && !state.loading && !isInAlignmentMode && shouldUsePassthroughAR) {
      const homeModel = logicRef.current.sceneManager?.getHomeModel();
      if (homeModel) {
        homeModel.setVisible(true);
        if (!homeModel.getIsTransparent()) {
          homeModel.setOpacity(0.3);
          homeModel.setTransparent(true);
        }
      }
    }
  }, [xr.session, scene, camera, state.loading, state.showHeadTrackingAlignment, state.homeTransparent, state.alignmentARModeRequested, arModeRequested]);
  
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
    const logic = logicRef.current;
    let cancelled = false;
    void (async () => {
      await Promise.all([logic.loadHome(digitalHome), logic.loadFurnitureCatalog()]);
      if (cancelled) return;
      await logic.loadDeployedItems();
    })();
    return () => {
      cancelled = true;
    };
  }, [homeId, digitalHome]);

  useFrame((state, delta, xrFrame) => {
    if (!logicRef.current) return;
    logicRef.current.renderer = state.gl;

    logicRef.current.sceneManager?.updateAnimations(delta);

    const session = xr.session;
    if (!session) return;
    
    logicRef.current.updateFrame(session, camera, delta, xrFrame as XRFrame | undefined, state.gl);
  });

  const { gl } = useThree();
  
  const xrSession = xr.session;
  const sessionState = xrStore.getState();
  const isARSession = sessionState.session && sessionState.mode === "immersive-ar";
  const wantsPassthroughAR = state.homeTransparent || state.showHeadTrackingAlignment || state.alignmentARModeRequested;
  const isPassthroughARMode = Boolean(isARSession) && wantsPassthroughAR;
  const hideAvatarInSidebar =
    isPassthroughARMode || state.immersiveSessionKind === "ar";
  const isVRMode = Boolean(isARSession) && !isPassthroughARMode && !state.legacyManualAlignment && !state.waitingForAlignmentConfirmation;
  
  useEffect(() => {
    if (isPassthroughARMode) {
      gl.setClearColor(0x000000, 0);
      gl.domElement.style.backgroundColor = 'transparent';
      gl.autoClear = true;
      gl.autoClearColor = true;
      gl.autoClearDepth = true;
      gl.autoClearStencil = true;
    } else {
      gl.setClearColor(0x808080, 1);
      gl.domElement.style.backgroundColor = '#808080';
    }
  }, [isPassthroughARMode, gl, isARSession, state.homeTransparent, state.showHeadTrackingAlignment, state.alignmentARModeRequested, xrSession]);

  useEffect(() => {
    if (!logicRef.current || !isVRMode || forcingOpaqueSessionRef.current) return;
    forcingOpaqueSessionRef.current = true;
    void logicRef.current
      .applyHomeTransparentXR(false)
      .catch((err) => {
        console.warn('Failed to force opaque VR session:', err);
      })
      .finally(() => {
        forcingOpaqueSessionRef.current = false;
      });
  }, [isVRMode]);

  if (!logicRef.current) return null;

  const logic = logicRef.current;

  const sampleWhiteboardPointer = (e: any, furnitureId: string) => {
    if (!e?.point) return;
    const ps = e.pointerState;
    const inputSource =
      isXRInputSourceState(ps) && ps.type === "controller" ? ps.inputSource : null;
    const uv = e.uv?.clone() ?? null;
    logic.recordWhiteboardPointerHit(furnitureId, e.point.clone(), inputSource, uv);
  };

  const uiLocked = state.showFurniture ||
    state.showControlPanel || 
    state.showNotification ||
    state.showMoveCloserPanel ||
    state.showUnmountPanel ||
    //state.showScalePanel ||
    state.showWallPanel ||
    state.showPreciseCheckPanel ||
    state.showAlignmentPanel ||
    state.showAlignmentConfirm ||
    state.waitingForAlignmentConfirmation;

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
      {/* AR Session Handler */}
      <ARSessionHandler arModeRequested={arModeRequested || state.alignmentARModeRequested} />

      {!isPassthroughARMode && <color args={["#808080"]} attach="background" />}
      <FakeVRPassthroughBlocker enabled={isVRMode} />
      <PerspectiveCamera makeDefault position={[0, 1.6, 2]} fov={75} />
      <ambientLight intensity={isPassthroughARMode ? 0.2 : 0.5} />
      <directionalLight position={[5, 5, 5]} intensity={isPassthroughARMode ? 0.3 : 1} />
      {!isPassthroughARMode && <Environment preset="warehouse" />}

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
              if (state.wallpaperCutoutState?.step === "drawing" && state.wallpaperCutoutState?.wallpaperId === furniture.getId()) {
                return;
              }
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

            const isCutoutDrawingWallpaper =
              state.wallpaperCutoutState?.step === "drawing" &&
              state.wallpaperCutoutState?.wallpaperId === furniture.getId() &&
              furniture.isWallpaper?.();

            const handlePointerDown = (e: any) => {
              if (isCutoutDrawingWallpaper) {
                e.stopPropagation();
                const wallpaper = furniture as WallpaperItem;
                const plane = wallpaper.getPlaneMesh();
                if (plane) {
                  const local = new THREE.Vector3().copy(e.point);
                  plane.worldToLocal(local);
                  if (logic.lassoHandledByPrimitiveRef) logic.lassoHandledByPrimitiveRef.current = true;
                  logic.handleWallpaperLassoPoint({ x: local.x, y: local.y });
                }
                return;
              }
              handleFurnitureClick(e);
            };

            const handlePointerMove = (e: any) => {
              if (state.isLassoDrawing && state.wallpaperCutoutState?.wallpaperId === furniture.getId()) {
                logic.handleWallpaperLassoPointerMove(e, furniture);
              }
            };

            const handlePointerUp = (e: any) => {
              if (state.isLassoDrawing && state.wallpaperCutoutState?.wallpaperId === furniture.getId()) {
                logic.handleWallpaperLassoPointerUp(e, furniture);
              }
            };

            return (
              <React.Fragment key={furniture.getId()}>
                <primitive
                  object={furniture.getGroup()}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
                {isWhiteboard &&
                  state.experienceMode &&
                  boardMesh &&
                  createPortal(
                    <mesh
                      onPointerDown={(e: any) => {
                        e.stopPropagation();
                        logic.handleSelectWhiteboardInExperience(furniture.getId());
                        sampleWhiteboardPointer(e, furniture.getId());
                      }}
                      onClick={(e: any) => {
                        e.stopPropagation();
                        logic.handleSelectWhiteboardInExperience(furniture.getId());
                      }}
                      onPointerMove={(e: any) => {
                        e.stopPropagation();
                        if (state.experienceWhiteboardId !== furniture.getId()) return;
                        sampleWhiteboardPointer(e, furniture.getId());
                      }}
                      onPointerOut={() => {
                        if (state.experienceWhiteboardId === furniture.getId()) {
                          logic.clearWhiteboardPointerHit();
                        }
                      }}
                    >
                      <planeGeometry args={[1.0, 0.6]} />
                      <meshBasicMaterial
                        transparent
                        opacity={0}
                        depthWrite={false}
                        side={THREE.FrontSide}
                      />
                    </mesh>,
                    boardMesh,
                  )}
              </React.Fragment>
            );
          })}

          {state.wallpaperCutoutState?.step === "drawing" && state.wallpaperCutoutState?.wallpaperId && (
            <WallpaperLassoPointerRaycast
              active={state.wallpaperCutoutState.step === "drawing"}
              getPlaneMesh={() => {
                const id = state.wallpaperCutoutState?.wallpaperId;
                if (!id || !logic.sceneManager) return null;
                const f = logic.sceneManager.getFurniture(id);
                return (f as WallpaperItem)?.getPlaneMesh() ?? null;
              }}
              lassoFirstCorner={state.lassoStart}
              onUpdatePreview={(rect) => logic.updateState({ lassoPreview: rect })}
              onLassoPoint={(localPoint) => logic.handleWallpaperLassoPoint(localPoint)}
              lassoHandledByPrimitiveRef={lassoHandledByPrimitiveRef}
            />
          )}
          {state.wallpaperCutoutState?.step === "drawing" && state.wallpaperCutoutState?.wallpaperId && (
            <WallpaperLassoOverlay
              getPlaneMesh={() => {
                const id = state.wallpaperCutoutState?.wallpaperId;
                if (!id || !logic.sceneManager) return null;
                const f = logic.sceneManager.getFurniture(id);
                return (f as WallpaperItem)?.getPlaneMesh() ?? null;
              }}
              lassoRegions={state.wallpaperCutoutState.lassoRegions}
              previewRect={state.lassoPreview}
              visible={!!state.wallpaperCutoutState}
            />
          )}

            {state.showTransformGizmo && state.gizmoPosition && (
              <TransformGizmo
                position={state.gizmoPosition}
                visible={state.showTransformGizmo}
                onMove={(axis, delta) => logic.handleGizmoMove(axis, delta)}
                axisSigns={(() => {
                  const id = state.selectedItemId;
                  const furniture = id && logic.sceneManager ? logic.sceneManager.getFurniture(id) : null;
                  if (!furniture?.isOnWall?.() || furniture.isWallpaper?.()) return { x: 1, y: 1, z: 1 };
                  const wp = furniture.getWallPlacement?.();
                  const wallNormal = wp?.wallNormal;
                  if (!wallNormal) return { x: 1, y: 1, z: 1 };
                  const [nx, , nz] = wallNormal;
                  if (Math.abs(nx) > Math.abs(nz)) {
                    return { x: nx >= 0 ? 1 : -1, y: 1, z: 1 };
                  }
                  return { x: 1, y: 1, z: nz >= 0 ? -1 : 1 };
                })()}
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

          {/* CORNER SELECTION VISUALIZATION */}
          {state.showCornerSelection && logic.navigationController && logic.sceneManager && (
            <CornerSelectionVisualization
              corners={(() => {
                const homeModel = logic.sceneManager?.getHomeModel();
                const nav = logic.navigationController;
                if (!homeModel || !nav) return [];
                homeModel.getGroup().updateMatrixWorld(true);
                return nav.getModelCornersPublic();
              })()}
              selectedCornerIndex={logic.navigationController.getAlignmentData().selectedCorner?.index ?? null}
              onCornerSelect={(index) => logic.handleCornerSelect(index)}
              visible={state.showCornerSelection}
            />
          )}

          {/* ALIGNMENT LINE VISUALIZATION */}
          {state.showHeadTrackingAlignment && (
            <AlignmentLineVisualization
              visible={state.showHeadTrackingAlignment}
              targetDepth={3.0}
              onConfirm={() => logic.handleConfirmAlignmentPoint()}
          instruction={
            state.alignmentState === 'aligningFirstCorner'
              ? "Corner 1/4: Point at the selected corner in the real world. Floor level is auto-detected. Press trigger to confirm."
              : state.alignmentState === 'aligningSecondCorner'
              ? "Corner 2/4: Point at the next corner (clockwise) in the real world. Press trigger to confirm."
              : state.alignmentState === 'aligningThirdCorner'
              ? "Corner 3/4: Point at the third corner (clockwise) in the real world. Press trigger to confirm."
              : "Corner 4/4: Point at the last corner (clockwise) in the real world. Press trigger to confirm."
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
          arFirstRequiresAlignment={!!arModeRequested}
          onSelectMode={(mode) => {
            if (arModeRequested) {
              logic.setPendingARAfterAlignment(true);
            }
              logic.handleAlignmentModeSelect(mode);
          }} 
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
        distance={1.5}
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
          showAlignmentToggle={state.immersiveSessionKind === 'vr'}
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
          showCancel={state.waitingForAlignmentConfirmation}
          cancelText="Manually Align"
          onCancel={() => {
            logic.handleManualAlignCancel();
          }}
          onClose={() => {
            if (state.legacyManualAlignment) {
              logic.handleLegacyAlignmentConfirm();
              return;
            }
            const update: Partial<SceneState> = {
              showNotification: false,
              notificationFromControlPanel: false,
            };
            if (state.awaitingCollisionAck) {
              update.awaitingCollisionAck = false;
            }
            if (state.waitingForAlignmentConfirmation) {
              if (logic.getPendingARAfterAlignment()) {
                logic.setPendingARAfterAlignment(false);
                void logic.applyHomeTransparentXR(true);
              }
              update.waitingForAlignmentConfirmation = false;
              update.showAlignmentConfirm = false;
              update.showAlignmentPanel = false;
              update.showInstructions = true;
            }
            logic.updateState(update);
          }}
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
          title="Initialize Collision Detection?"
          message="The furniture is close to another object. Do you want to check for its collision?"
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.5}
        verticalOffset={0}
        enabled={state.showUnmountPanel}
      >
        <VRPreciseCollisionPanel
          show={state.showUnmountPanel}
          onConfirm={() => logic.handleConfirmUnmount()}
          onCancel={() => logic.handleCancelUnmount()}
          isChecking={false}
          title="Unmount from wall?"
          message="This object is at the maximum distance from the wall. Unmount it to place it elsewhere?"
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
          message="Run precise API check to verify overlap? You won't be able to move item until you answer this question."
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
            position={[0.4, 0, 0]}
            onScaleChange={(newScale) => logic.handleScaleChange(newScale)}
            onClose={() => logic.updateState({ showScalePanel: false })}
          />
        )}
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.5}
        verticalOffset={0}
        enabled={state.showWallSelectionPanel}
      >
        <WallSelectionPanel
          show={state.showWallSelectionPanel}
          walls={logic.sceneManager?.getAvailableWalls() ?? []}
          wallpaperName={state.pendingWallpaperItem?.name ?? ""}
          onSelectWall={(wall) => logic.handleSelectWallForWallpaper(wall)}
          onCancel={() => logic.handleCancelWallSelection()}
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.5}
        verticalOffset={0}
        enabled={!!state.wallpaperCutoutState}
      >
        <WallpaperCutoutPanel
          show={!!state.wallpaperCutoutState}
          step={state.wallpaperCutoutState?.step ?? "prompt"}
          wallpaperName={
            state.wallpaperCutoutState && logic.sceneManager
              ? (logic.sceneManager.getFurniture(state.wallpaperCutoutState.wallpaperId)?.getName() ?? "")
              : ""
          }
          lassoRegions={state.wallpaperCutoutState?.lassoRegions ?? []}
          panelOpacity={state.wallpaperCutoutState?.step === "drawing" ? 0.5 : 0.95}
          onYes={() => logic.handleWallpaperCutoutYes()}
          onNo={() => logic.handleWallpaperCutoutNo()}
          onUndo={() => logic.handleWallpaperCutoutUndo()}
          onConfirm={() => logic.handleWallpaperCutoutConfirm()}
        />
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.5}
        verticalOffset={0}
        enabled={state.showWallPanel}
      >
        {state.selectedItemId && (
          <WallPositionPanel
            show={state.showWallPanel}
            distanceFromWall={
              logic.sceneManager?.getWallDistanceFromWall(state.selectedItemId) ?? 0
            }
            maxDistance={logic.sceneManager?.getMaxWallMountDistance() ?? 0.4}
            onMoveIn={() => logic.handleWallMoveInOut(-WALL_PANEL_STEP)}
            onMoveOut={() => logic.handleWallMoveInOut(WALL_PANEL_STEP)}
            onClose={() => logic.updateState({ showWallPanel: false })}
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
        enabled={state.showSidebar}
      >
        <group position={[-0.8, 0, 0]}>
          <VRSidebar
            show={state.showSidebar}
            onItemSelect={(itemId) => logic.handleSidebarItemSelect(itemId)}
            activeItemId={state.sidebarActiveItem}
            visibleItemIds={
              state.experienceMode
                ? hideAvatarInSidebar
                  ? ["settings"]
                  : ["settings", "avatar"]
                : undefined
            }
            extraItems={
              state.experienceMode
                ? undefined
                : state.selectedItemId &&
                    logic.sceneManager?.isWallMounted(state.selectedItemId)
                  ? [
                      {
                        id: "wall",
                        icon: "▤",
                        label: "Wall",
                        color: "#64748B",
                        description: "Move in/out from wall",
                      },
                    ]
                  : undefined
            }
            hiddenItemIds={
              state.experienceMode
                ? undefined
                : (() => {
                    const hidden: string[] = [];
                    if (hideAvatarInSidebar) hidden.push("avatar");
                    if (
                      state.selectedItemId &&
                      logic.sceneManager?.getFurniture(state.selectedItemId)?.isWallpaper?.()
                    ) {
                      hidden.push("movement", "rotation");
                    }
                    return hidden.length > 0 ? hidden : undefined;
                  })()
            }
          />
        </group>
      </HeadLockedUI>
      <HeadLockedUI
        distance={1.3}
        verticalOffset={0}
        enabled={state.showTexturePanel}
      >
        <group position={[0.5, 0, -0.2]}>
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
      {state.showAvatarMode && AVATAR_URL_MAP[state.selectedAvatarIndex] && (
        <AvatarController
          key={`avatar-${state.selectedAvatarIndex}`}
          avatarUrl={AVATAR_URL_MAP[state.selectedAvatarIndex]!}
          spawnPosition={state.avatarSpawnPosition ?? undefined}
          homeModelGroup={state.avatarHomeModelGroup ?? undefined}
          onLoadError={() => logic.updateState({ avatarLoadError: true })}
        />
      )}
      {state.showAvatarMode && !xr.session && (
        <OrbitControls
          makeDefault
          enablePan={true}
          enableRotate={true}
          enableZoom={true}
          target={
            state.avatarSpawnPosition
              ? new THREE.Vector3(state.avatarSpawnPosition[0], 1, state.avatarSpawnPosition[2])
              : new THREE.Vector3(0, 1, 0)
          }
        />
      )}

    
    </>
  );
}
