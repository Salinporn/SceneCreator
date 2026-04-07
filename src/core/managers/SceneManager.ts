import * as THREE from 'three';
import { FurnitureItem, WallPlacementInfo } from '../objects/FurnitureItem';
import { HomeModel } from '../objects/HomeModel';
import { WallpaperItem } from '../objects/WallpaperItem';
import { CollisionDetector } from './CollisionDetector';

export interface SceneConfig {
  enableCollisionDetection?: boolean;
  enableDebugMode?: boolean;
  floorLevel?: number;
}

export const MAX_WALL_MOUNT_DISTANCE = 0.4;

export interface MoveResult {
  success: boolean;
  needsConfirmation: boolean;
  needsPreciseCheck: boolean;
  needsUnmountConfirm?: boolean;
  reason?: string;
}

export interface WallInfo {
  id: string;
  label: string;
  wallNormal: [number, number, number];
  localNormal?: [number, number, number];
  wallPosition: number;
  width: number;
  height: number;
  center: [number, number, number];
}

export class SceneManager {
  protected scene: THREE.Scene;
  protected homeModel: HomeModel | null = null;
  protected furnitureItems: Map<string, FurnitureItem> = new Map();
  public collisionDetector: CollisionDetector;
  protected config: Required<SceneConfig>;
  protected selectedItemId: string | null = null;
  protected lastValidPositions: Map<string, [number, number, number]> = new Map();
  protected deployedSpatialSnapshots: Map<string, Record<string, unknown>> = new Map();

  constructor(scene: THREE.Scene, config: SceneConfig = {}) {
    this.scene = scene;
    this.config = {
      enableCollisionDetection: config.enableCollisionDetection ?? true,
      enableDebugMode: config.enableDebugMode ?? false,
      floorLevel: config.floorLevel ?? 0,
    };
    
    this.collisionDetector = CollisionDetector.getInstance();
    this.collisionDetector.setDebugMode(this.config.enableDebugMode);
  }

  async setHomeModel(homeModel: HomeModel): Promise<void> {
    if (this.homeModel) {
      this.scene.remove(this.homeModel.getGroup());
      this.homeModel.dispose();
    }

    this.homeModel = homeModel;
    this.scene.add(homeModel.getGroup());
    
    await homeModel.loadModel(this.scene);

    this.updateRoomBoundaryFromHomeModel();

    this.collisionDetector.clearStaticObjects();
    this.registerHomeModelStaticFurniture();
  }

  getHomeModel(): HomeModel | null {
    return this.homeModel;
  }

