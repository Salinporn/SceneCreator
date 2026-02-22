import * as THREE from 'three';
import { FurnitureItem } from '../objects/FurnitureItem';
import { HomeModel } from '../objects/HomeModel';
import { CollisionDetector } from './CollisionDetector';

export interface SceneConfig {
  enableCollisionDetection?: boolean;
  enableDebugMode?: boolean;
  floorLevel?: number;
}

export interface MoveResult {
  success: boolean;
  needsConfirmation: boolean;
  needsPreciseCheck: boolean;
  reason?: string;
}

export class SceneManager {
  protected scene: THREE.Scene;
  protected homeModel: HomeModel | null = null;
  protected furnitureItems: Map<string, FurnitureItem> = new Map();
  public collisionDetector: CollisionDetector;
  protected config: Required<SceneConfig>;
  protected selectedItemId: string | null = null;
  protected lastValidPositions: Map<string, [number, number, number]> = new Map();

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
    
    const boundary = homeModel.getBoundary();
    if (boundary) {
      this.collisionDetector.setRoomBoundary(boundary);
    }
  }

  getHomeModel(): HomeModel | null {
    return this.homeModel;
  }

  getCollisionDetector(): CollisionDetector {
    return this.collisionDetector;
  }

  async addFurniture(furniture: FurnitureItem): Promise<boolean> {
    if (this.furnitureItems.has(furniture.getId())) {
      return false;
    }

    this.furnitureItems.set(furniture.getId(), furniture);
    this.scene.add(furniture.getGroup());
    
    await furniture.loadModel(this.scene);
    
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

    const collision = await this.collisionDetector.checkAllCollisions(id);
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

    if (!this.config.enableCollisionDetection) {
      furniture.setPosition(newPosition);
      return { success: true, needsConfirmation: false, needsPreciseCheck: false };
    }

    const originalPosition = furniture.getPosition();
    
    // Save last valid position
    if (!this.lastValidPositions.has(id)) {
      this.lastValidPositions.set(id, originalPosition);
    }
    
    // Temporarily move to test position
    furniture.setPosition(newPosition);
    this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
    
    const roomCollision = this.collisionDetector.checkRoomCollision(id);
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
    }
    
    const hasAABBCollision = this.collisionDetector.checkAABBCollisionOnly(id);
    
    if (hasAABBCollision && !skipAABBBlock) {
      furniture.setPosition(originalPosition);
      this.collisionDetector.updateFurnitureBox(id, furniture.getGroup(), furniture.getModelId());
      furniture.setCollision(true);
      return { 
        success: false, 
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
    spawnPos.y = this.config.floorLevel;

    if (this.homeModel) {
      const constrained = this.homeModel.constrainPosition(spawnPos);
      return [constrained.x, constrained.y, constrained.z];
    }

    return [spawnPos.x, spawnPos.y, spawnPos.z];
  }

  serializeScene(): Record<string, any> {
    const deployedItems: Record<string, any> = {};

    this.furnitureItems.forEach((furniture) => {
      const catalogId = furniture.getId().includes('-') 
        ? furniture.getId().split('-')[0] 
        : furniture.getId();
      
      deployedItems[catalogId] = furniture.serialize();
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