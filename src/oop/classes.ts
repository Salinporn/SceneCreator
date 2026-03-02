import {
    SceneManager,
    TextureManager,
    CollisionDetector,
    AnimationController,
    FurnitureManager,
    NotificationSystem,
    MeshRenderer,
    ShaderManager,
    ItemPlacementSystem,
    PlayerInventory,
    UIManager,
    PhysicsEngine,
    SpatialDatabase,
    ModelLoader,
    CollisionSystem,
    SpatialManager,
    NavigationSystem,
    RoomManager,
    RenderQueue,
    ObjectRegistry,
    LightingSystem,
    PostProcessor,
    InputManager,
    CameraController
} from './utils';

abstract class ThreeDShape {
  protected id: number;
  protected file: Blob;
  protected filename: string;
  protected textures: number[];
  protected default_texture_id: number;
  protected position: number[];
  protected rotation: number[];
  protected scale: number[];
  protected position_history: number[][];

  constructor(
    id: number,
    file: Blob,
    filename: string,
    position: number[] = [0, 0, 0],
    rotation: number[] = [0, 0, 0],
    scale: number[] = [1, 1, 1]
  ) {
    this.id = id;
    this.file = file;
    this.filename = filename;
    this.textures = [];
    this.default_texture_id = 0;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.position_history = [];
  }

  public getId(): number {
    return this.id;
  }

  public getPosition(): number[] {
    return [...this.position];
  }

  public getRotation(): number[] {
    return [...this.rotation];
  }

  public getScale(): number[] {
    return [...this.scale];
  }

  public setPosition(position: number[]): void {
    this.position_history.push([...this.position]);
    this.position = position;
  }

  public setRotation(rotation: number[]): void {
    this.rotation = rotation;
  }

  public setScale(scale: number[]): void {
    this.scale = scale;
  }

  abstract render(): void;
  abstract update(): void;
  abstract calculateBounds(): { min: number[]; max: number[] };
}

abstract class HomeObject extends ThreeDShape {
  protected name: string;
  protected description: string;
  protected model_id: number;
  protected image: string;
  protected category: string;
  protected type: string;
  protected is_container: boolean;
  protected created_at: Date;
  protected updated_at: Date;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string,
    category: string,
    type: string,
    is_container: boolean = false
  ) {
    super(id, file, filename);
    
    this.name = name;
    this.description = description;
    this.model_id = model_id;
    this.image = "";
    this.category = category;
    this.type = type;
    this.is_container = is_container;
    this.created_at = new Date();
    this.updated_at = new Date();
  }

  
  public getName(): string {
    return this.name;
  }

  public getDescription(): string {
    return this.description;
  }

  public getCategory(): string {
    return this.category;
  }

  public getType(): string {
    return this.type;
  }

  public isContainer(): boolean {
    return this.is_container;
  }

  public render(): void {
    const scene = Scene.getInstance();
    scene.addObjectToRenderQueue(this);
    this.applyTexturesToMesh();
  }

  public update(): void {
    this.updated_at = new Date();
    this.notifySceneManager();
  }

  // Helper methods
  protected applyTexturesToMesh(): void {
    const textureManager = TextureManager.getInstance();
    this.textures.forEach(texId => {
      const texture = textureManager.getTexture(texId);
      if (texture) {
        this.file = texture.applyToBlob(this.file);
      }
    });
  }

  protected notifySceneManager(): void {
    const scene = Scene.getInstance();
    scene.updateObject(this.id, this.position, this.rotation, this.scale);
  }

  abstract interact(): void;
}

