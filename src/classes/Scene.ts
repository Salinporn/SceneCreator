import * as THREE from 'three';
import type { Room } from './Home';

export abstract class VRScene {
  public opacity: number;
  public readonly scene: THREE.Scene;

  protected _room: Room | null = null;
  protected _renderer: THREE.WebGLRenderer | null = null;
  protected _camera: THREE.PerspectiveCamera;

  constructor(opacity: number = 100) {
    if (opacity < 0 || opacity > 100) {
      throw new RangeError(`opacity must be 0-100, got ${opacity}`);
    }
    this.opacity = opacity;
    this.scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  }

  abstract render(): void;
  abstract move(dx: number, dy: number, dz: number): void;
  abstract rotate(pitch: number, yaw: number, roll: number): void;

  alignRoom(room: Room): void {
    this._room = room;
    console.debug(`VRScene aligned to room id=${room.id}`);
  }

  setOpacity(value: number): void {
    if (value < 0 || value > 100) throw new RangeError(`opacity must be 0-100, got ${value}`);
    this.opacity = value;
    // Propagate opacity to every mesh in the scene
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          m.transparent = true;
          m.opacity = value / 100;
        });
      }
    });
  }

  attachRenderer(renderer: THREE.WebGLRenderer): void {
    this._renderer = renderer;
  }

  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  toJSON(): object {
    return {
      type: this.constructor.name,
      opacity: this.opacity,
      roomId: this._room?.id ?? null,
    };
  }
}

export class ARScene extends VRScene {
  // Ring reticle shown while scanning for an AR anchor surface.
  private _reticle: THREE.Mesh;

  constructor(opacity: number = 0) {
    super(opacity);

    // Flat ring reticle — mirrors the hit-test indicator used in WebXR AR sessions
    const geometry = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this._reticle = new THREE.Mesh(geometry, material);
    this._reticle.visible = false;
    this.scene.add(this._reticle);
  }

  render(): void {
    if (!this._renderer) return;
    this._renderer.render(this.scene, this._camera);
  }

  move(dx: number, dy: number, dz: number): void {
    this.scene.position.x += dx;
    this.scene.position.y += dy;
    this.scene.position.z += dz;
  }

  rotate(pitch: number, yaw: number, roll: number): void {
    this.scene.rotation.x += THREE.MathUtils.degToRad(pitch);
    this.scene.rotation.y += THREE.MathUtils.degToRad(yaw);
    this.scene.rotation.z += THREE.MathUtils.degToRad(roll);
  }

  showReticle(position: THREE.Vector3): void {
    this._reticle.visible = true;
    this._reticle.position.copy(position);
  }

  hideReticle(): void {
    this._reticle.visible = false;
  }

  activate(): void {
    this.setOpacity(100);
    console.info('ARScene activated');
  }

  deactivate(): void {
    this.setOpacity(0);
    this.hideReticle();
    console.info('ARScene deactivated');
  }
}
