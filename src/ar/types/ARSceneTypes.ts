export interface SelectedFurniture {
  id: string;
  name: string;
  model_id: number;
  modelPath: string;
  wall_mountable?: boolean;
}

export interface ARSceneState {
  showFurniture: boolean;
  showInstructions: boolean;
  selectedFurniture: SelectedFurniture | null;
  placedFurnitureIds: string[];
  selectedObjectId: string | null;
  showSlider: boolean;
  sliderValue: number;
  rotationValue: number;
}

