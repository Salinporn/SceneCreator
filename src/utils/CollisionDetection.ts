import * as THREE from 'three';

/**
 * Collision detection utilities for VR scene furniture placement
 * Implements bounding box collision detection between furniture items and room boundaries
 */

export interface CollisionResult {
  hasCollision: boolean;
  collidingObjects: string[];
  penetrationDepth?: number;
  collisionNormal?: THREE.Vector3;
}

export class CollisionDetector {
  private static instance: CollisionDetector;
  private furnitureBoxes: Map<string, THREE.Box3> = new Map();
  private roomBox: THREE.Box3 | null = null;
  private roomBoundary: any = null;
  private helperMeshes: Map<string, THREE.Mesh> = new Map();
  private showDebugBoxes: boolean = false;

  private constructor() {}

  static getInstance(): CollisionDetector {
    if (!CollisionDetector.instance) {
      CollisionDetector.instance = new CollisionDetector();
    }
    return CollisionDetector.instance;
  }

  /**
   * Enable or disable debug visualization of bounding boxes
   */
  setDebugMode(enabled: boolean) {
    this.showDebugBoxes = enabled;
    if (!enabled) {
      this.helperMeshes.forEach(mesh => {
        if (mesh.parent) {
          mesh.parent.remove(mesh);
        }
      });
      this.helperMeshes.clear();
    }
  }

