import type { Home } from './Home';

export class Avatar {
  public position: [number, number, number];
  public rotation: [number, number, number];
  public scale: [number, number, number];
  public home: Home | null = null;

  constructor(
    position: [number, number, number] = [0, 0, 0],
    rotation: [number, number, number] = [0, 0, 0],
    scale:    [number, number, number] = [1, 1, 1],
  ) {
    this.position = [...position] as [number, number, number];
    this.rotation = [...rotation] as [number, number, number];
    this.scale    = [...scale]    as [number, number, number];
  }

  teleport(x: number, y: number, z: number): void {
    this.position = [x, y, z];
  }

  move(dx: number, dy: number, dz: number): void {
    this.position = [this.position[0] + dx, this.position[1] + dy, this.position[2] + dz];
  }

  lookAt(targetX: number, targetZ: number): void {
    const dx = targetX - this.position[0];
    const dz = targetZ - this.position[2];
    this.rotation[1] = (Math.atan2(dx, dz) * 180) / Math.PI;
  }

  //Returns the world position for a head-locked panel placed in front of the avatar
  headLockedPosition(offset: [number, number, number] = [0, 0, -0.5]): [number, number, number] {
    const yawRad = (this.rotation[1] * Math.PI) / 180;
    const dist = Math.abs(offset[2]);
    return [
      this.position[0] + Math.sin(yawRad) * dist + offset[0],
      this.position[1] + offset[1],
      this.position[2] + Math.cos(yawRad) * dist + offset[2],
    ];
  }

  toJSON(): object {
    return {
      position: this.position,
      rotation: this.rotation,
      scale: this.scale,
      homeId: this.home?.id ?? null,
    };
  }
}
