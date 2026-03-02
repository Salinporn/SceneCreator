
class Wardrobe extends Furniture {
  private numberOfDoors: number;
  private hasDrawers: boolean;
  private storageCapacity: number;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string,
    numberOfDoors: number = 2,
    hasDrawers: boolean = true
  ) {
    super(id, name, description, model_id, file, filename, "Furniture", "Wardrobe", "wood");
    
    this.is_container = true;
    this.numberOfDoors = numberOfDoors;
    this.hasDrawers = hasDrawers;
    this.storageCapacity = 100;
  }

  public interact(): void {
    const uiManager = UIManager.getInstance();
    const storageSystem = StorageSystem.getInstance();
    
    const wardrobeContents = storageSystem.getContainerContents(this.id);
    uiManager.showStorageInterface(this.id, wardrobeContents, this.storageCapacity);
    
    if (this.hasDrawers) {
      uiManager.enableDrawerTabs(this.id);
    }
  }
}

class Appliances extends HomeObject {
  protected powerConsumption: number;
  protected isElectric: boolean;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string,
    category: string,
    type: string,
    powerConsumption: number = 0
  ) {
    // Call parent constructor using super()
    super(id, name, description, model_id, file, filename, category, type, false);
    
    this.powerConsumption = powerConsumption;
    this.isElectric = powerConsumption > 0;
  }

  // Implement abstract method
  public interact(): void {
    const powerManager = PowerManager.getInstance();
    const isOn = powerManager.isDevicePowered(this.id);
    
    if (isOn) {
      this.turnOff();
    } else {
      this.turnOn();
    }
  }

  public calculateBounds(): { min: number[]; max: number[] } {
    return {
      min: this.position.map((p, i) => p - this.scale[i] / 2),
      max: this.position.map((p, i) => p + this.scale[i] / 2)
    };
  }

  // Appliance-specific methods
  public turnOn(): void {
    const powerManager = PowerManager.getInstance();
    const electricalSystem = ElectricalSystem.getInstance();
    
    // Check if enough power is available
    if (electricalSystem.hasAvailablePower(this.powerConsumption)) {
      powerManager.powerOnDevice(this.id);
      electricalSystem.consumePower(this.powerConsumption);
      
      const animator = AnimationController.getInstance();
      animator.playAnimation(this.id, "power_on");
      
      const audioManager = AudioManager.getInstance();
      audioManager.playSoundAt("appliance_start", this.position);
    } else {
      const notificationSystem = NotificationSystem.getInstance();
      notificationSystem.showMessage("Not enough power available!");
    }
  }

  public turnOff(): void {
    const powerManager = PowerManager.getInstance();
    const electricalSystem = ElectricalSystem.getInstance();
    
    powerManager.powerOffDevice(this.id);
    electricalSystem.releasePower(this.powerConsumption);
    
    const animator = AnimationController.getInstance();
    animator.playAnimation(this.id, "power_off");
    
    const audioManager = AudioManager.getInstance();
    audioManager.stopSound(this.id);
  }
}

/**
 * Fan class - demonstrates inheritance from Appliances
 */
class Fan extends Appliances {
  private speed: number;
  private oscillating: boolean;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string,
    powerConsumption: number = 50
  ) {
    // Call parent constructor using super()
    super(id, name, description, model_id, file, filename, "Appliances", "Fan", powerConsumption);
    
    this.speed = 1;
    this.oscillating = false;
  }

  // Override parent method (polymorphism)
  public interact(): void {
    super.interact();
    
    const uiManager = UIManager.getInstance();
    uiManager.showFanControls(this.id, this.speed, this.oscillating);
    
    const particleSystem = ParticleSystem.getInstance();
    particleSystem.createAirFlow(this.id, this.speed, this.position);
  }

  // Fan-specific methods
  public setSpeed(speed: number): void {
    this.speed = Math.max(0, Math.min(5, speed));
    
    const animator = AnimationController.getInstance();
    animator.setAnimationSpeed(this.id, this.speed);
    
    const audioManager = AudioManager.getInstance();
    audioManager.updateSoundVolume(this.id, this.speed * 0.2);
    
    const particleSystem = ParticleSystem.getInstance();
    particleSystem.updateAirFlowIntensity(this.id, this.speed);
    
    // Update power consumption based on speed
    const electricalSystem = ElectricalSystem.getInstance();
    electricalSystem.updateDevicePower(this.id, this.powerConsumption * (this.speed / 5));
  }

  public toggleOscillation(): void {
    this.oscillating = !this.oscillating;
    
    const animator = AnimationController.getInstance();
    if (this.oscillating) {
      animator.playAnimation(this.id, "oscillate");
    } else {
      animator.stopAnimation(this.id, "oscillate");
    }
    
    const particleSystem = ParticleSystem.getInstance();
    particleSystem.setAirFlowOscillation(this.id, this.oscillating);
  }
}

// ==================== Concrete Classes - Décor ====================

/**
 * Base Décor class - extends HomeObject
 */
class Decor extends HomeObject {
  protected style: string;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string,
    category: string,
    type: string,
    style: string = "modern"
  ) {
    // Call parent constructor using super()
    super(id, name, description, model_id, file, filename, category, type, false);
    
    this.style = style;
  }

  // Implement abstract method
  public interact(): void {
    const inspectionSystem = InspectionSystem.getInstance();
    inspectionSystem.showObjectDetails(this.id, this.name, this.style);
    
    const cameraController = CameraController.getInstance();
    cameraController.focusOnObject(this.id);
    
    const uiManager = UIManager.getInstance();
    uiManager.showDecorInfo(this.name, this.style, this.description);
  }

  public calculateBounds(): { min: number[]; max: number[] } {
    return {
      min: this.position.map((p, i) => p - this.scale[i] / 2),
      max: this.position.map((p, i) => p + this.scale[i] / 2)
    };
  }
}