  /**
   * Initialize room boundaries from spatial data
   */
  setRoomBoundary(boundary: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
    min_z: number;
    max_z: number;
  }) {
    this.roomBoundary = boundary;
    this.roomBox = new THREE.Box3(
      new THREE.Vector3(boundary.min_x, boundary.min_y, boundary.min_z),
      new THREE.Vector3(boundary.max_x, boundary.max_y, boundary.max_z)
    );
    
    console.log('🏠 Room boundary set:', this.roomBox);
  }

  /**
   * Update or add furniture bounding box
   */
  updateFurnitureBox(itemId: string, object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object);
    this.furnitureBoxes.set(itemId, box);

    // Create or update debug visualization
    if (this.showDebugBoxes) {
      this.createDebugBox(itemId, box, object.parent);
    }
  }

  /**
   * Remove furniture from collision detection
   */
  removeFurniture(itemId: string) {
    this.furnitureBoxes.delete(itemId);
    const helper = this.helperMeshes.get(itemId);
    if (helper && helper.parent) {
      helper.parent.remove(helper);
    }
    this.helperMeshes.delete(itemId);
  }

  /**
   * Check if furniture collides with room boundaries
   * Note: We allow furniture to sit on the floor, so we don't check Y-axis min collision
   */
  checkRoomCollision(itemId: string): CollisionResult {
    const box = this.furnitureBoxes.get(itemId);
    
    if (!box || !this.roomBox) {
      return { hasCollision: false, collidingObjects: [] };
    }

    // Small tolerance to prevent false positives from floating point precision
    const EPSILON = 0.01;
    
    // Check X and Z boundaries (walls), but allow furniture to sit on floor
    const isOutsideX = box.min.x < this.roomBox.min.x - EPSILON || 
                       box.max.x > this.roomBox.max.x + EPSILON;
    const isOutsideZ = box.min.z < this.roomBox.min.z - EPSILON || 
                       box.max.z > this.roomBox.max.z + EPSILON;
    
    // Only check if furniture goes through ceiling, not floor
    const isThroughCeiling = box.max.y > this.roomBox.max.y + EPSILON;
    
    const hasCollision = isOutsideX || isOutsideZ || isThroughCeiling;
    
    if (!hasCollision) {
      return { hasCollision: false, collidingObjects: [] };
    }

    // Calculate penetration for correction
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    const roomCenter = new THREE.Vector3();
    this.roomBox.getCenter(roomCenter);

    const normal = new THREE.Vector3().subVectors(roomCenter, center);
    normal.y = 0; // Don't push furniture up/down, only horizontally
    normal.normalize();

    return {
      hasCollision: true,
      collidingObjects: ['room'],
      collisionNormal: normal,
    };
  }

  /**
   * Check if furniture collides with other furniture
   */
  checkFurnitureCollisions(itemId: string): CollisionResult {
    const box = this.furnitureBoxes.get(itemId);
    
    if (!box) {
      return { hasCollision: false, collidingObjects: [] };
    }

    const collidingObjects: string[] = [];

    this.furnitureBoxes.forEach((otherBox, otherId) => {
      if (otherId !== itemId) {
        if (box.intersectsBox(otherBox)) {
          collidingObjects.push(otherId);
        }
      }
    });

    return {
      hasCollision: collidingObjects.length > 0,
      collidingObjects,
    };
  }

  /**
   * Check all collisions for a furniture item
   */
  checkAllCollisions(itemId: string): CollisionResult {
    const roomCollision = this.checkRoomCollision(itemId);
    const furnitureCollision = this.checkFurnitureCollisions(itemId);

    return {
      hasCollision: roomCollision.hasCollision || furnitureCollision.hasCollision,
      collidingObjects: [
        ...roomCollision.collidingObjects,
        ...furnitureCollision.collidingObjects,
      ],
      collisionNormal: roomCollision.collisionNormal,
    };
  }

  /**
   * Find valid position near desired position (resolve collision)
   */
  findValidPosition(
    itemId: string,
    desiredPosition: THREE.Vector3,
    object: THREE.Object3D,
    maxAttempts: number = 8
  ): THREE.Vector3 | null {
    // Try the desired position first
    const originalPosition = object.position.clone();
    object.position.copy(desiredPosition);
    this.updateFurnitureBox(itemId, object);

    const collision = this.checkAllCollisions(itemId);
    if (!collision.hasCollision) {
      return desiredPosition.clone();
    }

    // Try positions in a circle around the desired position
    const radius = 0.5;
    const angleStep = (Math.PI * 2) / maxAttempts;

    for (let i = 0; i < maxAttempts; i++) {
      const angle = angleStep * i;
      const testPosition = new THREE.Vector3(
        desiredPosition.x + Math.cos(angle) * radius,
        desiredPosition.y,
        desiredPosition.z + Math.sin(angle) * radius
      );

      object.position.copy(testPosition);
      this.updateFurnitureBox(itemId, object);

      const testCollision = this.checkAllCollisions(itemId);
      if (!testCollision.hasCollision) {
        return testPosition.clone();
      }
    }

    // Restore original position and return null
    object.position.copy(originalPosition);
    this.updateFurnitureBox(itemId, object);
    return null;
  }

  /**
   * Create debug visualization box
   */
  private createDebugBox(itemId: string, box: THREE.Box3, parent: THREE.Object3D | null) {
    // Remove old helper if exists
    const oldHelper = this.helperMeshes.get(itemId);
    if (oldHelper && oldHelper.parent) {
      oldHelper.parent.remove(oldHelper);
    }

    const size = new THREE.Vector3();
    box.getSize(size);
    
    const center = new THREE.Vector3();
    box.getCenter(center);

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });

    const helper = new THREE.Mesh(geometry, material);
    helper.position.copy(center);

    if (parent) {
      parent.add(helper);
    }

    this.helperMeshes.set(itemId, helper);
  }

  /**
   * Get all furniture boxes for visualization or analysis
   */
  getAllFurnitureBoxes(): Map<string, THREE.Box3> {
    return new Map(this.furnitureBoxes);
  }

  /**
   * Clear all collision data
   */
  clear() {
    this.furnitureBoxes.clear();
    this.roomBox = null;
    this.roomBoundary = null;
    this.helperMeshes.forEach(mesh => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
    });
    this.helperMeshes.clear();
  }

  /**
   * Check if a position is valid (no collisions)
   */
  isPositionValid(
    itemId: string,
    position: THREE.Vector3,
    object: THREE.Object3D
  ): boolean {
    const originalPosition = object.position.clone();
    object.position.copy(position);
    this.updateFurnitureBox(itemId, object);

    const collision = this.checkAllCollisions(itemId);
    
    // Restore original position
    object.position.copy(originalPosition);
    this.updateFurnitureBox(itemId, object);

    return !collision.hasCollision;
  }

  /**
   * Get distance to nearest collision
   */
  getDistanceToNearestCollision(itemId: string): number {
    const box = this.furnitureBoxes.get(itemId);
    if (!box) return Infinity;

    let minDistance = Infinity;

    // Check distance to other furniture
    this.furnitureBoxes.forEach((otherBox, otherId) => {
      if (otherId !== itemId) {
        const distance = box.distanceToBox(otherBox);
        minDistance = Math.min(minDistance, distance);
      }
    });

    return minDistance;
  }

  /**
   * Prevent furniture from going through walls
   * Returns corrected position
   */
  constrainToRoom(position: THREE.Vector3, itemBox: THREE.Box3): THREE.Vector3 {
    if (!this.roomBox) return position;

    const correctedPosition = position.clone();
    const size = new THREE.Vector3();
    itemBox.getSize(size);

    const halfSize = size.clone().multiplyScalar(0.5);

    // Constrain X
    if (correctedPosition.x - halfSize.x < this.roomBox.min.x) {
      correctedPosition.x = this.roomBox.min.x + halfSize.x;
    }
    if (correctedPosition.x + halfSize.x > this.roomBox.max.x) {
      correctedPosition.x = this.roomBox.max.x - halfSize.x;
    }

    // Constrain Y - only prevent going through ceiling, not floor
    // Furniture should be allowed to sit on floor (min Y)
    if (correctedPosition.y + halfSize.y > this.roomBox.max.y) {
      correctedPosition.y = this.roomBox.max.y - halfSize.y;
    }

    // Constrain Z
    if (correctedPosition.z - halfSize.z < this.roomBox.min.z) {
      correctedPosition.z = this.roomBox.min.z + halfSize.z;
    }
    if (correctedPosition.z + halfSize.z > this.roomBox.max.z) {
      correctedPosition.z = this.roomBox.max.z - halfSize.z;
    }

    return correctedPosition;
  }
}

// Export singleton instance
export const collisionDetector = CollisionDetector.getInstance();