  private registerHomeModelStaticFurniture(): void {
    if (!this.homeModel) return;

    const roomBox = this.collisionDetector.getRoomBoundary();

    this.homeModel.getGroup().updateMatrixWorld(true);

    const rw = roomBox ? roomBox.max.x - roomBox.min.x : Infinity;
    const rh = roomBox ? roomBox.max.y - roomBox.min.y : Infinity;
    const rd = roomBox ? roomBox.max.z - roomBox.min.z : Infinity;
    const THRESHOLD = 0.85;

    let index = 0;
    // Traverse every mesh individually
    this.homeModel.getGroup().traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const box = new THREE.Box3().setFromObject(child);
      if (box.isEmpty()) return;

      const size = new THREE.Vector3();
      box.getSize(size);

      // Skip objects smaller than 5 cm in every dimension
      if (size.x < 0.05 && size.y < 0.05 && size.z < 0.05) return;

      // Skip structural elements
      const spansCount = [
        size.x > rw * THRESHOLD,
        size.y > rh * THRESHOLD,
        size.z > rd * THRESHOLD,
      ].filter(Boolean).length;
      if (spansCount >= 2) return;

      this.collisionDetector.registerStaticBox(index, box);
      index++;
    });
  }

  getAvailableWalls(): WallInfo[] {
    if (this.homeModel) {
      const transformed = this.getAvailableWallsFromHomeModelTransform();
      if (transformed.length > 0) return transformed;
    }
    return this.getAvailableWallsFromRoomBoundary();
  }

  getAvailableWallsFromHomeModelTransform(): WallInfo[] {
    const boundary = this.homeModel?.getBoundary();
    if (!boundary || !this.homeModel) return [];

    const localBox = {
      min: { x: boundary.min_x, y: boundary.min_y, z: boundary.min_z },
      max: { x: boundary.max_x, y: boundary.max_y, z: boundary.max_z },
    };
    const wallOffset = 0.02;
    const homeGroup = this.homeModel.getGroup();
    homeGroup.updateMatrixWorld(true);
    const matrix = homeGroup.matrixWorld;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);

    const toWorldCenter = (lx: number, ly: number, lz: number): [number, number, number] => {
      const v = new THREE.Vector3(lx, ly, lz).applyMatrix4(matrix);
      return [v.x, v.y, v.z];
    };
    const toWorldNormal = (nx: number, ny: number, nz: number): [number, number, number] => {
      const v = new THREE.Vector3(nx, ny, nz).applyMatrix3(normalMatrix).normalize();
      return [v.x, v.y, v.z];
    };

    const walls: WallInfo[] = [];
    const cy = (localBox.min.y + localBox.max.y) / 2;
    const cx = (localBox.min.x + localBox.max.x) / 2;
    const cz = (localBox.min.z + localBox.max.z) / 2;

    const addWall = (
      id: string,
      label: string,
      lx: number,
      ly: number,
      lz: number,
      lnx: number,
      lny: number,
      lnz: number,
      w: number,
      h: number
    ) => {
      const worldNormal = toWorldNormal(lnx, lny, lnz);
      const worldCenter = toWorldCenter(lx, ly, lz);
      const worldPlanePoint =
        Math.abs(lnx) > Math.abs(lnz)
          ? toWorldCenter(lnx > 0 ? localBox.min.x : localBox.max.x, cy, cz)
          : toWorldCenter(cx, cy, lnz > 0 ? localBox.min.z : localBox.max.z);

      const worldWallPosition =
        worldNormal[0] * worldPlanePoint[0] +
        worldNormal[1] * worldPlanePoint[1] +
        worldNormal[2] * worldPlanePoint[2];

      walls.push({
        id,
        label,
        wallNormal: worldNormal,
        localNormal: [lnx, lny, lnz],
        wallPosition: worldWallPosition,
        width: w,
        height: h,
        center: worldCenter,
      });
    };
    addWall('wall-x-max', 'Wall (East)', localBox.max.x - wallOffset, cy, cz, -1, 0, 0,
      localBox.max.z - localBox.min.z, localBox.max.y - localBox.min.y);
    addWall('wall-x-min', 'Wall (West)', localBox.min.x + wallOffset, cy, cz, 1, 0, 0,
      localBox.max.z - localBox.min.z, localBox.max.y - localBox.min.y);
    addWall('wall-z-min', 'Wall (North)', cx, cy, localBox.min.z + wallOffset, 0, 0, 1,
      localBox.max.x - localBox.min.x, localBox.max.y - localBox.min.y);
    addWall('wall-z-max', 'Wall (South)', cx, cy, localBox.max.z - wallOffset, 0, 0, -1,
      localBox.max.x - localBox.min.x, localBox.max.y - localBox.min.y);
    return walls;
  }

  private getAvailableWallsFromRoomBoundary(): WallInfo[] {
    const roomBoundary = this.collisionDetector.getRoomBoundary();
    if (!roomBoundary) return [];

    const min = roomBoundary.min;
    const max = roomBoundary.max;
    const wallOffset = 0.02;

    const walls: WallInfo[] = [];
    walls.push({
      id: 'wall-x-max',
      label: 'Wall (East)',
      wallNormal: [-1, 0, 0],
      wallPosition: -max.x,
      width: max.z - min.z,
      height: max.y - min.y,
      center: [max.x - wallOffset, (min.y + max.y) / 2, (min.z + max.z) / 2],
    });
    walls.push({
      id: 'wall-x-min',
      label: 'Wall (West)',
      wallNormal: [1, 0, 0],
      wallPosition: min.x,
      width: max.z - min.z,
      height: max.y - min.y,
      center: [min.x + wallOffset, (min.y + max.y) / 2, (min.z + max.z) / 2],
    });
    walls.push({
      id: 'wall-z-min',
      label: 'Wall (North)',
      wallNormal: [0, 0, 1],
      wallPosition: min.z,
      width: max.x - min.x,
      height: max.y - min.y,
      center: [(min.x + max.x) / 2, (min.y + max.y) / 2, min.z + wallOffset],
    });
    walls.push({
      id: 'wall-z-max',
      label: 'Wall (South)',
      wallNormal: [0, 0, -1],
      wallPosition: -max.z,
      width: max.x - min.x,
      height: max.y - min.y,
      center: [(min.x + max.x) / 2, (min.y + max.y) / 2, max.z - wallOffset],
    });
    return walls;
  }

  updateRoomBoundaryFromHomeModel(): void {
    const homeModel = this.homeModel;
    if (!homeModel) return;

    const boundary = homeModel.getBoundary();
    if (!boundary) return;

    const localBox = new THREE.Box3(
      new THREE.Vector3(boundary.min_x, boundary.min_y, boundary.min_z),
      new THREE.Vector3(boundary.max_x, boundary.max_y, boundary.max_z)
    );
    const homeGroup = homeModel.getGroup();
    homeGroup.updateMatrixWorld(true);
    const worldMatrix = homeGroup.matrixWorld;

    const worldToLocal = worldMatrix.clone().invert();
    this.collisionDetector.setRoomBoundaryLocalFromBox3(localBox, worldToLocal);

    const worldBox = localBox.clone().applyMatrix4(worldMatrix);

    this.collisionDetector.setRoomBoundaryFromBox3(worldBox);

    this.collisionDetector.clearStaticObjects();
    this.registerHomeModelStaticFurniture();
  }

  getCollisionDetector(): CollisionDetector {
    return this.collisionDetector;
  }

  updateRoomBoundaryFromHomeModelWallpaper(): void {
    if (!this.homeModel) return;
    const boundary = this.homeModel.getBoundary();
    if (!boundary) return;
    const localBox = new THREE.Box3(
      new THREE.Vector3(boundary.min_x, boundary.min_y, boundary.min_z),
      new THREE.Vector3(boundary.max_x, boundary.max_y, boundary.max_z)
    );
    const homeGroup = this.homeModel.getGroup();
    homeGroup.updateMatrixWorld(true);
    const matrix = homeGroup.matrixWorld;
    const worldToLocal = matrix.clone().invert();
    this.collisionDetector.setRoomBoundaryLocalFromBox3(localBox, worldToLocal);
    const corners = [
      localBox.min.clone(),
      localBox.max.clone(),
      new THREE.Vector3(localBox.min.x, localBox.min.y, localBox.max.z),
      new THREE.Vector3(localBox.min.x, localBox.max.y, localBox.min.z),
      new THREE.Vector3(localBox.min.x, localBox.max.y, localBox.max.z),
      new THREE.Vector3(localBox.max.x, localBox.min.y, localBox.min.z),
      new THREE.Vector3(localBox.max.x, localBox.min.y, localBox.max.z),
      new THREE.Vector3(localBox.max.x, localBox.max.y, localBox.min.z),
    ];
    const worldCorners = corners.map((c) => c.applyMatrix4(matrix));
    const worldBox = new THREE.Box3().setFromPoints(worldCorners);
    this.collisionDetector.setRoomBoundaryFromBox3(worldBox);
  }

  repositionWallMountedItemsAfterAlignment(): void {
    const walls = this.getAvailableWalls();
    if (walls.length === 0) return;

    const matchWallByNormal = (localN: [number, number, number]) => {
      return walls.find((w) => {
        const n = w.localNormal ?? w.wallNormal;
        const dot = localN[0] * n[0] + localN[1] * n[1] + localN[2] * n[2];
        return dot > 0.99;
      });
    };

    this.furnitureItems.forEach((furniture) => {
      if (!furniture.isOnWall()) return;
      const placement = furniture.getWallPlacement();
      if (!placement) return;

      const wall = matchWallByNormal(placement.wallNormal);
      if (!wall) return;

      furniture.setPosition(wall.center);
      furniture.setWallPlacement({
        wallNormal: wall.wallNormal,
        wallPosition: wall.wallPosition,
      });
      if (furniture.isWallpaper?.()) {
        (furniture as WallpaperItem).reorientPlaneToWall();
      }
      this.collisionDetector.updateFurnitureBox(
        furniture.getId(),
        furniture.getGroup(),
        furniture.getModelId()
      );
    });
  }

  async addFurniture(furniture: FurnitureItem): Promise<boolean> {
    if (this.furnitureItems.has(furniture.getId())) {
      return false;
    }

    this.furnitureItems.set(furniture.getId(), furniture);
    this.scene.add(furniture.getGroup());
    
    await furniture.loadModel(this.scene);

    if (this.homeModel && !this.deployedSpatialSnapshots.has(furniture.getId())) {
      this.deployedSpatialSnapshots.set(
        furniture.getId(),
        this.serializeFurnitureForStorage(furniture) as Record<string, unknown>,
      );
    }
    
    if (this.config.enableCollisionDetection) {
      setTimeout(async () => {
        await this.updateFurnitureCollision(furniture.getId());
        
        for (const [otherId] of this.furnitureItems) {
          if (otherId !== furniture.getId()) {
            await this.updateFurnitureCollision(otherId);
          }
        }
      }, 100);
    }

    return true;
  }

  removeFurniture(id: string): boolean {
    const furniture = this.furnitureItems.get(id);
    if (!furniture) return false;

    this.scene.remove(furniture.getGroup());
    furniture.dispose();
    this.furnitureItems.delete(id);
    this.deployedSpatialSnapshots.delete(id);
    
    this.collisionDetector.removeFurniture(id);
    this.lastValidPositions.delete(id); // Clear last valid position

    if (this.selectedItemId === id) {
      this.selectedItemId = null;
    }

    return true;
  }

  getFurniture(id: string): FurnitureItem | undefined {
    return this.furnitureItems.get(id);
  }

  getAllFurniture(): FurnitureItem[] {
    return Array.from(this.furnitureItems.values());
  }

  clearAllFurniture(): void {
    this.deployedSpatialSnapshots.clear();
    this.furnitureItems.forEach((furniture) => {
      this.scene.remove(furniture.getGroup());
      furniture.dispose();
    });
    this.furnitureItems.clear();
    this.collisionDetector.clear();
    this.selectedItemId = null;
  }

  selectFurniture(id: string): boolean {
    const furniture = this.furnitureItems.get(id);
    if (!furniture) return false;

    if (this.selectedItemId && this.selectedItemId !== id) {
      const prevFurniture = this.furnitureItems.get(this.selectedItemId);
      if (prevFurniture?.getIsFloating()) {
        return false;
      }
      prevFurniture?.deselect();
    }

    furniture.select();
    this.selectedItemId = id;
    return true;
  }

  deselectFurniture(id?: string): void {
    const targetId = id || this.selectedItemId;
    if (!targetId) return;

    const furniture = this.furnitureItems.get(targetId);
    furniture?.deselect();

    if (targetId === this.selectedItemId) {
      this.selectedItemId = null;
    }
  }

  getSelectedFurniture(): FurnitureItem | null {
    return this.selectedItemId ? this.furnitureItems.get(this.selectedItemId) || null : null;
  }

  async updateFurnitureCollision(id: string): Promise<void> {
    const furniture = this.furnitureItems.get(id);
    if (!furniture) return;

    this.collisionDetector.updateFurnitureBox(
      id,
      furniture.getGroup(),
      furniture.getModelId()
    );

    // Collision check for wall-mounted items (only check against other furniture)
    let collision;
    if (furniture.isOnWall()) {
      collision = await this.collisionDetector.checkFurnitureCollisions(id);
      furniture.setFloating(false);
    } else {
      collision = await this.collisionDetector.checkAllCollisions(id);
    }
    
    furniture.setCollision(collision.hasCollision);
  }

  async updateAllCollisions(): Promise<void> {
    for (const [id] of this.furnitureItems) {
      await this.updateFurnitureCollision(id);
    }
  }

  async isPositionValid(id: string, position: THREE.Vector3): Promise<boolean> {
    const furniture = this.furnitureItems.get(id);
    if (!furniture) return false;

    return await this.collisionDetector.isPositionValid(
      id,
      position,
      furniture.getGroup()
    );
  }

  async moveFurniture(
    id: string,
    newPosition: [number, number, number],
    skipAABBBlock: boolean = false,
    performPreciseCheck: boolean = false
  ): Promise<MoveResult> {
    const furniture = this.furnitureItems.get(id);
    if (!furniture) return { 
      success: false, 
      needsConfirmation: false, 
      needsPreciseCheck: false,
      reason: 'Furniture not found' 
    };

    const wallPlacementEarly = furniture.getWallPlacement();
    const isWallMountedEarly = furniture.isOnWall();
    if (!this.config.enableCollisionDetection) {
      if (isWallMountedEarly && wallPlacementEarly) {
        const distance = this.getDistanceFromWall(newPosition, wallPlacementEarly);
        if (distance > MAX_WALL_MOUNT_DISTANCE) {
          return {
            success: false,
            needsConfirmation: false,
            needsPreciseCheck: false,
            needsUnmountConfirm: true,
            reason: 'Beyond max distance from wall',
          };
        }
      }
      furniture.setPosition(newPosition);
      return { success: true, needsConfirmation: false, needsPreciseCheck: false };
    }

    const originalPosition = furniture.getPosition();
    const isWallMounted = furniture.isOnWall();
    const isWallMountable = furniture.isWallMountable();
    const wallPlacement = furniture.getWallPlacement();

    if (isWallMounted && wallPlacement) {
      const distance = this.getDistanceFromWall(newPosition, wallPlacement);
      if (distance > MAX_WALL_MOUNT_DISTANCE) {
        return {
          success: false,
          needsConfirmation: false,
          needsPreciseCheck: false,
          needsUnmountConfirm: true,
          reason: 'Beyond max distance from wall',
        };
      }

      const currentDist = this.getDistanceFromWall(originalPosition, wallPlacement);
      const preservedDist = Math.max(0, Math.min(MAX_WALL_MOUNT_DISTANCE, currentDist));
      const posWithDist = this.clampPositionToWallDistance(newPosition, wallPlacement, preservedDist);
      newPosition[0] = posWithDist[0];
      newPosition[1] = posWithDist[1];
      newPosition[2] = posWithDist[2];
    }

    // Save last valid position
    if (!this.lastValidPositions.has(id)) {
      this.lastValidPositions.set(id, originalPosition);
    }

    // Temporarily move to test position
    furniture.setPosition(newPosition);
    this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
    
    const box = this.collisionDetector.furnitureBoxes.get(id);
    const roomBoundary = this.collisionDetector.getRoomBoundary();
    
    // Check if object is touching any wall surface
    if (!isWallMounted && isWallMountable && box && roomBoundary) {
      const walls = this.getAvailableWalls();
      if (walls.length > 0) {
        const boxCorners = [
          new THREE.Vector3(box.min.x, box.min.y, box.min.z),
          new THREE.Vector3(box.min.x, box.min.y, box.max.z),
          new THREE.Vector3(box.min.x, box.max.y, box.min.z),
          new THREE.Vector3(box.min.x, box.max.y, box.max.z),
          new THREE.Vector3(box.max.x, box.min.y, box.min.z),
          new THREE.Vector3(box.max.x, box.min.y, box.max.z),
          new THREE.Vector3(box.max.x, box.max.y, box.min.z),
          new THREE.Vector3(box.max.x, box.max.y, box.max.z),
        ];

        const computeBoxDistanceToWallPlane = (w: WallInfo): number => {
          const n = new THREE.Vector3(...w.wallNormal);
          if (n.lengthSq() > 0) n.normalize();

          let minS = Infinity;
          let maxS = -Infinity;
          for (const c of boxCorners) {
            const s = c.dot(n) - w.wallPosition;
            minS = Math.min(minS, s);
            maxS = Math.max(maxS, s);
          }

          if (minS <= 0 && maxS >= 0) return 0;
          return Math.min(Math.abs(minS), Math.abs(maxS));
        };

        let bestWall: WallInfo | null = null;
        let bestDist = Infinity;
        for (const w of walls) {
          const dist = computeBoxDistanceToWallPlane(w);
          if (dist < bestDist) {
            bestDist = dist;
            bestWall = w;
          }
        }

        const mountTolerance = 0.2;
        if (bestWall && bestDist <= mountTolerance) {
          furniture.setWallPlacement({
            wallNormal: bestWall.wallNormal,
            wallPosition: bestWall.wallPosition,
          });

          furniture.setPosition(newPosition);
          this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());

          const adjustedPos = this.adjustPositionToWall(id, newPosition, bestWall.wallNormal, bestWall.wallPosition);

          furniture.setPosition(adjustedPos);
          this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());

          const adjustedBox = this.collisionDetector.furnitureBoxes.get(id);
          if (adjustedBox && roomBoundary) {
            const margin = 0.05;
            const boxSize = new THREE.Vector3();
            adjustedBox.getSize(boxSize);

            const constrainedVec = this.collisionDetector.constrainToRoom(
              new THREE.Vector3(adjustedPos[0], adjustedPos[1], adjustedPos[2]),
              adjustedBox
            );

            const finalPos: [number, number, number] = [
              constrainedVec.x,
              constrainedVec.y,
              constrainedVec.z,
            ];

            if (adjustedBox.min.y < roomBoundary.min.y + margin) {
              finalPos[1] = roomBoundary.min.y + margin + boxSize.y / 2;
            } else if (adjustedBox.max.y > roomBoundary.max.y - margin) {
              finalPos[1] = roomBoundary.max.y - margin - boxSize.y / 2;
            }

            furniture.setPosition(finalPos);
            this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
          }

          const mountedRoomCollision = this.collisionDetector.checkRoomCollision(id);
          if (mountedRoomCollision.hasCollision) {
            furniture.setPlacementMode('floor');
            furniture.setPosition(originalPosition);
            this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
            furniture.setCollision(true);
            return {
              success: false,
              needsConfirmation: false,
              needsPreciseCheck: false,
              reason: 'Outside room boundary',
            };
          }

          const finalPosition = furniture.getPosition();
          this.lastValidPositions.set(id, finalPosition);
          furniture.setCollision(false);
          return { success: true, needsConfirmation: false, needsPreciseCheck: false };
        }
      }
    }
    
    const roomCollision = this.collisionDetector.checkRoomCollision(id);
    const onFloor = this.collisionDetector.checkRoomFloor(id);

    if (!isWallMounted) {
      if (roomCollision.hasCollision) {
        furniture.setPosition(originalPosition);
        this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
        furniture.setCollision(true);
        return { 
          success: false, 
          needsConfirmation: false, 
          needsPreciseCheck: false,
          reason: 'Outside room boundary' 
        };
      } else {
          furniture.setPosition(newPosition);
          furniture.setCollision(false);
          this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
          this.lastValidPositions.set(id, newPosition);
      }

       // Check if object is in the air
      const box = this.collisionDetector.furnitureBoxes.get(id);
      if (box && roomBoundary) {
        if (!onFloor) {
          // Check if there's a furniture surface below
          const surfaceResult = this.collisionDetector.findSurfaceBelow(id);
          if (surfaceResult.hasSurface) {
            // Snap object to sit on top of the surface below
            const snapGap = 0.001;
            const snappedY = newPosition[1] + (surfaceResult.surfaceY - box.min.y) + snapGap;
            newPosition[1] = snappedY;
            furniture.setPosition(newPosition);
            furniture.setFloating(false);
            this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
            this.lastValidPositions.set(id, newPosition);
          } else {
            furniture.setPosition(newPosition);
            furniture.setFloating(true);
            this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
            this.lastValidPositions.set(id, newPosition);
            return { success: false, needsConfirmation: false, needsPreciseCheck: false };
          }
        } else {
          furniture.setPosition(newPosition);
          furniture.setFloating(false);
          this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
        }
      }
    }
    
    const hasAABBCollision = this.collisionDetector.checkAABBCollisionOnly(id);
    
    if (hasAABBCollision && !skipAABBBlock) {
      furniture.setCollision(true);
      return {
        success: true,
        needsConfirmation: true,
        needsPreciseCheck: false,
        reason: 'Close to another object'
      };
    }
    
    if (hasAABBCollision && skipAABBBlock && !performPreciseCheck) {
      furniture.setCollision(true);
      return { 
        success: true, 
        needsConfirmation: false, 
        needsPreciseCheck: true,
        reason: 'In AABB collision zone' 
      };
    }
    
    if (performPreciseCheck) {
      const preciseCollision = await this.collisionDetector.checkFurnitureCollisions(id);
      
      if (preciseCollision.hasCollision) {
        const lastValid = this.lastValidPositions.get(id) || originalPosition;
        furniture.setPosition(lastValid);
        this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
        furniture.setCollision(false);
        return { 
          success: false, 
          needsConfirmation: false, 
          needsPreciseCheck: false,
          reason: 'Objects are overlapping' 
        };
      } else {
        this.lastValidPositions.set(id, newPosition);
        furniture.setCollision(false);
        return { 
          success: true, 
          needsConfirmation: false, 
          needsPreciseCheck: false 
        };
      }
    }

    this.lastValidPositions.set(id, newPosition);
    furniture.setCollision(false);
    
    return { success: true, needsConfirmation: false, needsPreciseCheck: false };
  }

  getLastValidPosition(id: string): [number, number, number] | undefined {
    return this.lastValidPositions.get(id);
  }

  clearLastValidPosition(id: string): void {
    this.lastValidPositions.delete(id);
  }

  rotateFurniture(id: string, rotation: [number, number, number]): boolean {
    const furniture = this.furnitureItems.get(id);
    if (!furniture) return false;

    furniture.setRotation(rotation);
    
    if (this.config.enableCollisionDetection) {
      this.updateFurnitureCollision(id).then(() => {
        this.furnitureItems.forEach((_, otherId) => {
          if (otherId !== id) {
            this.updateFurnitureCollision(otherId);
          }
        });
      });
    }

    return true;
  }

  isWallMounted(id: string): boolean {
    const furniture = this.furnitureItems.get(id);
    return furniture?.isOnWall() || false;
  }

  isWallMountable(id: string): boolean {
    const furniture = this.furnitureItems.get(id);
    return furniture?.isWallMountable() || false;
  }

  setWallPlacement(id: string, wallNormal: [number, number, number], wallPosition: number): boolean {
    const furniture = this.furnitureItems.get(id);
    if (!furniture || !furniture.isWallMountable()) return false;

    furniture.setWallPlacement({
      wallNormal,
      wallPosition,
    });

    return true;
  }

  unmountFromWallAndFloat(id: string): boolean {
    const furniture = this.furnitureItems.get(id);
    if (!furniture || !furniture.isOnWall()) return false;

    const wallPlacement = furniture.getWallPlacement();
    const currentPos = furniture.getPosition();
    
    // Move item away from wall into the room
    const offsetDistance = 0.5;
    const newPos: [number, number, number] = [...currentPos];
    
    if (wallPlacement) {
      const n = new THREE.Vector3(...wallPlacement.wallNormal);
      n.normalize();
      const p = new THREE.Vector3(...currentPos).addScaledVector(n, offsetDistance);
      newPos[0] = p.x;
      newPos[1] = p.y;
      newPos[2] = p.z;
    }
    
    // Unmount from wall
    furniture.setPlacementMode('floor');
    furniture.setFloating(true);
    furniture.setPosition(newPos);
    
    // Update collision detection
    this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
    
    return true;
  }

  async moveWallFurniture(
    id: string,
    deltaVertical: number,
    deltaHorizontal: number,
    deltaInOut: number = 0
  ): Promise<MoveResult> {
    const furniture = this.furnitureItems.get(id);
    if (!furniture) return { 
      success: false, 
      needsConfirmation: false, 
      needsPreciseCheck: false,
      reason: 'Furniture not found' 
    };

    if (!furniture.isOnWall()) {
      return { 
        success: false, 
        needsConfirmation: false, 
        needsPreciseCheck: false,
        reason: 'Furniture is not wall-mounted' 
      };
    }

    const currentPosition = furniture.getPosition();
    const newPosition = furniture.moveAlongWall(deltaVertical, deltaHorizontal);

    const wallPlacement = furniture.getWallPlacement();
    if (!wallPlacement) {
      return {
        success: false,
        needsConfirmation: false,
        needsPreciseCheck: false,
        reason: 'No wall placement',
      };
    }

    // Apply in/out from wall with max-distance constraint
    if (Math.abs(deltaInOut) >= 0.001) {
      const rawDist = this.getDistanceFromWall(currentPosition, wallPlacement);
      const currentDist = Math.min(rawDist, MAX_WALL_MOUNT_DISTANCE);
      const requestedDist = currentDist + deltaInOut;
      const wallDistanceEpsilon = 0.0001;
      if (requestedDist > MAX_WALL_MOUNT_DISTANCE) {
        const nearMax = currentDist >= MAX_WALL_MOUNT_DISTANCE - wallDistanceEpsilon;
        const movingAway = deltaInOut > 0;
        if (movingAway && nearMax) {
        return {
          success: false,
          needsConfirmation: false,
          needsPreciseCheck: false,
          needsUnmountConfirm: true,
          reason: 'Beyond max distance from wall',
        };
        }
      }
      const clampedDist = Math.max(0, Math.min(MAX_WALL_MOUNT_DISTANCE, requestedDist));
      const posWithInOut = this.clampPositionToWallDistance(newPosition, wallPlacement, clampedDist);
      newPosition[0] = posWithInOut[0];
      newPosition[1] = posWithInOut[1];
      newPosition[2] = posWithInOut[2];
    } else {
      // Preserve the current distance from the wall
      const currentDist = this.getDistanceFromWall(currentPosition, wallPlacement);
      const preservedDist = Math.max(0, Math.min(MAX_WALL_MOUNT_DISTANCE, currentDist));
      const posWithDist = this.clampPositionToWallDistance(newPosition, wallPlacement, preservedDist);
      newPosition[0] = posWithDist[0];
      newPosition[1] = posWithDist[1];
      newPosition[2] = posWithDist[2];
    }
    
    // Check if the new position would hit another wall.
    const hasTangentMovement = Math.abs(deltaVertical) > 0.0001 || Math.abs(deltaHorizontal) > 0.0001;
    const roomBoundary = this.collisionDetector.getRoomBoundary();
    if (roomBoundary && hasTangentMovement) {
      const wallPlacement = furniture.getWallPlacement();
      if (wallPlacement) {
        const wallNormal = wallPlacement.wallNormal;
        const margin = 0.15;
        
        furniture.setPosition(newPosition);
        this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
        const box = this.collisionDetector.furnitureBoxes.get(id);
        
        if (box) {
          let constrainedY = newPosition[1];
          const boxSize = new THREE.Vector3();
          box.getSize(boxSize);
          
          if (box.min.y < roomBoundary.min.y + margin) {
            constrainedY = roomBoundary.min.y + margin + boxSize.y / 2;
          } else if (box.max.y > roomBoundary.max.y - margin) {
            constrainedY = roomBoundary.max.y - margin - boxSize.y / 2;
          }

          let constrainedX = newPosition[0];
          let constrainedZ = newPosition[2];
          let needsConstraint = false;
          
          if (Math.abs(wallNormal[2]) > Math.abs(wallNormal[0])) {
            if (box.min.x < roomBoundary.min.x + margin || box.max.x > roomBoundary.max.x - margin) {
              if (box.min.x < roomBoundary.min.x + margin) {
                constrainedX = roomBoundary.min.x + margin + boxSize.x / 2;
              } else if (box.max.x > roomBoundary.max.x - margin) {
                constrainedX = roomBoundary.max.x - margin - boxSize.x / 2;
              }
              needsConstraint = true;
            }
          } else {
            if (box.min.z < roomBoundary.min.z + margin || box.max.z > roomBoundary.max.z - margin) {
              if (box.min.z < roomBoundary.min.z + margin) {
                constrainedZ = roomBoundary.min.z + margin + boxSize.z / 2;
              } else if (box.max.z > roomBoundary.max.z - margin) {
                constrainedZ = roomBoundary.max.z - margin - boxSize.z / 2;
              }
              needsConstraint = true;
            }
          }
          
          if (constrainedY !== newPosition[1] || needsConstraint) {
            const constrainedPos: [number, number, number] = [constrainedX, constrainedY, constrainedZ];
            furniture.setPosition(constrainedPos);
            this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
            newPosition[0] = constrainedX;
            newPosition[1] = constrainedY;
            newPosition[2] = constrainedZ;
          }
        }
      }
    }
    
    furniture.setPosition(newPosition);
    this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());

    if (this.config.enableCollisionDetection) {
      const isWallMounted = !!furniture.getWallPlacement();
      if (!isWallMounted) {
        const hasAABBCollision = this.collisionDetector.checkAABBCollisionOnly(id);

        if (hasAABBCollision) {
          furniture.setPosition(currentPosition);
          this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
          furniture.setCollision(true);
          return {
            success: false,
            needsConfirmation: true,
            needsPreciseCheck: false,
            reason: 'Close to another object',
          };
        }
      }

      await this.updateFurnitureCollision(id);
    }

    this.lastValidPositions.set(id, furniture.getPosition());
    return { success: true, needsConfirmation: false, needsPreciseCheck: false };
  }

  scaleFurniture(id: string, scale: number | [number, number, number]): boolean {
    const furniture = this.furnitureItems.get(id);
    if (!furniture) return false;

    furniture.setScale(scale);
    
    if (this.config.enableCollisionDetection) {
      this.updateFurnitureCollision(id).then(() => {
        this.furnitureItems.forEach((_, otherId) => {
          if (otherId !== id) {
            this.updateFurnitureCollision(otherId);
          }
        });
      });
    }

    return true;
  }

  calculateSpawnPosition(camera: THREE.Camera, distance: number = 2): [number, number, number] {
    const cameraWorldPos = new THREE.Vector3();
    camera.getWorldPosition(cameraWorldPos);

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const spawnPos = cameraWorldPos.clone();
    spawnPos.addScaledVector(cameraDirection, distance);

    const worldRoomBox = this.collisionDetector.getRoomBoundary();
    if (worldRoomBox) {
      spawnPos.y = worldRoomBox.min.y;
      spawnPos.x = Math.max(worldRoomBox.min.x, Math.min(worldRoomBox.max.x, spawnPos.x));
      spawnPos.z = Math.max(worldRoomBox.min.z, Math.min(worldRoomBox.max.z, spawnPos.z));
    } else {
      spawnPos.y = this.config.floorLevel;
      if (this.homeModel) {
        const constrained = this.homeModel.constrainPosition(spawnPos);
        return [constrained.x, constrained.y, constrained.z];
      }
    }

    return [spawnPos.x, spawnPos.y, spawnPos.z];
  }


  private getDistanceFromWall(
    position: [number, number, number],
    wall: WallPlacementInfo
  ): number {
    const n = new THREE.Vector3(...wall.wallNormal);
    n.normalize();
    const p = new THREE.Vector3(...position);
    return Math.max(0, p.dot(n) - wall.wallPosition);
  }

  private clampPositionToWallDistance(
    position: [number, number, number],
    wall: WallPlacementInfo,
    distanceFromWall: number
  ): [number, number, number] {
    const n = new THREE.Vector3(...wall.wallNormal);
    n.normalize();
    const p = new THREE.Vector3(...position);

    const currentDist = p.dot(n) - wall.wallPosition;
    const delta = distanceFromWall - currentDist;
    p.addScaledVector(n, delta);

    return [p.x, p.y, p.z];
  }

  getWallDistanceFromWall(id: string): number | null {
    const furniture = this.furnitureItems.get(id);
    const wall = furniture?.getWallPlacement() ?? null;
    if (!furniture || !wall) return null;
    return this.getDistanceFromWall(furniture.getPosition(), wall);
  }

  getMaxWallMountDistance(): number {
    return MAX_WALL_MOUNT_DISTANCE;
  }

  snapFurnitureToWallSurface(id: string): void {
    const furniture = this.furnitureItems.get(id);
    const wallPlacement = furniture?.getWallPlacement();
    if (!furniture || !wallPlacement) return;

    const snapped = this.clampPositionToWallDistance(
      furniture.getPosition(),
      wallPlacement,
      0
    );
    furniture.setPosition(snapped);
    this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
  }

  private adjustPositionToWall(
    id: string,
    position: [number, number, number],
    wallNormal: [number, number, number],
    wallPosition: number
  ): [number, number, number] {
    void id;
    return this.clampPositionToWallDistance(
      position,
      { wallNormal, wallPosition },
      0
    );
  }

  interpretSpatialDataForLoad(sd: Record<string, unknown> | undefined | null): {
    position: [number, number, number];
    rotation: [number, number, number];
    wallPlacement: WallPlacementInfo | null;
  } {
    const z: [number, number, number] = [0, 0, 0];
    if (!sd) {
      return { position: z, rotation: z, wallPlacement: null };
    }

    const pRaw = (sd.positions as number[] | undefined) ?? (sd.position as number[] | undefined) ?? [0, 0, 0];
    const px = Number(pRaw[0] ?? 0);
    const py = Number(pRaw[1] ?? 0);
    const pz = Number(pRaw[2] ?? 0);

    const rRaw = (sd.rotation as number[] | undefined) ?? [0, 0, 0];
    const rx = Number(rRaw[0] ?? 0);
    const ry = Number(rRaw[1] ?? 0);
    const rz = Number(rRaw[2] ?? 0);

    const frame = sd.coordinate_frame as string | undefined;
    let position: [number, number, number];
    let rotation: [number, number, number];

    if (frame === 'home_local' && this.homeModel) {
      this.homeModel.getGroup().updateMatrixWorld(true);
      const homeM = this.homeModel.getGroup().matrixWorld;

      const worldPos = new THREE.Vector3(px, py, pz).applyMatrix4(homeM);
      position = [worldPos.x, worldPos.y, worldPos.z];

      const qLocal = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
      const qH = new THREE.Quaternion();
      this.homeModel.getGroup().getWorldQuaternion(qH);
      const qW = qH.clone().multiply(qLocal);
      const eW = new THREE.Euler().setFromQuaternion(qW, 'XYZ');
      rotation = [eW.x, eW.y, eW.z];
    } else {
      position = [px, py, pz];
      rotation = [rx, ry, rz];
    }

    let wallPlacement: WallPlacementInfo | null = null;
    const wallSideId = sd.wall_side_id as string | undefined;
    if (wallSideId) {
      const w = this.getAvailableWalls().find((x) => x.id === wallSideId);
      if (w) {
        wallPlacement = { wallNormal: w.wallNormal, wallPosition: w.wallPosition };
      }
    }
    if (!wallPlacement && sd.placement_mode === 'wall' && sd.wall_placement) {
      wallPlacement = sd.wall_placement as WallPlacementInfo;
    }

    if (wallPlacement) {
      const roomBoundary = this.collisionDetector.getRoomBoundary();
      if (roomBoundary) {
        const n = new THREE.Vector3(...wallPlacement.wallNormal);
        if (n.lengthSq() > 1e-9) n.normalize();
        const nx = n.x;
        const nz = n.z;

        const isAxisX = Math.abs(nx) >= 0.99 && Math.abs(nz) < 0.01;
        const isAxisZ = Math.abs(nz) >= 0.99 && Math.abs(nx) < 0.01;

        if (isAxisX) {
          wallPlacement = {
            wallNormal: nx > 0 ? [1, 0, 0] : [-1, 0, 0],
            wallPosition: nx > 0 ? roomBoundary.min.x : -roomBoundary.max.x,
          };
        } else if (isAxisZ) {
          wallPlacement = {
            wallNormal: nz > 0 ? [0, 0, 1] : [0, 0, -1],
            wallPosition: nz > 0 ? roomBoundary.min.z : -roomBoundary.max.z,
          };
        }
      }
    }

    return { position, rotation, wallPlacement };
  }

  registerDeployedSpatialSnapshot(itemId: string, spatialData: Record<string, unknown>): void {
    this.deployedSpatialSnapshots.set(itemId, { ...spatialData });
  }

  async onHomeAlignmentFinished(
    oldHomeWorld: THREE.Matrix4,
    newHomeWorld: THREE.Matrix4
  ): Promise<void> {
    const delta = new THREE.Matrix4().multiplyMatrices(
      newHomeWorld,
      new THREE.Matrix4().copy(oldHomeWorld).invert()
    );

    this.updateRoomBoundaryFromHomeModel();

    for (const furniture of this.furnitureItems.values()) {
      const id = furniture.getId();
      const snap = this.deployedSpatialSnapshots.get(id);
      if (snap && snap.coordinate_frame === 'home_local') {
        const interp = this.interpretSpatialDataForLoad(snap);
        furniture.setPosition(interp.position);
        furniture.setRotation(interp.rotation);
        if (interp.wallPlacement) {
          furniture.setWallPlacement(interp.wallPlacement);
        }

        if (furniture.isOnWall?.()) {
          const currentPos = furniture.getPosition();
          const availableWalls = this.getAvailableWalls();

          let bestWall: (typeof availableWalls)[number] | null = null;
          let bestAbsDist = Infinity;

          for (const w of availableWalls) {
            const dist = this.getDistanceFromWall(currentPos, {
              wallNormal: w.wallNormal,
              wallPosition: w.wallPosition,
            });
            const absDist = Math.abs(dist);
            if (absDist < bestAbsDist) {
              bestAbsDist = absDist;
              bestWall = w;
            }
          }

          const tolerance = 0.5;
          if (bestWall && bestAbsDist <= MAX_WALL_MOUNT_DISTANCE + tolerance) {
            furniture.setWallPlacement({
              wallNormal: bestWall.wallNormal,
              wallPosition: bestWall.wallPosition,
            });
          }
        }

        if (furniture.isWallpaper?.()) {
          (furniture as WallpaperItem).reorientPlaneToWall();
        }
        furniture.syncTransformFromGroup();
        this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
        continue;
      }

      const mF = furniture.getGroup().matrixWorld.clone();
      const mNext = new THREE.Matrix4().multiplyMatrices(delta, mF);
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const sc = new THREE.Vector3();
      mNext.decompose(pos, quat, sc);
      const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
      furniture.setPosition([pos.x, pos.y, pos.z]);
      furniture.setRotation([euler.x, euler.y, euler.z]);

      if (furniture.isOnWall?.()) {
        const currentPos = furniture.getPosition();
        const availableWalls = this.getAvailableWalls();

        let bestWall: (typeof availableWalls)[number] | null = null;
        let bestAbsDist = Infinity;

        for (const w of availableWalls) {
          const dist = this.getDistanceFromWall(currentPos, {
            wallNormal: w.wallNormal,
            wallPosition: w.wallPosition,
          });
          const absDist = Math.abs(dist);

          if (absDist < bestAbsDist) {
            bestAbsDist = absDist;
            bestWall = w;
          }
        }

        const tolerance = 0.5;
        if (bestWall && bestAbsDist <= MAX_WALL_MOUNT_DISTANCE + tolerance) {
          furniture.setWallPlacement({
            wallNormal: bestWall.wallNormal,
            wallPosition: bestWall.wallPosition,
          });
        }
      }

      if (furniture.isWallpaper?.()) {
        (furniture as WallpaperItem).reorientPlaneToWall();
      }
      furniture.syncTransformFromGroup();
      this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
    }

    this.updateRoomBoundaryFromHomeModelWallpaper();
    await this.updateAllCollisions();
  }

  // restore home to base case before realignment
  restorePreAlignmentBaseline(
    homeLocalSnapshot: {
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
      scale: THREE.Vector3;
    },
    lastCompletedAlignmentDelta: THREE.Matrix4 | null,
  ): void {
    if (!this.homeModel) return;

    const inv = lastCompletedAlignmentDelta
      ? new THREE.Matrix4().copy(lastCompletedAlignmentDelta).invert()
      : null;

    if (inv) {
      for (const furniture of this.furnitureItems.values()) {
        const id = furniture.getId();
        const snap = this.deployedSpatialSnapshots.get(id);
        if (snap && snap.coordinate_frame === 'home_local') {
          continue;
        }

        const mF = furniture.getGroup().matrixWorld.clone();
        const mNext = new THREE.Matrix4().multiplyMatrices(inv, mF);
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const sc = new THREE.Vector3();
        mNext.decompose(pos, quat, sc);
        const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
        furniture.setPosition([pos.x, pos.y, pos.z]);
        furniture.setRotation([euler.x, euler.y, euler.z]);
        if (furniture.isWallpaper?.()) {
          (furniture as WallpaperItem).reorientPlaneToWall();
        }
        furniture.syncTransformFromGroup();
        this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
      }
    }

    const g = this.homeModel.getGroup();
    g.position.copy(homeLocalSnapshot.position);
    g.quaternion.copy(homeLocalSnapshot.quaternion);
    g.scale.copy(homeLocalSnapshot.scale);
    g.updateMatrix();
    g.updateMatrixWorld(true);
    this.homeModel.syncTransformFromGroup();

    for (const furniture of this.furnitureItems.values()) {
      const id = furniture.getId();
      const snap = this.deployedSpatialSnapshots.get(id);
      if (!snap || snap.coordinate_frame !== 'home_local') {
        continue;
      }

      const interp = this.interpretSpatialDataForLoad(snap);
      furniture.setPosition(interp.position);
      furniture.setRotation(interp.rotation);
      if (interp.wallPlacement) {
        furniture.setWallPlacement(interp.wallPlacement);
      }
      if (furniture.isWallpaper?.()) {
        (furniture as WallpaperItem).reorientPlaneToWall();
      }
      furniture.syncTransformFromGroup();
      this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
    }

    this.updateRoomBoundaryFromHomeModel();
    this.updateRoomBoundaryFromHomeModelWallpaper();
    void this.updateAllCollisions();
  }

  refreshDeployedSpatialSnapshotFromLive(itemId: string): void {
    const f = this.furnitureItems.get(itemId);
    if (!f || !this.homeModel) return;
    this.deployedSpatialSnapshots.set(itemId, this.serializeFurnitureForStorage(f) as Record<string, unknown>);
  }

  private findWallIdForWorldPlacement(wp: WallPlacementInfo): string | null {
    const walls = this.getAvailableWalls();
    let best: { id: string; dot: number } | null = null;
    for (const w of walls) {
      const dot =
        wp.wallNormal[0] * w.wallNormal[0] +
        wp.wallNormal[1] * w.wallNormal[1] +
        wp.wallNormal[2] * w.wallNormal[2];
      const ad = Math.abs(dot);
      if (ad > 0.95 && (!best || ad > best.dot)) {
        best = { id: w.id, dot: ad };
      }
    }
    return best?.id ?? null;
  }

  serializeFurnitureForStorage(furniture: FurnitureItem): Record<string, unknown> {
    furniture.syncTransformFromGroup();
    const base = furniture.serialize();

    if (!this.homeModel) {
      return { ...base, coordinate_frame: 'world' };
    }

    this.homeModel.getGroup().updateMatrixWorld(true);
    const invHome = new THREE.Matrix4().copy(this.homeModel.getGroup().matrixWorld).invert();

    const posW = new THREE.Vector3();
    furniture.getGroup().getWorldPosition(posW);
    const posL = posW.clone().applyMatrix4(invHome);

    const qW = new THREE.Quaternion();
    furniture.getGroup().getWorldQuaternion(qW);
    const qH = new THREE.Quaternion();
    this.homeModel.getGroup().getWorldQuaternion(qH);
    const qL = qH.clone().invert().multiply(qW);
    const eL = new THREE.Euler().setFromQuaternion(qL, 'XYZ');

    const positions = [posL.x, posL.y, posL.z, 0] as [number, number, number, number];

    const out: Record<string, unknown> = {
      ...base,
      positions,
      position: positions,
      rotation: [eL.x, eL.y, eL.z],
      coordinate_frame: 'home_local',
    };

    if (furniture.isOnWall()) {
      const wp = furniture.getWallPlacement();
      if (wp) {
        const wallId = this.findWallIdForWorldPlacement(wp);
        if (wallId) {
          out.wall_side_id = wallId;
        }
      }
    }

    return out;
  }

  serializeScene(): Record<string, unknown> {
    const deployedItems: Record<string, unknown> = {};

    this.furnitureItems.forEach((furniture) => {
      const catalogId = furniture.getId().includes('-') 
        ? furniture.getId().split('-')[0] 
        : furniture.getId();

      deployedItems[catalogId] = this.serializeFurnitureForStorage(furniture);
    });

    return {
      home: this.homeModel?.serialize(),
      deployedItems,
    };
  }

  setDebugMode(enabled: boolean): void {
    this.config.enableDebugMode = enabled;
    this.collisionDetector.setDebugMode(enabled);
  }

  setCollisionDetection(enabled: boolean): void {
    this.config.enableCollisionDetection = enabled;
  }

  // Update all furniture animations
  updateAnimations(delta: number): void {
    this.furnitureItems.forEach((furniture) => {
      furniture.update(delta);
    });
  }

  dispose(): void {
    this.clearAllFurniture();
    
    if (this.homeModel) {
      this.scene.remove(this.homeModel.getGroup());
      this.homeModel.dispose();
      this.homeModel = null;
    }
    
    this.collisionDetector.clear();
  }
}