class Furniture extends HomeObject {
  protected material: string;
  protected weight: number;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string,
    category: string,
    type: string,
    material: string = "wood"
  ) {
    super(id, name, description, model_id, file, filename, category, type, false);
    
    this.material = material;
    this.weight = 0;
  }

  public interact(): void {
    const collisionDetector = CollisionDetector.getInstance();
    const isAccessible = collisionDetector.checkObjectAccessibility(this.id);
    
    if (isAccessible) {
      // TODO: Implement interaction logic
    }
  }

  public calculateBounds(): { min: number[]; max: number[] } {
    return {
      min: this.position.map((p, i) => p - this.scale[i] / 2),
      max: this.position.map((p, i) => p + this.scale[i] / 2)
    };
  }

  // Furniture-specific methods
  public getMaterial(): string {
    return this.material;
  }

  public setMaterial(material: string): void {
    this.material = material;
    this.update();
    
    const textureManager = TextureManager.getInstance();
    textureManager.updateMaterialTexture(this.model_id, material);
  }

  protected triggerAnimation(animationType: string): void {
    const animator = AnimationController.getInstance();
    animator.playAnimation(this.id, animationType);
  }
}

class Chair extends Furniture {
  private hasArmrests: boolean;
  private seatHeight: number;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string,
    hasArmrests: boolean = false,
    seatHeight: number = 45
  ) {
    super(id, name, description, model_id, file, filename, "Furniture", "Chair", "wood");
    
    this.hasArmrests = hasArmrests;
    this.seatHeight = seatHeight;
  }

  public interact(): void {
    const furnitureManager = FurnitureManager.getInstance();
    if (furnitureManager.isOccupied(this.id)) {
      const notificationSystem = NotificationSystem.getInstance();
      notificationSystem.showMessage("Chair is Placed!");
      return;
    }
    
    furnitureManager.markAsOccupied(this.id);
  }

  public render(): void {
    super.render();
    
    const meshRenderer = MeshRenderer.getInstance();
    meshRenderer.renderChairComponents(this.id, this.seatHeight, this.hasArmrests);
    
    const shaderManager = ShaderManager.getInstance();
    shaderManager.applyChairShader(this.id);
  }

  public adjustHeight(newHeight: number): void {
    this.seatHeight = newHeight;
    this.update();
    
    const meshRenderer = MeshRenderer.getInstance();
    meshRenderer.updateChairHeight(this.id, newHeight);
    
    // Notify physics engine
    const physicsEngine = PhysicsEngine.getInstance();
    physicsEngine.recalculateBounds(this.id);
  }
}

class Table extends Furniture {
  private tableTop: string;
  private numberOfLegs: number;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string,
    tableTop: string = "rectangular",
    numberOfLegs: number = 4
  ) {
    super(id, name, description, model_id, file, filename, "Furniture", "Table", "wood");
    
    this.tableTop = tableTop;
    this.numberOfLegs = numberOfLegs;
  }

  public interact(): void {
    const itemPlacementSystem = ItemPlacementSystem.getInstance();
    const inventory = PlayerInventory.getInstance();
    
    const heldItem = inventory.getHeldItem();
    if (heldItem) {
      const tablePosition = this.calculateSurfacePosition();
      itemPlacementSystem.placeItemOnSurface(heldItem, tablePosition);
      
      // Update table's item
      const furnitureManager = FurnitureManager.getInstance();
      furnitureManager.addItemToContainer(this.id, heldItem.getId());
      
      inventory.removeHeldItem();
    } else {
      // TODO: Show items on table
      const uiManager = UIManager.getInstance();
      uiManager.showContainerContents(this.id);
    }
  }

  // Table bound calculation
  public calculateBounds(): { min: number[]; max: number[] } {
    const bounds = super.calculateBounds();
    bounds.max[0] += 0.5; // X
    bounds.max[2] += 0.5; // Z
    return bounds;
  }

  private calculateSurfacePosition(): number[] {
    const tableTop = [...this.position];
    tableTop[1] += this.scale[1] / 2;
    return tableTop;
  }
}

// class AnimatedShape extends ThreeDShape {
  
// }

class ThreeDHome {
  private id: number;
  private file: Blob;
  private filename: string;
  private textures: number[];

  constructor(id: number, file: Blob, filename: string) {
    this.id = id;
    this.file = file;
    this.filename = filename;
    this.textures = [];
  }

  public getId(): number {
    return this.id;
  }

