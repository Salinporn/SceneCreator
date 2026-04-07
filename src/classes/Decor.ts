import * as THREE from 'three';
import { HomeObject, type PlacementMode } from './HomeObject';
import type { Texture } from './Texture';

export class Decor extends HomeObject {
  public isWallMounted: boolean;

  constructor(
    id: number,
    name: string,
    description: string = '',
    modelId: number = 0,
    image: string = '',
    type: string = 'decor',
    isContainer: boolean = false,
    isWallMounted: boolean = false,
  ) {
    super(id, name, description, modelId, image, 'decor', type, isContainer);
    this.isWallMounted = isWallMounted;
  }

  get placementMode(): PlacementMode {
    return this.isWallMounted ? 'wall' : 'floor';
  }

  getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromCenterAndSize(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(1, 1, 0.05));
    return box;
  }

  toJSON(): object {
    return { ...super.toJSON(), isWallMounted: this.isWallMounted };
  }
}

export class Wallpaper extends Decor {
  public texture: Texture | null;
  public tiling: [number, number];
  public roughness: number;

  constructor(
    id: number,
    name: string = 'Wallpaper',
    description: string = '',
    modelId: number = 0,
    image: string = '',
    texture: Texture | null = null,
    tiling: [number, number] = [1, 1],
    roughness: number = 0.8,
  ) {
    super(id, name, description, modelId, image, 'wallpaper', false, true); // always wall-mounted
    this.texture = texture;
    this.tiling = tiling;
    this.roughness = roughness;
  }

  applyToWall(wallId: string): void {
    if (!this.texture) {
      console.warn(`Wallpaper ${this.id}: no texture set — applying blank material`);
    }
    console.info(`Wallpaper '${this.name}' applied to wall '${wallId}'`);
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      texture: this.texture?.toJSON(false) ?? null,
      tiling: this.tiling,
      roughness: this.roughness,
    };
  }
}
