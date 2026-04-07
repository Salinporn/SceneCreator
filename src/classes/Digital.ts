import * as THREE from 'three';
import type { Texture } from './Texture';
import type { HomeObject } from './HomeObject';

export class DigitalRoom {
  public id: number;

  constructor(id: number) {
    this.id = id;
  }

  toJSON(): object {
    return { id: this.id };
  }
}

export class DigitalHome {
  public id: number;
  public file: Blob;
  public filename: string;
  public textures: Texture[];
  public roomsList: DigitalRoom[];

  constructor(
    id: number,
    file: Blob,
    filename: string,
    textures: Texture[] = [],
    roomsList: DigitalRoom[] = [],
  ) {
    this.id = id;
    this.file = file;
    this.filename = filename;
    this.textures = textures;
    this.roomsList = roomsList;
  }

  addRoom(room: DigitalRoom): void {
    this.roomsList.push(room);
  }

  getRoom(roomId: number): DigitalRoom | undefined {
    return this.roomsList.find(r => r.id === roomId);
  }

  addTexture(texture: Texture): void {
    this.textures.push(texture);
  }

  removeTexture(textureId: number): void {
    this.textures = this.textures.filter(t => t.id !== textureId);
  }

  toJSON(): object {
    return {
      id: this.id,
      filename: this.filename,
      textures: this.textures.map(t => t.toJSON(false)),
      roomsList: this.roomsList.map(r => r.toJSON()),
    };
  }
}

// DigitalShape
interface TransformSnapshot {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  timestamp: string;
}

export class DigitalShape {
  public id: number;
  public file: Blob;
  public filename: string;
  public textures: Texture[];
  public defaultTextureId: number | null;
  public position: [number, number, number];
  public rotation: [number, number, number];
  public scale: [number, number, number];
  public positionHistory: TransformSnapshot[] = [];

  // Root Three.js group — added to the scene by SceneManager
  public readonly group: THREE.Group;
  // Axis-aligned bounding box in world space, kept in sync by updateBoundingBox().
  public boundingBox: THREE.Box3;

  private _homeObjects: HomeObject[] = [];

  constructor(
    id: number,
    file: Blob,
    filename: string,
    textures: Texture[] = [],
    defaultTextureId: number | null = null,
    position: [number, number, number] = [0, 0, 0],
    rotation: [number, number, number] = [0, 0, 0],
    scale:    [number, number, number] = [1, 1, 1],
  ) {
    this.id = id;
    this.file = file;
    this.filename = filename;
    this.textures = textures;
    this.defaultTextureId = defaultTextureId;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;

    this.group = new THREE.Group();
    this.group.position.set(...position);
    this.group.rotation.set(...rotation.map(THREE.MathUtils.degToRad) as [number, number, number]);
    this.group.scale.set(...scale);
    this.boundingBox = new THREE.Box3().setFromObject(this.group);
  }

  // Recompute the world-space bounding box from the current group transform.
  updateBoundingBox(): void {
    this.boundingBox.setFromObject(this.group);
  }

  private snapshot(): TransformSnapshot {
    return {
      position: [...this.position] as [number, number, number],
      rotation: [...this.rotation] as [number, number, number],
      scale:    [...this.scale]    as [number, number, number],
      timestamp: new Date().toISOString(),
    };
  }

  moveTo(
    position: [number, number, number],
    rotation?: [number, number, number],
    scale?: [number, number, number],
  ): void {
    this.positionHistory.push(this.snapshot());
    this.position = position;
    if (rotation) this.rotation = rotation;
    if (scale)    this.scale    = scale;

    this.group.position.set(...position);
    if (rotation) this.group.rotation.set(...rotation.map(THREE.MathUtils.degToRad) as [number, number, number]);
    if (scale)    this.group.scale.set(...scale);
    this.updateBoundingBox();
  }

  undoMove(): boolean {
    const snap = this.positionHistory.pop();
    if (!snap) return false;
    this.position = snap.position;
    this.rotation = snap.rotation;
    this.scale    = snap.scale;
    return true;
  }

  // HomeObject
  attachHomeObject(obj: HomeObject): void {
    this._homeObjects.push(obj);
  }

  detachHomeObject(objId: number): void {
    this._homeObjects = this._homeObjects.filter(o => o.id !== objId);
  }

  get homeObjects(): HomeObject[] {
    return [...this._homeObjects];
  }

  applyTexture(texture: Texture): void {
    if (!this.textures.some(t => t.id === texture.id)) {
      this.textures.push(texture);
    }
  }

  activeTexture(): Texture | null {
    if (this.defaultTextureId !== null) {
      return this.textures.find(t => t.id === this.defaultTextureId) ?? null;
    }
    return this.textures[0] ?? null;
  }

  toJSON(): object {
    return {
      id: this.id,
      filename: this.filename,
      textures: this.textures.map(t => t.toJSON(false)),
      defaultTextureId: this.defaultTextureId,
      position: this.position,
      rotation: this.rotation,
      scale: this.scale,
      positionHistoryLength: this.positionHistory.length,
    };
  }
}

// AnimatedShape
export class AnimatedShape extends DigitalShape {
  private _animationName: string | null;
  private _isPlaying: boolean = false;
  private _mixer: THREE.AnimationMixer;
  private _clips: THREE.AnimationClip[] = [];
  private _activeAction: THREE.AnimationAction | null = null;

  constructor(
    id: number,
    file: Blob,
    filename: string,
    textures: Texture[] = [],
    defaultTextureId: number | null = null,
    position: [number, number, number] = [0, 0, 0],
    rotation: [number, number, number] = [0, 0, 0],
    scale:    [number, number, number] = [1, 1, 1],
    animationName: string | null = null,
  ) {
    super(id, file, filename, textures, defaultTextureId, position, rotation, scale);
    this._animationName = animationName;
    this._mixer = new THREE.AnimationMixer(this.group);
  }

  //Register animation clips loaded from a GLTF asset.
  setClips(clips: THREE.AnimationClip[]): void {
    this._clips = clips;
  }

  animate(clipName?: string): void {
    if (clipName) this._animationName = clipName;
    if (!this._animationName) {
      console.warn(`AnimatedShape ${this.id}: no clip name set`);
      return;
    }
    const clip = THREE.AnimationClip.findByName(this._clips, this._animationName);
    if (!clip) {
      console.warn(`AnimatedShape ${this.id}: clip '${this._animationName}' not found`);
      return;
    }
    this._activeAction?.stop();
    this._activeAction = this._mixer.clipAction(clip);
    this._activeAction.play();
    this._isPlaying = true;
    console.info(`AnimatedShape ${this.id}: playing '${this._animationName}'`);
  }

  update(deltaSeconds: number): void {
    if (this._isPlaying) this._mixer.update(deltaSeconds);
  }

  stop(): void {
    this._activeAction?.stop();
    this._isPlaying = false;
  }

  reset(): void {
    this._activeAction?.stop();
    this._activeAction?.reset();
    this._isPlaying = false;
    console.debug(`AnimatedShape ${this.id}: reset to frame 0`);
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      animationName: this._animationName,
      isPlaying: this._isPlaying,
    };
  }
}
