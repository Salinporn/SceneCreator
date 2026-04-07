import * as THREE from 'three';
import { HomeObject, type PlacementMode } from './HomeObject';

export class Appliances extends HomeObject {
  public wattage: number;
  public isOn: boolean = false;
  public requiresOutlet: boolean;

  constructor(
    id: number,
    name: string,
    description: string = '',
    modelId: number = 0,
    image: string = '',
    type: string = 'appliance',
    isContainer: boolean = false,
    wattage: number = 0,
    requiresOutlet: boolean = true,
  ) {
    super(id, name, description, modelId, image, 'appliances', type, isContainer);
    this.wattage = wattage;
    this.requiresOutlet = requiresOutlet;
  }

  get placementMode(): PlacementMode {
    return 'floor';
  }

  getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromCenterAndSize(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0.5, 1, 0.5));
    return box;
  }

  powerOn(): void {
    this.isOn = true;
    console.info(`${this.constructor.name} '${this.name}' powered ON`);
  }

  powerOff(): void {
    this.isOn = false;
    console.info(`${this.constructor.name} '${this.name}' powered OFF`);
  }

  toggle(): boolean {
    // this.isOn ? this.powerOff() : this.powerOn();
    return this.isOn;
  }

  toJSON(): object {
    return { ...super.toJSON(), wattage: this.wattage, isOn: this.isOn, requiresOutlet: this.requiresOutlet };
  }
}

export class Fan extends Appliances {
  public speedLevels: number;
  public currentSpeed: number = 0;
  public oscillates: boolean;

  constructor(
    id: number,
    name: string = 'Fan',
    description: string = '',
    modelId: number = 0,
    image: string = '',
    speedLevels: number = 3,
    oscillates: boolean = true,
    wattage: number = 55,
  ) {
    super(id, name, description, modelId, image, 'fan', false, wattage);
    this.speedLevels = speedLevels;
    this.oscillates = oscillates;
  }

  setSpeed(level: number): void {
    if (level < 0 || level > this.speedLevels) {
      throw new RangeError(`Speed must be 0-${this.speedLevels}, got ${level}`);
    }
    this.currentSpeed = level;
    this.isOn = level > 0;
  }

  powerOn(): void {
    super.powerOn();
    if (this.currentSpeed === 0) this.currentSpeed = 1;
  }

  powerOff(): void {
    super.powerOff();
    this.currentSpeed = 0;
  }

  toJSON(): object {
    return { ...super.toJSON(), speedLevels: this.speedLevels, currentSpeed: this.currentSpeed, oscillates: this.oscillates };
  }
}
