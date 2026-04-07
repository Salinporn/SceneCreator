import * as THREE from 'three';

export type PlacementMode = 'floor' | 'wall';

export abstract class HomeObject {
  public id: number;
  public name: string;
  public description: string;
  public modelId: number;
  public image: string; // base64
  public category: string;
  public type: string;
  public isContainer: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    id: number,
    name: string,
    description: string = '',
    modelId: number = 0,
    image: string = '',
    category: string = '',
    type: string = '',
    isContainer: boolean = false,
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.modelId = modelId;
    this.image = image;
    this.category = category;
    this.type = type;
    this.isContainer = isContainer;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  abstract get placementMode(): PlacementMode;

  // Return the approximate axis-aligned bounding box for this object based on its catalogue dimensions.
  abstract getBoundingBox(): THREE.Box3;

  update(fields: Partial<Omit<this, 'id' | 'createdAt' | 'updatedAt'>>): void {
    Object.assign(this, fields);
    this.updatedAt = new Date();
  }

  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      modelId: this.modelId,
      image: this.image,
      category: this.category,
      type: this.type,
      isContainer: this.isContainer,
      placementMode: this.placementMode,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

export class VirtualObject {
  public id: number;
  public name: string;
  public description: string;
  public modelId: number;

  constructor(
    id: number,
    name: string,
    description: string = '',
    modelId: number = 0,
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.modelId = modelId;
  }

  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      modelId: this.modelId,
      type: this.constructor.name,
    };
  }
}

export class Widget extends VirtualObject {
  public panelSize: [number, number];
  public isHeadLocked: boolean;

  constructor(
    id: number,
    name: string,
    description: string = '',
    modelId: number = 0,
    panelSize: [number, number] = [0.4, 0.3],
    isHeadLocked: boolean = false,
  ) {
    super(id, name, description, modelId);
    this.panelSize = panelSize;
    this.isHeadLocked = isHeadLocked;
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      panelSize: this.panelSize,
      isHeadLocked: this.isHeadLocked,
    };
  }
}

export class AnimatedObject extends Widget {
  private _animationName: string | null;
  private _loop: boolean;
  private _isPlaying: boolean = false;

  constructor(
    id: number,
    name: string,
    description: string = '',
    modelId: number = 0,
    panelSize: [number, number] = [0.4, 0.3],
    isHeadLocked: boolean = false,
    animationName: string | null = null,
    loop: boolean = true,
  ) {
    super(id, name, description, modelId, panelSize, isHeadLocked);
    this._animationName = animationName;
    this._loop = loop;
  }

  animate(): void {
    if (!this._animationName) {
      console.warn(`AnimatedObject ${this.id}: no animation clip set`);
      return;
    }
    this._isPlaying = true;
    console.info(`AnimatedObject '${this.name}': playing '${this._animationName}' (loop=${this._loop})`);
  }

  stop(): void {
    this._isPlaying = false;
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      animationName: this._animationName,
      loop: this._loop,
      isPlaying: this._isPlaying,
    };
  }
}