/**
 * Curtains class - demonstrates inheritance from Décor
 */
class Curtains extends Decor {
  private color: string;
  private isOpen: boolean;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string,
    color: string = "white"
  ) {
    // Call parent constructor using super()
    super(id, name, description, model_id, file, filename, "Décor", "Curtains", "modern");
    
    this.color = color;
    this.isOpen = false;
  }

  // Override parent method (polymorphism)
  public interact(): void {
    this.toggle();
  }

  // Curtains-specific methods
  public toggle(): void {
    this.isOpen = !this.isOpen;
    
    const animator = AnimationController.getInstance();
    const animationType = this.isOpen ? "open_curtains" : "close_curtains";
    animator.playAnimation(this.id, animationType);
    
    const lightingSystem = LightingSystem.getInstance();
    if (this.isOpen) {
      lightingSystem.increaseLightIntensity(this.position, 0.3);
    } else {
      lightingSystem.decreaseLightIntensity(this.position, 0.3);
    }
    
    const audioManager = AudioManager.getInstance();
    audioManager.playSoundAt("curtain_movement", this.position);
    
    // Update ambient lighting in the room
    const roomManager = RoomManager.getInstance();
    roomManager.updateAmbientLight(this.position);
  }
}

// ==================== Concrete Classes - Fixtures ====================

/**
 * Base Fixtures class - extends HomeObject
 */
class Fixtures extends HomeObject {
  protected isFixed: boolean;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string,
    category: string,
    type: string
  ) {
    // Call parent constructor using super()
    super(id, name, description, model_id, file, filename, category, type, false);
    
    this.isFixed = true; // Fixtures are typically fixed in place
  }

  // Implement abstract method
  public interact(): void {
    const inspectionSystem = InspectionSystem.getInstance();
    inspectionSystem.highlightFixture(this.id);
    
    const uiManager = UIManager.getInstance();
    uiManager.showFixtureOptions(this.id, this.name);
    
    const maintenanceTracker = MaintenanceTracker.getInstance();
    maintenanceTracker.recordInteraction(this.id);
  }

  public calculateBounds(): { min: number[]; max: number[] } {
    return {
      min: this.position.map((p, i) => p - this.scale[i] / 2),
      max: this.position.map((p, i) => p + this.scale[i] / 2)
    };
  }
}

/**
 * Sink class - demonstrates inheritance from Fixtures
 */
class Sink extends Fixtures {
  private hasFaucet: boolean;
  private material: string;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string,
    material: string = "ceramic"
  ) {
    // Call parent constructor using super()
    super(id, name, description, model_id, file, filename, "Fixtures", "Sink");
    
    this.hasFaucet = true;
    this.material = material;
  }

  // Override parent method (polymorphism)
  public interact(): void {
    const waterSystem = WaterSystem.getInstance();
    const isRunning = waterSystem.isWaterRunning(this.id);
    
    if (isRunning) {
      this.turnOffWater();
    } else {
      this.turnOnWater();
    }
    
    const uiManager = UIManager.getInstance();
    uiManager.showSinkControls(this.id);
  }

  // Sink-specific methods
  public turnOnWater(): void {
    const waterSystem = WaterSystem.getInstance();
    waterSystem.startWaterFlow(this.id, this.position);
    
    const particleSystem = ParticleSystem.getInstance();
    particleSystem.createWaterStream(this.id, this.position);
    
    const audioManager = AudioManager.getInstance();
    audioManager.playSoundAt("water_running", this.position);
    
    const resourceManager = ResourceManager.getInstance();
    resourceManager.startResourceConsumption(this.id, "water");
  }

  public turnOffWater(): void {
    const waterSystem = WaterSystem.getInstance();
    waterSystem.stopWaterFlow(this.id);
    
    const particleSystem = ParticleSystem.getInstance();
    particleSystem.removeWaterStream(this.id);
    
    const audioManager = AudioManager.getInstance();
    audioManager.stopSound(this.id);
    
    const resourceManager = ResourceManager.getInstance();
    resourceManager.stopResourceConsumption(this.id, "water");
  }
}

/**
 * Toilet class - demonstrates inheritance from Fixtures
 */
class Toilet extends Fixtures {
  private hasLid: boolean;
  private waterLevel: number;

  constructor(
    id: number,
    name: string,
    description: string,
    model_id: number,
    file: Blob,
    filename: string
  ) {
    // Call parent constructor using super()
    super(id, name, description, model_id, file, filename, "Fixtures", "Toilet");
    
    this.hasLid = true;
    this.waterLevel = 100;
  }

  // Override parent method (polymorphism)
  public interact(): void {
    this.flush();
  }

  // Toilet-specific methods
  public flush(): void {
    const waterSystem = WaterSystem.getInstance();
    waterSystem.triggerFlush(this.id);
    
    const animator = AnimationController.getInstance();
    animator.playAnimation(this.id, "flush");
    
    const audioManager = AudioManager.getInstance();
    audioManager.playSoundAt("toilet_flush", this.position);
    
    const particleSystem = ParticleSystem.getInstance();
    particleSystem.createWaterVortex(this.id, this.position);
    
    // Consume water resource
    const resourceManager = ResourceManager.getInstance();
    resourceManager.consumeResource("water", 6); // 6 liters per flush
    
    // Refill after flush
    setTimeout(() => {
      this.waterLevel = 100;
      waterSystem.refillToilet(this.id);
    }, 3000);
  }
}