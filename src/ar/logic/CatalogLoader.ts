import { makeAuthenticatedRequest } from "../../utils/Auth";
import { Furniture } from "../types/Furniture";

export class CatalogLoader {
  protected modelUrlCache: Map<number, string> = new Map();
  protected furnitureCatalog: Furniture[] = [];
  protected isLoading: boolean = false;

  // Fetch the furniture for AR
  async loadFurnitureCatalog(): Promise<Furniture[]> {
    try {
      const response = await makeAuthenticatedRequest('/digitalhomes/list_available_items/');

      if (response.ok) {
        const data = await response.json();
        const items: Furniture[] = data.available_items.map((item: {
          id: number;
          name: string;
          description: string;
          model_id: number;
          image: string;
          category: string;
          type: string;
          is_container: boolean;
          wall_mountable?: boolean;
        }) => ({
          id: item.id.toString(),
          name: item.name,
          description: item.description,
          model_id: item.model_id,
          image: item.image,
          category: item.category,
          type: item.type,
          is_container: item.is_container,
          wall_mountable: item.wall_mountable ?? false,
        }));

        this.furnitureCatalog = items;

        // Load all furniture models
        for (const item of items) {
          await this.loadFurnitureModel(item.model_id);
        }

        return items;
      }
      return [];
    } catch (error) {
      console.error('Error loading furniture catalog:', error);
      return [];
    }
  }

  // Load the furniture model
  protected async loadFurnitureModel(modelId: number): Promise<void> {
    if (this.modelUrlCache.has(modelId)) return;

    try {
      const response = await makeAuthenticatedRequest(`/products/get_3d_model/${modelId}/`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        this.modelUrlCache.set(modelId, url);
      }
    } catch (error) {
      console.error(`Error loading model ${modelId}:`, error);
    }
  }

  getModelUrlCache(): Map<number, string> {
    return this.modelUrlCache;
  }

  getFurnitureCatalog(): Furniture[] {
    return this.furnitureCatalog;
  }

  cleanup(): void {
    this.modelUrlCache.forEach(url => URL.revokeObjectURL(url));
    this.modelUrlCache.clear();
    this.furnitureCatalog = [];
  }
}

