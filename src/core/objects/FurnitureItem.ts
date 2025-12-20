import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Base3DObject, Transform } from './Base3DObject';

export interface FurnitureMetadata {
  description?: string;
  category?: string;
  type?: string;
  isContainer?: boolean;
  image?: string;
}

export class FurnitureItem extends Base3DObject {
  protected metadata: FurnitureMetadata;
  protected isSelected: boolean = false;
  protected hasCollision: boolean = false;
  protected loader: GLTFLoader;
  protected selectionIndicator: THREE.Group | null = null;
  protected collisionIndicator: THREE.Group | null = null;

  constructor(
    id: string,
    name: string,
    modelId: number,
    modelPath: string | null,
    metadata: FurnitureMetadata = {},
    initialTransform?: Partial<Transform>
  ) {
    super(id, name, modelId, modelPath, initialTransform);
    this.metadata = metadata;
    this.loader = new GLTFLoader();
  }

  protected async fetchModel(path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => resolve(gltf.scene),
        undefined,
        reject
      );
    });
  }

  protected setupModel(model: THREE.Group): void {
    const clonedModel = model.clone();
    this.modelGroup.clear();
    
    // Align to floor
    const box = new THREE.Box3().setFromObject(clonedModel);
    const minY = box.min.y;
    clonedModel.position.y = -minY;
    
    this.modelGroup.add(clonedModel);
  }

  protected onModelLoaded(model: THREE.Group): void {
    void model;
  }

  protected onModelLoadError(error: unknown): void {
    console.error(`FurnitureItem ${this.name} failed to load:`, error);
  }

  getMetadata(): FurnitureMetadata {
    return { ...this.metadata };
  }

  isContainerType(): boolean {
    return this.metadata.isContainer || false;
  }

  select(): void {
    if (this.isSelected) return;
    this.isSelected = true;
    this.updateSelectionIndicator();
  }

  deselect(): void {
    if (!this.isSelected) return;
    this.isSelected = false;
    this.updateSelectionIndicator();
  }

  toggleSelection(): void {
    this.isSelected ? this.deselect() : this.select();
  }

  getIsSelected(): boolean {
    return this.isSelected;
  }

  // Collision management
  setCollision(hasCollision: boolean): void {
    this.hasCollision = hasCollision;
    this.updateCollisionIndicator();
  }

  getHasCollision(): boolean {
    return this.hasCollision;
  }

  protected updateSelectionIndicator(): void {
    if (this.selectionIndicator) {
      this.group.remove(this.selectionIndicator);
      this.selectionIndicator = null;
    }

    if (this.isSelected) {
      this.selectionIndicator = this.createSelectionIndicator();
      this.group.add(this.selectionIndicator);
    }
  }

  protected createSelectionIndicator(): THREE.Group {
    const indicator = new THREE.Group();
    
    const ringGeometry = new THREE.RingGeometry(0.3, 0.35, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: this.hasCollision ? 0xff0000 : 0x00ff00,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    indicator.add(ring);

    const coneGeometry = new THREE.ConeGeometry(0.05, 0.1, 8);
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: this.hasCollision ? 0xff0000 : 0xffff00,
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.rotation.x = -Math.PI / 2;
    cone.position.set(0, 0.01, 0.35);
    indicator.add(cone);

    return indicator;
  }

  protected updateCollisionIndicator(): void {
    if (this.collisionIndicator) {
      this.group.remove(this.collisionIndicator);
      this.collisionIndicator = null;
    }

    if (this.hasCollision && !this.isSelected) {
      this.collisionIndicator = this.createCollisionIndicator();
      this.group.add(this.collisionIndicator);
    }

    if (this.isSelected) {
      this.updateSelectionIndicator();
    }
  }

  protected createCollisionIndicator(): THREE.Group {
    const indicator = new THREE.Group();
    
    const ringGeometry = new THREE.RingGeometry(0.25, 0.3, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    indicator.add(ring);

    return indicator;
  }

  async moveWithValidation(
    newPosition: [number, number, number],
    validator?: (item: FurnitureItem) => Promise<boolean>
  ): Promise<boolean> {
    const originalPosition = this.getPosition();
    this.setPosition(newPosition);

    if (validator) {
      const isValid = await validator(this);
      if (!isValid) {
        this.setPosition(originalPosition);
        return false;
      }
    }

    return true;
  }

  clone(): FurnitureItem {
    return new FurnitureItem(
      `${this.id}-${Date.now()}`,
      this.name,
      this.modelId,
      this.modelPath,
      this.metadata,
      {
        position: this.getPosition(),
        rotation: this.getRotation(),
        scale: this.getScale(),
      }
    );
  }

  serialize(): Record<string, any> {
    const scale = this.getScale();
    const scaleArray = typeof scale === 'number' ? [scale, scale, scale] : scale;

    return {
      id: this.id,
      position: [...this.getPosition(), 0],
      rotation: this.getRotation(),
      scale: scaleArray,
      is_container: this.isContainerType(),
      contain: this.isContainerType() ? [] : undefined,
      composite: !this.isContainerType() ? [] : undefined,
      texture_id: null,
    };
  }

  dispose(): void {
    if (this.selectionIndicator) {
      this.group.remove(this.selectionIndicator);
      this.selectionIndicator = null;
    }
    if (this.collisionIndicator) {
      this.group.remove(this.collisionIndicator);
      this.collisionIndicator = null;
    }
    super.dispose();
  }
}