  public addTexture(textureId: number): void {
    this.textures.push(textureId);
  }

  public getTextures(): number[] {
    return [...this.textures];
  }
}

class Home {
  private id: number;
  private name: string;
  private home_model_id: number;
  private deployedItems: number[];
  private positions: number[];
  private rotation: number[];
  private scale: number[];
  private boundary: { [key: string]: number };
  private texture_id: number;
  private created_at: Date;
  private updated_at: Date;
  private threeDHome: ThreeDHome | null;

  constructor(
    id: number,
    name: string,
    home_model_id: number,
    boundary: { [key: string]: number }
  ) {
    this.id = id;
    this.name = name;
    this.home_model_id = home_model_id;
    this.deployedItems = [];
    this.positions = [0, 0, 0];
    this.rotation = [0, 0, 0];
    this.scale = [1, 1, 1];
    this.boundary = boundary;
    this.texture_id = 0;
    this.created_at = new Date();
    this.updated_at = new Date();
    this.threeDHome = null;
  }

  public addDeployedItem(itemId: number): void {
    this.deployedItems.push(itemId);
    this.updated_at = new Date();
    
    const sceneManager = SceneManager.getInstance();
    sceneManager.addObjectToHome(this.id, itemId);
    
    const spatialDatabase = SpatialDatabase.getInstance();
    spatialDatabase.registerObjectInHome(itemId, this.id);
  }

  public removeDeployedItem(itemId: number): void {
    this.deployedItems = this.deployedItems.filter(id => id !== itemId);
    this.updated_at = new Date();
    
    const sceneManager = SceneManager.getInstance();
    sceneManager.removeObjectFromHome(this.id, itemId);
    
    const spatialDatabase = SpatialDatabase.getInstance();
    spatialDatabase.unregisterObjectFromHome(itemId, this.id);
  }

  public getDeployedItems(): number[] {
    return [...this.deployedItems];
  }

  public setThreeDHome(home: ThreeDHome): void {
    this.threeDHome = home;
    
    const modelLoader = ModelLoader.getInstance();
    modelLoader.loadHomeModel(this.id, home);
    
    const collisionSystem = CollisionSystem.getInstance();
    collisionSystem.setBoundary(this.id, this.boundary);
  }
}

// TODO: unfinished
class Floor {
  private id: number;
  private home_id: number;
  private rooms: Room[];

  constructor(id: number, home_id: number) {
    this.id = id;
    this.home_id = home_id;
    this.rooms = [];
  }

  public addRoom(room: Room): void {
    this.rooms.push(room);
    
    const spatialManager = SpatialManager.getInstance();
    spatialManager.registerRoom(room.getId(), this.id);
    
    const navigationSystem = NavigationSystem.getInstance();
    navigationSystem.updateFloorLayout(this.id);
  }

  public getRooms(): Room[] {
    return [...this.rooms];
  }
}

// TODO: unfinished
class Room {
  private id: number;
  private floor_id: number;
  private name: string;
  private furniture: Furniture[];

  constructor(id: number, floor_id: number, name: string) {
    this.id = id;
    this.floor_id = floor_id;
    this.name = name;
    this.furniture = [];
  }

  public getId(): number {
    return this.id;
  }

  public addFurniture(item: Furniture): void {
    this.furniture.push(item);
    
    const roomManager = RoomManager.getInstance();
    roomManager.addObjectToRoom(this.id, item.getId());
    
    const collisionDetector = CollisionDetector.getInstance();
    collisionDetector.registerObject(item.getId(), item.calculateBounds());
  }

  public getFurniture(): Furniture[] {
    return [...this.furniture];
  }
}

class Texture {
  private id: number;
  private filename: string;
  private file: string; // base64 encoded

  constructor(id: number, filename: string, file: string) {
    this.id = id;
    this.filename = filename;
    this.file = file;
  }

  public getId(): number {
    return this.id;
  }

  public getFilename(): string {
    return this.filename;
  }

  public getData(): string {
    return this.file;
  }
}

