import {
  Furniture,
  Chair,
  Table,
  ThreeDHome,
  Home,
  Room,
  Scene,
} from './classes';

class DigitalHomePlatform {
  private scene: Scene;
  private currentHome: Home | null = null;
  private activeRooms: Map<number, Room> = new Map();
  private furnitureRegistry: Map<number, Furniture> = new Map();\
  private isRunning: boolean = false;

  constructor() {
    this.scene = Scene.getInstance();
  }

  public async initialize(): Promise<void> {
    console.log("Starting Digital Home Platform...\n");

    await this.createHomeStructure();
    await this.populateFurniture();

    this.isRunning = true;
    console.log("\nDigital Home Platform initialized successfully\n");
  }

  private async createHomeStructure(): Promise<void> {
    const homeBoundary = {
      min_x: -15,
      max_x: 15,
      min_y: 0,
      max_y: 3.5,
      min_z: -15,
      max_z: 15
    };

    this.currentHome = new Home(
      1,
      "Lab Plan",
      1001,
      homeBoundary
    );

    const theBlob = await this.createModelBlob("LabPlan.glb");
    const threeDHome = new ThreeDHome(1001, theBlob, "LabPlan.glb");
    
    threeDHome.addTexture(5001);
    threeDHome.addTexture(5002);
    
    this.currentHome.setThreeDHome(threeDHome);

    this.scene.addHome(this.currentHome);
    
    const room = new Room(1, 1, "Main");
    this.activeRooms.set(1, room);
  }

  private async populateFurniture(): Promise<void> {
    const room = this.activeRooms.get(1)!;
    
    const whitechair = new Chair(
      2001,
      "White Chair",
      "Comfortable white chair",
      3001,
      await this.createModelBlob("chair1.glb"),
      "chair1.glb",
      true,
      45
    );
    whitechair.setPosition([0, 0, -3]);
    whitechair.setRotation([0, 0, 0]);
    whitechair.setScale([1.2, 1.2, 1.2]);

    const armchair1 = new Chair(
      2002,
      "Office Chair",
      "Black Chair",
      3002,
      await this.createModelBlob("chair2.glb"),
      "chair2.glb",
      true,
      48
    );
    armchair1.setPosition([2, 0, -2]);

    const armchair2 = new Chair(
      2003,
      "White Office Chair",
      "White Office Chair",
      3002,
      await this.createModelBlob("chair3.glb"),
      "chair3.glb",
      true,
      48
    );
    armchair2.setPosition([-2, 0, -2]);

    // Add chairs to room
    room.addFurniture(whitechair);
    room.addFurniture(armchair1);
    room.addFurniture(armchair2);
    this.furnitureRegistry.set(whitechair.getId(), whitechair);
    this.furnitureRegistry.set(armchair1.getId(), armchair1);
    this.furnitureRegistry.set(armchair2.getId(), armchair2);

    // Add table
    const desk = new Table(
      2004,
      "Desk",
      "Modern desk",
      3003,
      await this.createModelBlob("desk.glb"),
      "desk.glb",
      "rectangular",
      4
    );
    desk.setPosition([0, 0, 0]);
    room.addFurniture(desk);
    this.furnitureRegistry.set(desk.getId(), desk);
  }

  public cleanup(): void {
    this.furnitureRegistry.clear();
    this.activeRooms.clear();
    this.isRunning = false;
    console.log("Cleanup complete\n");
  }

  // Helper methods
  private async createModelBlob(filename: string): Promise<Blob> {
    const theData = ` 3D model data for ${filename}`;
    return new Blob([theData], { type: 'application/octet-stream' });
  }

  public getScene(): Scene {
    return this.scene;
  }

  public getCurrentHome(): Home | null {
    return this.currentHome;
  }

  public getFurnitureCount(): number {
    return this.furnitureRegistry.size;
  }

  public getRoomCount(): number {
    return this.activeRooms.size;
  }
}