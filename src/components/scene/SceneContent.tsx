import * as React from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { CatalogToggle } from "../panel/furniture/FurnitureCatalogToggle";
import { VRInstructionPanel } from "../panel/VRInstructionPanel";
import { VRFurniturePanel } from "../panel/furniture/FurniturePanel";
import { VRSlider } from "../panel/VRSlider";
import { HeadLockedUI } from "../panel/common/HeadLockedUI";
import { VRControlPanel } from "../panel/control/ControlPanel";
import { ControlPanelToggle } from "../panel/control/ControlPanelTogggle";
import { HomeModel } from "./HomeModel";
import { PlacedFurniture, SpawnManager } from "./FurnitureController";
import { NavigationController } from "./NavigationController";
import { Furniture, PlacedItem } from "../types/Furniture";
import { makeAuthenticatedRequest, logout } from "../../utils/Auth";

const DIGITAL_HOME_PLATFORM_BASE_URL = import.meta.env.VITE_DIGITAL_HOME_PLATFORM_URL;
import { collisionDetector } from "../../utils/CollisionDetection";
import * as THREE from "three";

interface SceneContentProps {
  homeId: string;
  digitalHome?: {
    spatialData?: {
      boundary?: {
        min_x: number;
        max_x: number;
        min_y: number;
        max_y: number;
        min_z: number;
        max_z: number;
      };
    };
  };
}