class Scene {
  private static instance: Scene;
  private homes: Home[];
  private virtualObjects: VirtualObject[];

  private constructor() {
    this.homes = [];
    this.virtualObjects = [];
  }

  public static getInstance(): Scene {
    if (!Scene.instance) {
      Scene.instance = new Scene();
    }
    return Scene.instance;
  }

  public render(): void {
    const renderer = MeshRenderer.getInstance();
    const lightingSystem = LightingSystem.getInstance();
    
    lightingSystem.updateGlobalLighting();
    
    this.homes.forEach(home => {
      const homeObjects = home.getDeployedItems();
      homeObjects.forEach(objId => {
        renderer.renderObject(objId);
      });
    });
    
    this.virtualObjects.forEach(obj => {
      renderer.renderVirtualObject(obj.getId());
    });
    
    const postProcessor = PostProcessor.getInstance();
    postProcessor.applyEffects();
  }

  public move(): void {
    const inputManager = InputManager.getInstance();
    const moveVector = inputManager.getMoveInput();
    
    const cameraController = CameraController.getInstance();
    cameraController.moveCamera(moveVector);
    
    const collisionDetector = CollisionDetector.getInstance();
    collisionDetector.updatePlayerPosition(moveVector);
  }

  public rotate(): void {
    const inputManager = InputManager.getInstance();
    const rotationInput = inputManager.getRotationInput();
    
    const cameraController = CameraController.getInstance();
    cameraController.rotateCamera(rotationInput);
  }

  public addHome(home: Home): void {
    this.homes.push(home);
    
    const spatialDatabase = SpatialDatabase.getInstance();
    spatialDatabase.registerHome(home);
    
    const navigationSystem = NavigationSystem.getInstance();
    navigationSystem.updateNavigationMesh();
  }

  public addVirtualObject(obj: VirtualObject): void {
    this.virtualObjects.push(obj);
    
    const uiManager = UIManager.getInstance();
    uiManager.registerVirtualObject(obj.getId());
  }

  public addObjectToRenderQueue(obj: HomeObject): void {
    const renderQueue = RenderQueue.getInstance();
    renderQueue.addObject(obj.getId(), obj.calculateBounds());
  }

  public updateObject(id: number, position: number[], rotation: number[], scale: number[]): void {
    const objectRegistry = ObjectRegistry.getInstance();
    objectRegistry.updateTransform(id, position, rotation, scale);
    
    const collisionDetector = CollisionDetector.getInstance();
    collisionDetector.updateObjectBounds(id);
  }
}

class VirtualObject {
  private id: number;
  private name: string;
  private description: string;
  private model_id: number;

  constructor(id: number, name: string, description: string, model_id: number) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.model_id = model_id;
  }

  public getId(): number {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }
}

class Widget extends VirtualObject {
  private isVisible: boolean;

  constructor(id: number, name: string, description: string, model_id: number) {
    super(id, name, description, model_id);
    
    this.isVisible = true;
  }

  public show(): void {
    this.isVisible = true;
    
    const uiManager = UIManager.getInstance();
    uiManager.showWidget(this.getId());
    
    const renderer = MeshRenderer.getInstance();
    renderer.enableWidgetRendering(this.getId());
    
    const inputManager = InputManager.getInstance();
    inputManager.registerWidgetInteraction(this.getId());
  }

  public hide(): void {
    this.isVisible = false;
    
    const uiManager = UIManager.getInstance();
    uiManager.hideWidget(this.getId());
    
    const renderer = MeshRenderer.getInstance();
    renderer.disableWidgetRendering(this.getId());
    
    const inputManager = InputManager.getInstance();
    inputManager.unregisterWidgetInteraction(this.getId());
  }
}

export {
  ThreeDShape,
  HomeObject,
  Furniture,
  Chair,
  Table,
  // AnimatedShape,
  ThreeDHome,
  Home,
  Floor,
  Room,
  Texture,
  Scene,
  VirtualObject,
  Widget
};