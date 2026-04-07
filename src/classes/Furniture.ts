import * as THREE from 'three';
import { HomeObject, type PlacementMode } from './HomeObject';

export class Furniture extends HomeObject {
  public wallMountable: boolean;

  constructor(
    id: number,
    name: string,
    description: string = '',
    modelId: number = 0,
    image: string = '',
    type: string = 'furniture',
    isContainer: boolean = false,
    wallMountable: boolean = false,
  ) {
    super(id, name, description, modelId, image, 'furniture', type, isContainer);
    this.wallMountable = wallMountable;
  }

  get placementMode(): PlacementMode {
    return this.wallMountable ? 'wall' : 'floor';
  }

  //Estimate a bounding box from catalogue dimensions.
  getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromCenterAndSize(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(1, 1, 1));
    return box;
  }

  toJSON(): object {
    return { ...super.toJSON(), wallMountable: this.wallMountable };
  }
}

export class Chair extends Furniture {
  public seatHeightM: number;
  public maxOccupants: number;

  constructor(
    id: number,
    name: string = 'Chair',
    description: string = '',
    modelId: number = 0,
    image: string = '',
    seatHeightM: number = 0.45,
    maxOccupants: number = 1,
  ) {
    super(id, name, description, modelId, image, 'chair', false);
    this.seatHeightM = seatHeightM;
    this.maxOccupants = maxOccupants;
  }

  sit(avatarId: string): void {
    console.info(`Chair ${this.id}: avatar ${avatarId} sitting (seatH=${this.seatHeightM}m)`);
  }

  toJSON(): object {
    return { ...super.toJSON(), seatHeightM: this.seatHeightM, maxOccupants: this.maxOccupants };
  }
}

export class Wardrobe extends Furniture {
  public numSections: number;
  public hasMirror: boolean;

  constructor(
    id: number,
    name: string = 'Wardrobe',
    description: string = '',
    modelId: number = 0,
    image: string = '',
    numSections: number = 2,
    hasMirror: boolean = false,
  ) {
    super(id, name, description, modelId, image, 'wardrobe', true); // always container
    this.numSections = numSections;
    this.hasMirror = hasMirror;
  }

  openDoor(section: number = 0): void {
    if (section >= this.numSections) {
      throw new RangeError(`Section ${section} out of range (0-${this.numSections - 1})`);
    }
    console.info(`Wardrobe ${this.id}: opening door section ${section}`);
  }

  toJSON(): object {
    return { ...super.toJSON(), numSections: this.numSections, hasMirror: this.hasMirror };
  }
}

export class Table extends Furniture {
  public surfaceAreaM2: number;
  public heightM: number;

  constructor(
    id: number,
    name: string = 'Table',
    description: string = '',
    modelId: number = 0,
    image: string = '',
    surfaceAreaM2: number = 1.2,
    heightM: number = 0.75,
    isContainer: boolean = false,
  ) {
    super(id, name, description, modelId, image, 'table', isContainer);
    this.surfaceAreaM2 = surfaceAreaM2;
    this.heightM = heightM;
  }

  // Y coordinate of the table top — used to snap items placed on the surface.
  surfaceY(): number {
    return this.heightM;
  }

  toJSON(): object {
    return { ...super.toJSON(), surfaceAreaM2: this.surfaceAreaM2, heightM: this.heightM };
  }
}