export function SceneContent({ homeId, digitalHome }: SceneContentProps) {
  const navigate = useNavigate();
  const [showSlider, setShowSlider] = React.useState(false);
  const [showFurniture, setShowFurniture] = React.useState(false);
  const [showInstructions, setShowInstructions] = React.useState(true);
  const [showControlPanel, setShowControlPanel] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [_loading, setLoading] = React.useState(true);
  const [sliderValue, setSliderValue] = React.useState(0.5);
  const [rotationValue, setRotationValue] = React.useState(0);
  const [navigationMode, setNavigationMode] = React.useState(false);
  const [placedItems, setPlacedItems] = React.useState<PlacedItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = React.useState<number | null>(null);
  const currentSpawnPositionRef = React.useRef<[number, number, number]>([0, 0, -2]);

  const [furnitureCatalog, setFurnitureCatalog] = React.useState<Furniture[]>([]);
  const [catalogLoading, setCatalogLoading] = React.useState(false);
  const [modelUrlCache, setModelUrlCache] = React.useState<Map<number, string>>(new Map());
  
  useEffect(() => {
    if (digitalHome?.spatialData?.boundary) {
      collisionDetector.setRoomBoundary(digitalHome.spatialData.boundary);
    }
  }, [digitalHome]);

  useEffect(() => {
    return () => {
      collisionDetector.clear();
    };
  }, []);

  // Load furniture catalog
  useEffect(() => {
    const loadFurnitureCatalog = async () => {
      setCatalogLoading(true);
      try {
        const response = await makeAuthenticatedRequest('/digitalhomes/list_available_items/');

        if (response.ok) {
          const data = await response.json();

          const items: Furniture[] = data.available_items.map((item: any) => ({
            id: item.id.toString(),
            name: item.name,
            description: item.description,
            model_id: item.model_id,
            image: item.image,
            category: item.category,
            type: item.type,
            is_container: item.is_container,
          }));

          setFurnitureCatalog(items);

          // Preload all furniture models
          items.forEach(item => {
            loadFurnitureModel(item.model_id);
          });
        } else {
          console.error('Failed to load furniture catalog');
        }
      } catch (error) {
        console.error('Error loading furniture catalog:', error);
      } finally {
        setCatalogLoading(false);
      }
    };

    loadFurnitureCatalog();

    return () => {
      modelUrlCache.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const loadDeployedItems = async () => {
      setLoading(true);
      try {
        const response = await makeAuthenticatedRequest(
          `/digitalhomes/get_deployed_items_details/${homeId}/`
        );

        if (response.ok) {
          const data = await response.json();

          const items: PlacedItem[] = [];

          for (const itemObj of data.deployed_items) {
            const itemId = Object.keys(itemObj)[0];
            const itemData = itemObj[itemId];

            await loadFurnitureModel(itemData.model_id);
            const modelPath = modelUrlCache.get(itemData.model_id);

            if (!modelPath) {
              console.warn('Model not loaded for item:', itemId);
              continue;
            }

            const position = itemData.spatialData.positions;
            const rotation = itemData.spatialData.rotation;
            const scale = itemData.spatialData.scale;

            const placedItem: PlacedItem = {
              id: itemId,
              name: itemData.name,
              description: itemData.description,
              model_id: itemData.model_id,
              modelPath: modelPath,
              image: undefined,
              category: itemData.category,
              type: itemData.type,
              is_container: itemData.is_container,
              position: [position[0], position[1], position[2]],
              rotation: [rotation[0], rotation[1], rotation[2]],
              scale: scale[0],
            };

            items.push(placedItem);
          }

          setPlacedItems(items);
        } else {
          const errorData = await response.json();
          console.error('Failed to load deployed items:', errorData.error);
        }
      } catch (error) {
        console.error('Error loading deployed items:', error);
      } finally {
        setLoading(false);
      }
    };

    if (modelUrlCache.size > 0 || furnitureCatalog.length > 0) {
      loadDeployedItems();
    } else {
      setLoading(false);
    }
  }, [homeId, modelUrlCache.size, furnitureCatalog.length]);

  const loadFurnitureModel = async (modelId: number) => {
    if (modelUrlCache.has(modelId)) return;

    try {
      const response = await makeAuthenticatedRequest(`/products/get_3d_model/${modelId}/`);

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setModelUrlCache(prev => new Map(prev).set(modelId, url));
      } else {
        console.error(`Failed to load model ${modelId}`);
      }
    } catch (error) {
      console.error(`Error loading model ${modelId}:`, error);
    }
  };

  const handleToggleUI = () => {
    if (showControlPanel) { 
      setShowControlPanel(false); 
    }
    if (showInstructions) {
      setShowInstructions(false);
      setShowFurniture(true);
      setShowSlider(true);
    } else if (showFurniture) {
      setShowFurniture(false);
      setShowSlider(false);
    } else {
      setShowFurniture(true);
      setShowSlider(true);
    }
  };

  const handleToggleControlPanel = () => {
      setShowControlPanel((prev) => {
      const newState = !prev;

      if (newState) {
        setShowFurniture(false);
        setShowSlider(false);
        setShowInstructions(false);
      }

      return newState;
    });
  };

  const handleSaveScene = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const deployedItems: Record<string, any> = {};

      placedItems.forEach((item) => {
        const scale = typeof item.scale === 'number' ? item.scale : 1;

        const itemId = item.id.includes('-') ? item.id.split('-')[0] : item.id;

        deployedItems[itemId] = {
          position: [
            item.position[0],
            item.position[1],
            item.position[2],
            0 // m coordinate (not used)
          ],
          rotation: item.rotation || [0, 0, 0],
          scale: [scale, scale, scale],
          is_container: item.is_container,
          contain: item.is_container ? [] : undefined,
          composite: !item.is_container ? [] : undefined,
          texture_id: null
        };
      });

      const formData = new FormData();
      formData.append('id', homeId);
      formData.append('deployedItems', JSON.stringify(deployedItems));

      const response = await makeAuthenticatedRequest(
        '/digitalhomes/update_home_design/',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        alert('Scene saved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save scene: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving scene:', error);
      alert('Error saving scene. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleHelp = () => {
    setShowInstructions(true);
    setShowFurniture(false);
    setShowSlider(false);
    setShowControlPanel(false);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = DIGITAL_HOME_PLATFORM_BASE_URL;
  };

  const handleSelectFurniture = (f: Furniture) => {
    setPlacedItems((prev) => {
      const catalogId = f.id;
      const existingIndex = prev.findIndex((item) => {
        const placedCatalogId = item.id.split('-')[0];
        return placedCatalogId === catalogId;
      });

      if (existingIndex !== -1) {
        console.log("Removing furniture:", f.name);
        
        if (selectedItemIndex === existingIndex) {
          setSelectedItemIndex(null);
          setShowSlider(false);
        } else if (selectedItemIndex !== null && selectedItemIndex > existingIndex) {
          setSelectedItemIndex(selectedItemIndex - 1);
        }
        
        return prev.filter((_, index) => index !== existingIndex);
      }

      const modelPath = modelUrlCache.get(f.model_id);
      if (!modelPath) {
        console.warn('Model not loaded yet for:', f.name);
        return prev;
      }

      const spawnPos = new THREE.Vector3(
        currentSpawnPositionRef.current[0],
        currentSpawnPositionRef.current[1],
        currentSpawnPositionRef.current[2]
      );

      if (collisionDetector['roomBox']) {
        const roomBox = collisionDetector['roomBox'];
        if (!roomBox.containsPoint(spawnPos)) {
          console.warn('Spawn position outside room, clamping to bounds');
          spawnPos.clamp(roomBox.min, roomBox.max);
        }
      }

      const uniqueId = `${f.id}-${Date.now()}`;

      const newItem: PlacedItem = {
        ...f,
        id: uniqueId,
        modelPath,
        position: [spawnPos.x, spawnPos.y, spawnPos.z],
        rotation: [0, 0, 0],
        scale: sliderValue,
      };

      const newIndex = prev.length;
      setSelectedItemIndex(newIndex);
      setRotationValue(0);
      setShowSlider(true);

      console.log("Adding furniture:", f.name, "at position:", spawnPos);
      setShowFurniture(false);
      return [...prev, newItem];
    });
  };

  const handleUpdateItemPosition = (index: number, newPosition: [number, number, number]) => {
    setPlacedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], position: newPosition };
      return updated;
    });
  };

  const handleUpdateItemRotation = (index: number, newRotation: [number, number, number]) => {
    setPlacedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], rotation: newRotation };
      return updated;
    });

    if (selectedItemIndex === index) {
      const twoPi = Math.PI * 2;
      let normalizedRotation = newRotation[1] % twoPi;
      if (normalizedRotation < 0) {
        normalizedRotation += twoPi;
      }
      setRotationValue(normalizedRotation);
    }
  };

  const handleSelectItem = (index: number) => {
    setSelectedItemIndex(index);
    setShowSlider(true);
    if (placedItems[index]?.rotation) {
      const twoPi = Math.PI * 2;
      let normalizedRotation = placedItems[index].rotation![1] % twoPi;
      if (normalizedRotation < 0) {
        normalizedRotation += twoPi;
      }
      setRotationValue(normalizedRotation);
    } else {
      setRotationValue(0);
    }
  };

  const handleScaleChange = (newScale: number) => {
    setSliderValue(newScale);
    if (selectedItemIndex !== null) {
      setPlacedItems((prev) => {
        const updated = [...prev];
        updated[selectedItemIndex] = { ...updated[selectedItemIndex], scale: newScale };
        return updated;
      });
    }
  };

  const handleRotationSliderChange = (newRotation: number) => {
    setRotationValue(newRotation);
    if (selectedItemIndex !== null) {
      setPlacedItems((prev) => {
        const updated = [...prev];
        updated[selectedItemIndex] = {
          ...updated[selectedItemIndex],
          rotation: [0, newRotation, 0]
        };
        return updated;
      });
    }
  };

  // Get catalog IDs of placed items for the panel
  const placedCatalogIds = React.useMemo(() => {
    return placedItems.map(item => item.id.split('-')[0]);
  }, [placedItems]);

  if (_loading && placedItems.length === 0) {
    return (
      <>
        <color args={["#808080"]} attach="background" />
        <PerspectiveCamera makeDefault position={[0, 1.6, 2]} fov={75} />
        <ambientLight intensity={0.5} />

        <group position={[0, 1.6, -2]}>
          <mesh>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#4CAF50" wireframe />
          </mesh>
        </group>
      </>
    );
  }

  return (
    <>
      <SpawnManager spawnPositionRef={currentSpawnPositionRef} />
      <color args={["#808080"]} attach="background" />
      <PerspectiveCamera makeDefault position={[0, 1.6, 2]} fov={75} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Environment preset="warehouse" />

      <group position={[0, 0, 0]}>
        <NavigationController
          moveSpeed={2.5}
          rotateSpeed={1.5}
          deadzone={0.15}
          onNavigationModeChange={(active) => {
            setNavigationMode(active);
          }}
        />
        <HomeModel homeId={homeId} />
        <PlacedFurniture
          items={placedItems}
          selectedIndex={selectedItemIndex}
          onSelectItem={handleSelectItem}
          onUpdatePosition={handleUpdateItemPosition}
          onUpdateRotation={handleUpdateItemRotation}
          navigationMode={navigationMode}
        />
      </group>

      <CatalogToggle onToggle={handleToggleUI} />
      <ControlPanelToggle onToggle={handleToggleControlPanel} />

      <HeadLockedUI
        distance={1.25}
        verticalOffset={0}
        enabled={showInstructions}
      >
        <VRInstructionPanel show={showInstructions} onClose={() => setShowInstructions(false)} />
      </HeadLockedUI>

      <HeadLockedUI
        distance={1.26}
        verticalOffset={0}
        enabled={showFurniture}
      >
        <VRFurniturePanel
          show={showFurniture}
          catalog={furnitureCatalog}
          loading={catalogLoading}
          onSelectItem={handleSelectFurniture}
          placedFurnitureIds={placedCatalogIds}
        />
      </HeadLockedUI>

      <HeadLockedUI
        distance={1.3}
        verticalOffset={0}
        enabled={showControlPanel}
      >
        <VRControlPanel
          show={showControlPanel}
          onSave={handleSaveScene}
          onHelp={handleHelp}
          onBack={handleBackToHome}
          onLogout={handleLogout}
          saving={saving}
          onClose={() => setShowControlPanel(false)}
        />
      </HeadLockedUI>

      <HeadLockedUI
        distance={1.0}
        enabled={showSlider && selectedItemIndex !== null}
      >
        <group>
          <VRSlider
            show={showSlider && selectedItemIndex !== null}
            value={sliderValue}
            onChange={handleScaleChange}
            label="Scale"
            min={0.1}
            max={2}
            position={[0, -0.8, 0]}
          />
          <VRSlider
            show={null}
            value={rotationValue}
            onChange={handleRotationSliderChange}
            label="Rotation"
            min={0}
            max={Math.PI * 2}
            position={[0, -0.75, 0]}
            showDegrees={true}
          />
        </group>
      </HeadLockedUI>
    </>
  );
}