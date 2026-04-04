import * as THREE from 'three';
import { FurnitureItem } from './FurnitureItem';
import { FurnitureMetadata } from './FurnitureItem';

const BOARD_WIDTH = 1.0;
const BOARD_HEIGHT = 0.6;
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 612;
const PEN_RADIUS = 8;
const ERASER_RADIUS = 24;

export type WhiteboardTool = 'pen' | 'eraser';

export class WhiteboardWidget extends FurnitureItem {
  private drawTexture: THREE.CanvasTexture | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private boardMesh: THREE.Mesh | null = null;
  private lastDrawPoint: { x: number; y: number } | null = null;

  constructor(
    id: string,
    name: string,
    initialTransform?: { position?: [number, number, number]; rotation?: [number, number, number]; scale?: number },
  ) {
    const metadata: FurnitureMetadata = {
      category: 'widgets',
      type: 'Whiteboard',
      description: 'Interactive whiteboard for drawing in Experience Mode',
      wallMountable: true,
    };
    super(
      id,
      name,
      -1,
      null,
      metadata,
      initialTransform,
      'Whiteboard',
      '',
    );
  }

  override async loadModel(_scene: THREE.Scene): Promise<void> {
    this.modelGroup.clear();
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawTexture = new THREE.CanvasTexture(this.canvas);
    this.drawTexture.minFilter = THREE.LinearFilter;
    this.drawTexture.magFilter = THREE.LinearFilter;
    this.drawTexture.anisotropy = 16;

    const frameDepth = 0.03;
    const frameGeo = new THREE.BoxGeometry(BOARD_WIDTH + 0.04, BOARD_HEIGHT + 0.04, frameDepth);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.2,
    });
    const frame = new THREE.Mesh(frameGeo, frameMaterial);
    frame.position.z = -frameDepth / 2;
    this.modelGroup.add(frame);

    const boardGeo = new THREE.PlaneGeometry(BOARD_WIDTH, BOARD_HEIGHT);
    const boardMaterial = new THREE.MeshBasicMaterial({
      map: this.drawTexture,
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    this.boardMesh = new THREE.Mesh(boardGeo, boardMaterial);
    this.boardMesh.position.z = 0.01;
    this.boardMesh.userData.whiteboardId = this.id;
    this.boardMesh.userData.whiteboard = this;
    this.boardMesh.raycast = (): void => {};
    this.modelGroup.add(this.boardMesh);

    frameGeo.computeBoundingBox();
    const minY = frameGeo.boundingBox!.min.y;
    this.modelGroup.position.y = -minY;
  }

  getBoardMesh(): THREE.Mesh | null {
    return this.boardMesh;
  }

  worldPointToBoardUv(worldPoint: THREE.Vector3): THREE.Vector2 | null {
    if (!this.boardMesh) return null;
    this.boardMesh.updateWorldMatrix(true, true);
    const invWorld = new THREE.Matrix4().copy(this.boardMesh.matrixWorld).invert();
    const local = worldPoint.clone().applyMatrix4(invWorld);
    local.z = 0;
    const halfW = BOARD_WIDTH / 2;
    const halfH = BOARD_HEIGHT / 2;
    local.x = THREE.MathUtils.clamp(local.x, -halfW, halfW);
    local.y = THREE.MathUtils.clamp(local.y, -halfH, halfH);
    const u = local.x / BOARD_WIDTH + 0.5;
    const v = local.y / BOARD_HEIGHT + 0.5;
    return new THREE.Vector2(u, v);
  }

  drawAt(
    worldPoint: THREE.Vector3 | null,
    tool: WhiteboardTool,
    geometryUv?: THREE.Vector2 | null,
  ): void {
    const geomUv =
      geometryUv?.clone() ??
      (worldPoint ? this.worldPointToBoardUv(worldPoint) : null);
    if (!geomUv || !this.ctx || !this.drawTexture) return;
    const x = THREE.MathUtils.clamp(geomUv.x, 0, 1) * CANVAS_WIDTH;
    const y = (1 - THREE.MathUtils.clamp(geomUv.y, 0, 1)) * CANVAS_HEIGHT;

    if (tool === 'pen') {
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = PEN_RADIUS * 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      if (this.lastDrawPoint) {
        const dx = x - this.lastDrawPoint.x;
        const dy = y - this.lastDrawPoint.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.35) {
          this.drawTexture.needsUpdate = true;
          return;
        }
        const stepPx = 4;
        if (dist > stepPx) {
          const steps = Math.ceil(dist / stepPx);
          this.ctx.beginPath();
          this.ctx.moveTo(this.lastDrawPoint.x, this.lastDrawPoint.y);
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const ix = this.lastDrawPoint.x + t * dx;
            const iy = this.lastDrawPoint.y + t * dy;
            this.ctx.lineTo(ix, iy);
          }
          this.ctx.stroke();
        } else {
          this.ctx.beginPath();
          this.ctx.moveTo(this.lastDrawPoint.x, this.lastDrawPoint.y);
          this.ctx.lineTo(x, y);
          this.ctx.stroke();
        }
      } else {
        this.ctx.beginPath();
        this.ctx.arc(x, y, PEN_RADIUS, 0, Math.PI * 2);
        this.ctx.fillStyle = '#000000';
        this.ctx.fill();
      }
    } else {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, ERASER_RADIUS, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.lastDrawPoint = { x, y };
    this.drawTexture.needsUpdate = true;
  }

  startStroke(): void {
    this.lastDrawPoint = null;
  }

  endStroke(): void {
    this.lastDrawPoint = null;
  }

  clear(): void {
    if (!this.ctx || !this.drawTexture) return;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.lastDrawPoint = null;
    this.drawTexture.needsUpdate = true;
  }

  applySerializedImage(dataUrl: string): void {
    if (!this.ctx || !this.canvas || !this.drawTexture || !dataUrl) return;
    const img = new Image();
    img.onload = () => {
      if (!this.ctx || !this.drawTexture) return;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      this.ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      this.drawTexture.needsUpdate = true;
    };
    img.src = dataUrl;
  }

  override serialize(): Record<string, unknown> {
    const base = super.serialize();
    let whiteboard_image: string | undefined;
    try {
      if (this.canvas) {
        whiteboard_image = this.canvas.toDataURL('image/png');
      }
    } catch {
      // nothing
    }
    return {
      ...base,
      widget_type: 'whiteboard',
      ...(whiteboard_image ? { whiteboard_image } : {}),
    };
  }

  override dispose(): void {
    if (this.drawTexture) {
      this.drawTexture.dispose();
      this.drawTexture = null;
    }
    this.canvas = null;
    this.ctx = null;
    this.boardMesh = null;
    this.lastDrawPoint = null;
    super.dispose();
  }
}
