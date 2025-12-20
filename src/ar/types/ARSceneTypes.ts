export interface SelectedFurniture {
  id: string;
  name: string;
  model_id: number;
  modelPath: string;
}

export interface ARSceneState {
  showFurniture: boolean;
  showInstructions: boolean;
  selectedFurniture: SelectedFurniture | null;
  placedFurnitureIds: string[];
}

