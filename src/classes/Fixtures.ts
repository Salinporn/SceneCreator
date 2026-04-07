import * as THREE from 'three';
import { HomeObject, type PlacementMode } from './HomeObject';

export class Fixtures extends HomeObject {
  public isPermanent: boolean;
  public requiresPlumbing: boolean;
  public requiresElectrical: boolean;

  constructor(
    id: number,
    name: string,
    description: string = '',
    modelId: number = 0,
    image: string = '',
    type: string = 'fixture',
    isContainer: boolean = false,
    isPermanent: boolean = true,
    requiresPlumbing: boolean = false,
    requiresElectrical: boolean = false,
  ) {
    super(id, name, description, modelId, image, 'fixtures', type, isContainer);
    this.isPermanent = isPermanent;
    this.requiresPlumbing = requiresPlumbing;
    this.requiresElectrical = requiresElectrical;
  }

  get placementMode(): PlacementMode {
    return 'floor';
  }

  getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromCenterAndSize(new THREE.Vector3(0, 0.4, 0), new THREE.Vector3(0.6, 0.8, 0.6));
    return box;
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      isPermanent: this.isPermanent,
      requiresPlumbing: this.requiresPlumbing,
      requiresElectrical: this.requiresElectrical,
    };
  }
}

export class Toilet extends Fixtures {
  public hasBidet: boolean;
  public flushType: 'single' | 'dual' | 'automatic';

  constructor(
    id: number,
    name: string = 'Toilet',
    description: string = '',
    modelId: number = 0,
    image: string = '',
    hasBidet: boolean = false,
    flushType: 'single' | 'dual' | 'automatic' = 'dual',
  ) {
    super(id, name, description, modelId, image, 'toilet', false, true, true);
    this.hasBidet = hasBidet;
    this.flushType = flushType;
  }

  flush(): void {
    console.info(`Toilet ${this.id}: flush triggered (${this.flushType} mode)`);
  }

  toJSON(): object {
    return { ...super.toJSON(), hasBidet: this.hasBidet, flushType: this.flushType };
  }
}

export class Sink extends Fixtures {
  public basinCount: number;
  public faucetType: 'manual' | 'sensor' | 'mixer';
  public isWallMounted: boolean;

  constructor(
    id: number,
    name: string = 'Sink',
    description: string = '',
    modelId: number = 0,
    image: string = '',
    basinCount: number = 1,
    faucetType: 'manual' | 'sensor' | 'mixer' = 'mixer',
    isWallMounted: boolean = false,
  ) {
    super(id, name, description, modelId, image, 'sink', false, true, true);
    this.basinCount = basinCount;
    this.faucetType = faucetType;
    this.isWallMounted = isWallMounted;
  }

  get placementMode(): PlacementMode {
    return this.isWallMounted ? 'wall' : 'floor';
  }

  runWater(): void {
    console.info(`Sink ${this.id}: running water (${this.faucetType} faucet)`);
  }

  toJSON(): object {
    return { ...super.toJSON(), basinCount: this.basinCount, faucetType: this.faucetType, isWallMounted: this.isWallMounted };
  }
}
