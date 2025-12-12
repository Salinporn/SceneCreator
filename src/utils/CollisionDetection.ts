import * as THREE from 'three';
const API_BASE_URL = import.meta.env.VITE_API_URL;
const COLLISION_API_URL = API_BASE_URL
  ? `${API_BASE_URL}/digitalhomes/overlap_check/`
  : null;

interface CollisionApiOverlapResult {
  result?: {
    status?: string;
    overlap?: boolean;
  };
}
export interface CollisionResult {
  hasCollision: boolean;
  collidingObjects: string[];
  penetrationDepth?: number;
  collisionNormal?: THREE.Vector3;
}

export class CollisionDetector {
  private static instance: CollisionDetector;
  private furnitureBoxes: Map<string, THREE.Box3> = new Map();
  private furnitureTransforms: Map<
    string,
    {
      modelId?: number;
      position: THREE.Vector3;
      rotation: THREE.Euler;
      scale: THREE.Vector3;
    }
  > = new Map();
  private roomBox: THREE.Box3 | null = null;
  private helperMeshes: Map<string, THREE.Mesh> = new Map();
  private showDebugBoxes: boolean = false;

  private constructor() {}

  private computeBoxDistance(boxA: THREE.Box3, boxB: THREE.Box3): number {
    // Get the overlap along each axis
    const dx = Math.max(0, Math.max(boxB.min.x - boxA.max.x, boxA.min.x - boxB.max.x));
    const dy = Math.max(0, Math.max(boxB.min.y - boxA.max.y, boxA.min.y - boxB.max.y));
    const dz = Math.max(0, Math.max(boxB.min.z - boxA.max.z, boxA.min.z - boxB.max.z));

    // Return Euclidean distance between nearest edges
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }


  static getInstance(): CollisionDetector {
    if (!CollisionDetector.instance) {
      CollisionDetector.instance = new CollisionDetector();
    }
    return CollisionDetector.instance;
  }

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

