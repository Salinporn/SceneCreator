import { ARSceneManager } from "../ARSceneManager";
import { Furniture } from "../types/Furniture";
import { ARSceneState, SelectedFurniture } from "../types/ARSceneTypes";

export class ARSceneContentLogic {
  private state: ARSceneState;
  private setState: (updater: Partial<ARSceneState> | ((prev: ARSceneState) => Partial<ARSceneState>)) => void;
  private arManager: ARSceneManager | null;
  private furnitureCatalog: Furniture[];
  private modelUrlCache: Map<number, string>;
  private onFurnitureSelectRef?: (furniture: Furniture) => void;
  private placedObjects: Map<string, string> = new Map(); // Maps objectId -> catalogId

  constructor(
    arManager: ARSceneManager | null,
    furnitureCatalog: Furniture[],
    modelUrlCache: Map<number, string>,
    setState: (updater: Partial<ARSceneState> | ((prev: ARSceneState) => Partial<ARSceneState>)) => void,
    initialState: ARSceneState,
    onFurnitureSelect?: (furniture: Furniture) => void
  ) {
    this.arManager = arManager;
    this.furnitureCatalog = furnitureCatalog;
    this.modelUrlCache = modelUrlCache;
    this.setState = setState;
    this.state = initialState;
    this.onFurnitureSelectRef = onFurnitureSelect;
  }

  getState(): ARSceneState {
    return this.state;
  }

  updateState(update: Partial<ARSceneState>): void {
    this.state = { ...this.state, ...update };
    this.setState(update);
  }

  handleToggleUI(): void {
    this.updateState({
      showInstructions: false,
      showFurniture: !this.state.showFurniture,
      selectedFurniture: this.state.showFurniture ? null : this.state.selectedFurniture
    });
  }

  // Handle the selection of a furniture item
  handleSelectFurniture(f: Furniture): void {
    const catalogId = f.id;
    
    const existingObjectId = Array.from(this.placedObjects.entries())
      .find(([_, catId]) => catId === catalogId)?.[0];

    if (existingObjectId && this.arManager) {
      this.arManager.removeObject(existingObjectId);
      this.placedObjects.delete(existingObjectId);
      
      this.updateState({
        selectedFurniture: null,
        placedFurnitureIds: this.state.placedFurnitureIds.filter(id => id !== catalogId)
      });
      return;
    }

    const modelPath = this.modelUrlCache.get(f.model_id);
    if (!modelPath) {
      console.warn('Model not loaded yet for:', f.name);
      return;
    }

    this.updateState({
      selectedFurniture: {
        id: f.id,
        name: f.name,
        model_id: f.model_id,
        modelPath: modelPath
      },
      showFurniture: false
    });

    if (this.onFurnitureSelectRef) {
      this.onFurnitureSelectRef(f);
    }
  }

  // Handle the placement of a furniture item
  handleObjectPlaced(objectId: string): void {
    if (!this.state.selectedFurniture) return;

    const catalogId = this.state.selectedFurniture.id;
    this.placedObjects.set(objectId, catalogId);

    this.updateState({
      selectedFurniture: null,
      placedFurnitureIds: [...this.state.placedFurnitureIds, catalogId]
    });
  }

  getPlacedCatalogIds(): string[] {
    return Array.from(this.placedObjects.values());
  }

  getSelectedFurniture(): SelectedFurniture | null {
    return this.state.selectedFurniture;
  }

  updateARManager(arManager: ARSceneManager | null): void {
    this.arManager = arManager;
  }

  updateFurnitureCatalog(catalog: Furniture[]): void {
    this.furnitureCatalog = catalog;
  }

  updateModelUrlCache(cache: Map<number, string>): void {
    this.modelUrlCache = cache;
  }

  updateOnFurnitureSelect(callback?: (furniture: Furniture) => void): void {
    this.onFurnitureSelectRef = callback;
  }

  syncState(reactState: ARSceneState): void {
    this.state = reactState;
  }
}

