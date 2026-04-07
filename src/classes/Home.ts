import type { Avatar } from './Avatar';
import type { DigitalHome } from './Digital';
import type { VRScene } from './Scene';

export class Room {
  public id: number;
  public floorId: number;
  private _vrScene: VRScene | null = null;

  constructor(id: number, floorId: number) {
    this.id = id;
    this.floorId = floorId;
  }

  attachVrScene(scene: VRScene): void {
    scene.alignRoom(this);
    this._vrScene = scene;
  }

  detachVrScene(): void {
    this._vrScene = null;
  }

  get vrScene(): VRScene | null {
    return this._vrScene;
  }

  toJSON(): object {
    return {
      id: this.id,
      floorId: this.floorId,
      vrScene: this._vrScene?.toJSON() ?? null,
    };
  }
}

export class Floor {
  public id: number;
  public homeId: number;
  public rooms: Room[] = [];

  constructor(id: number, homeId: number) {
    this.id = id;
    this.homeId = homeId;
  }

  addRoom(room: Room): void {
    if (room.floorId !== this.id) {
      throw new Error(`Room floorId=${room.floorId} does not match Floor id=${this.id}`);
    }
    this.rooms.push(room);
  }

  getRoom(roomId: number): Room | undefined {
    return this.rooms.find(r => r.id === roomId);
  }

  toJSON(): object {
    return {
      id: this.id,
      homeId: this.homeId,
      rooms: this.rooms.map(r => r.toJSON()),
    };
  }
}

export interface DeployedItem {
  modelId: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  [key: string]: unknown;
}

export class Home {
  public id: number;
  public name: string;
  public homeModelId: number;
  public deployedItems: DeployedItem[] = [];
  public positions: [number, number, number][] = [];
  public rotation: [number, number, number][] = [];
  public scale: [number, number, number][] = [];
  public boundary: { min: [number, number, number]; max: [number, number, number] };
  public textureId: number | null;
  public createdAt: Date;
  public updatedAt: Date;

  private _floors: Floor[] = [];
  private _avatar: Avatar | null = null;
  private _digitalHomes: DigitalHome[] = [];

  constructor(
    id: number,
    name: string,
    homeModelId: number,
    boundary?: { min: [number, number, number]; max: [number, number, number] },
    textureId: number | null = null,
  ) {
    this.id = id;
    this.name = name;
    this.homeModelId = homeModelId;
    this.boundary = boundary ?? { min: [0, 0, 0], max: [0, 0, 0] };
    this.textureId = textureId;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Floors
  addFloor(floor: Floor): void {
    if (floor.homeId !== this.id) {
      throw new Error(`Floor homeId=${floor.homeId} does not match Home id=${this.id}`);
    }
    this._floors.push(floor);
    this.updatedAt = new Date();
  }

  getFloor(floorId: number): Floor | undefined {
    return this._floors.find(f => f.id === floorId);
  }

  get floors(): Floor[] {
    return [...this._floors];
  }

  // Avatar
  setAvatar(avatar: Avatar): void {
    this._avatar = avatar;
    this.updatedAt = new Date();
  }

  get avatar(): Avatar | null {
    return this._avatar;
  }

  // DigitalHome
  addDigitalHome(dh: DigitalHome): void {
    this._digitalHomes.push(dh);
    this.updatedAt = new Date();
  }

  get digitalHomes(): DigitalHome[] {
    return [...this._digitalHomes];
  }

  // Deployed items
  deployItem(
    modelId: number,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
    extra: Record<string, unknown> = {},
  ): number {
    this.deployedItems.push({ modelId, position, rotation, scale, ...extra });
    this.positions.push(position);
    this.rotation.push(rotation);
    this.scale.push(scale);
    this.updatedAt = new Date();
    return this.deployedItems.length - 1;
  }

  updateItemTransform(
    index: number,
    position?: [number, number, number],
    rotation?: [number, number, number],
    scale?: [number, number, number],
  ): void {
    if (index < 0 || index >= this.deployedItems.length) {
      throw new RangeError(`No deployed item at index ${index}`);
    }
    if (position) { this.deployedItems[index].position = position; this.positions[index] = position; }
    if (rotation) { this.deployedItems[index].rotation = rotation; this.rotation[index] = rotation; }
    if (scale)    { this.deployedItems[index].scale    = scale;    this.scale[index]    = scale;    }
    this.updatedAt = new Date();
  }

  removeItem(index: number): void {
    if (index < 0 || index >= this.deployedItems.length) {
      throw new RangeError(`No deployed item at index ${index}`);
    }
    this.deployedItems.splice(index, 1);
    this.positions.splice(index, 1);
    this.rotation.splice(index, 1);
    this.scale.splice(index, 1);
    this.updatedAt = new Date();
  }

  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      homeModelId: this.homeModelId,
      deployedItems: this.deployedItems,
      boundary: this.boundary,
      textureId: this.textureId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      floors: this._floors.map(f => f.toJSON()),
    };
  }
}

export class Residence {
  public home: Home;
  public floor: Floor;
  public room: Room;

  constructor(home: Home, floor: Floor, room: Room) {
    this.home = home;
    this.floor = floor;
    this.room = room;
  }

  toJSON(): object {
    return { homeId: this.home.id, floorId: this.floor.id, roomId: this.room.id };
  }
}