  setRoomBoundary(boundary: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
    min_z: number;
    max_z: number;
  }) {
    this.roomBox = new THREE.Box3(
      new THREE.Vector3(boundary.min_x, boundary.min_y, boundary.min_z),
      new THREE.Vector3(boundary.max_x, boundary.max_y, boundary.max_z)
    );
  }

  updateFurnitureBox(itemId: string, object: THREE.Object3D, modelId?: number) {
    const box = new THREE.Box3().setFromObject(object);
    this.furnitureBoxes.set(itemId, box);

    // Capture world-space transform for precise collision checks
    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    object.getWorldPosition(worldPosition);
    object.getWorldQuaternion(worldQuaternion);
    object.getWorldScale(worldScale);

    const worldRotation = new THREE.Euler().setFromQuaternion(worldQuaternion);

    const existing = this.furnitureTransforms.get(itemId);

    this.furnitureTransforms.set(itemId, {
      modelId: modelId ?? existing?.modelId,
      position: worldPosition.clone(),
      rotation: worldRotation.clone(),
      scale: worldScale.clone(),
    });

    if (this.showDebugBoxes) {
      this.createDebugBox(itemId, box, object.parent);
    }
  }

  removeFurniture(itemId: string) {
    this.furnitureBoxes.delete(itemId);
    this.furnitureTransforms.delete(itemId);
    const helper = this.helperMeshes.get(itemId);
    if (helper && helper.parent) {
      helper.parent.remove(helper);
    }
    this.helperMeshes.delete(itemId);
  }

  checkRoomCollision(itemId: string): CollisionResult {
    const box = this.furnitureBoxes.get(itemId);
    
    if (!box || !this.roomBox) {
      return { hasCollision: false, collidingObjects: [] };
    }

    const EPSILON = 0.01;
    
    const isOutsideX = box.min.x < this.roomBox.min.x - EPSILON || 
                       box.max.x > this.roomBox.max.x + EPSILON;
    const isOutsideZ = box.min.z < this.roomBox.min.z - EPSILON || 
                       box.max.z > this.roomBox.max.z + EPSILON;
    
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
    normal.y = 0;
    normal.normalize();

    return {
      hasCollision: true,
      collidingObjects: ['room'],
      collisionNormal: normal,
    };
  }

  private getModelDetails(itemId: string) {
    const transform = this.furnitureTransforms.get(itemId);
    if (!transform || transform.modelId === undefined) return null;

    return {
      modelId: transform.modelId,
      position: [
        transform.position.x,
        transform.position.y,
        transform.position.z,
        0,
      ],
      rotation: [
        transform.rotation.x,
        transform.rotation.y,
        transform.rotation.z,
      ],
      scale: [
        transform.scale.x,
        transform.scale.y,
        transform.scale.z,
      ],
    };
  }

  private async checkModelsOverlapWithApi(
    mainItemId: string,
    otherItemId: string
  ): Promise<boolean> {
    if (!COLLISION_API_URL) {
      console.warn(
        'Model collision API URL not configured; falling back to AABB collision.'
      );
      return true;
    }

    const mainDetails = this.getModelDetails(mainItemId);
    const otherDetails = this.getModelDetails(otherItemId);

    if (!mainDetails || !otherDetails) {
      console.warn(
        'Missing model details for precise collision check; falling back to AABB collision.'
      );
      return true;
    }

    const payloadMain = { [mainDetails.modelId]: {
      position: mainDetails.position,
      rotation: mainDetails.rotation,
      scale: mainDetails.scale,
    }};

    const payloadOthers = { [otherDetails.modelId]: {
      position: otherDetails.position,
      rotation: otherDetails.rotation,
      scale: otherDetails.scale,
    }};

    const formData = new FormData();
    formData.append('main_model_details', JSON.stringify(payloadMain));
    formData.append('model_details_list', JSON.stringify(payloadOthers));

    try {
      const response = await fetch(COLLISION_API_URL, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('Collision API responded with error status:', response.status);
        return true;
      }

      const data = await response.json();

      // Prefer explicit contain_overlap flag, otherwise fallback to truthy results
      if (typeof data?.contain_overlap === 'boolean') {
        return data.contain_overlap;
      }

      const results = Array.isArray(data?.results)
        ? (data.results as CollisionApiOverlapResult[])
        : null;

      if (results) {
        return results.some(
          r => r?.result?.status !== 'error' && r?.result?.overlap === true
        );
      }

      return true;
    } catch (error) {
      console.error('Failed to call collision API, assuming collision:', error);
      return true;
    }
  }

  async checkFurnitureCollisions(itemId: string): Promise<CollisionResult> {
    const box = this.furnitureBoxes.get(itemId);
    
    if (!box) {
      return { hasCollision: false, collidingObjects: [] };
    }

    const collidingObjects: string[] = [];

    for (const [otherId, otherBox] of this.furnitureBoxes.entries()) {
      if (otherId === itemId) continue;
      if (!box.intersectsBox(otherBox)) continue;

      const hasPreciseOverlap = await this.checkModelsOverlapWithApi(itemId, otherId);
      if (hasPreciseOverlap) {
        collidingObjects.push(otherId);
      }
    }

    return {
      hasCollision: collidingObjects.length > 0,
      collidingObjects,
    };
  }

  async checkAllCollisions(itemId: string): Promise<CollisionResult> {
    const roomCollision = this.checkRoomCollision(itemId);
    const furnitureCollision = await this.checkFurnitureCollisions(itemId);

    return {
      hasCollision: roomCollision.hasCollision || furnitureCollision.hasCollision,
      collidingObjects: [
        ...roomCollision.collidingObjects,
        ...furnitureCollision.collidingObjects,
      ],
      collisionNormal: roomCollision.collisionNormal,
    };
  }

  async findValidPosition(
    itemId: string,
    desiredPosition: THREE.Vector3,
    object: THREE.Object3D,
    maxAttempts: number = 8
  ): Promise<THREE.Vector3 | null> {
    // Try the desired position first
    const originalPosition = object.position.clone();
    object.position.copy(desiredPosition);
    this.updateFurnitureBox(itemId, object);

    const collision = await this.checkAllCollisions(itemId);
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

      const testCollision = await this.checkAllCollisions(itemId);
      if (!testCollision.hasCollision) {
        return testPosition.clone();
      }
    }

    // Restore original position and return null
    object.position.copy(originalPosition);
    this.updateFurnitureBox(itemId, object);
    return null;
  }

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

  getAllFurnitureBoxes(): Map<string, THREE.Box3> {
    return new Map(this.furnitureBoxes);
  }

  clear() {
    this.furnitureBoxes.clear();
    this.roomBox = null;
    this.helperMeshes.forEach(mesh => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
    });
    this.helperMeshes.clear();
  }

  async isPositionValid(
    itemId: string,
    position: THREE.Vector3,
    object: THREE.Object3D
  ): Promise<boolean> {
    const originalPosition = object.position.clone();
    object.position.copy(position);
    this.updateFurnitureBox(itemId, object);

    const collision = await this.checkAllCollisions(itemId);
    
    // Restore original position
    object.position.copy(originalPosition);
    this.updateFurnitureBox(itemId, object);

    return !collision.hasCollision;
  }

  getDistanceToNearestCollision(itemId: string): number {
    const box = this.furnitureBoxes.get(itemId);
    if (!box) return Infinity;

    let minDistance = Infinity;

    // Check distance to other furniture
    this.furnitureBoxes.forEach((otherBox, otherId) => {
      if (otherId !== itemId) {
        const distance = this.computeBoxDistance(box, otherBox);
        minDistance = Math.min(minDistance, distance);
      }
    });

    return minDistance;
  }

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

    // Constrain Y 
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