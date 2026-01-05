import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { ARSceneManager } from "../../ar/ARSceneManager";
import { ARPlacementController } from "./ARPlacementController";
import { VRFurniturePanel } from "../panel/furniture/FurniturePanel";
import { CatalogToggle } from "../panel/furniture/FurnitureCatalogToggle";
import { HeadLockedUI } from "../panel/common/HeadLockedUI";
import { VRInstructionPanel } from "../panel/VRInstructionPanel";
import { VRSlider } from "../panel/VRSlider";
import { ARSceneContentLogic } from "../../ar/logic/ARSceneContentLogic";
import { ARSceneState } from "../../ar/types/ARSceneTypes";
import { Furniture } from "../../ar/types/Furniture";

interface ARSceneContentProps {
  arManager: ARSceneManager | null;
  furnitureCatalog: Furniture[];
  catalogLoading: boolean;
  modelUrlCache: Map<number, string>;
  onFurnitureSelect: (furniture: Furniture) => void;
}

// AR Scene Content component - for AR scene management
export function ARSceneContent({
  arManager,
  furnitureCatalog,
  catalogLoading,
  modelUrlCache,
  onFurnitureSelect
}: ARSceneContentProps) {
  const [state, setState] = useState<ARSceneState>({
    showFurniture: false,
    showInstructions: true,
    selectedFurniture: null,
    placedFurnitureIds: [],
    selectedObjectId: null,
    showSlider: false,
    sliderValue: 1.0,
    rotationValue: 0
  });

  const logicRef = useRef<ARSceneContentLogic | null>(null);
  const onFurnitureSelectRef = useRef(onFurnitureSelect);

  useEffect(() => {
    onFurnitureSelectRef.current = onFurnitureSelect;
    if (logicRef.current) {
      logicRef.current.updateOnFurnitureSelect((f) => onFurnitureSelectRef.current(f));
    }
  }, [onFurnitureSelect]);

  useEffect(() => {
    const updateState = (update: Partial<ARSceneState> | ((prev: ARSceneState) => Partial<ARSceneState>)) => {
      setState(prev => {
        const newState = typeof update === 'function' ? update(prev) : update;
        return { ...prev, ...newState };
      });
    };

    const initialState: ARSceneState = {
      showFurniture: false,
      showInstructions: true,
      selectedFurniture: null,
      placedFurnitureIds: [],
      selectedObjectId: null,
      showSlider: false,
      sliderValue: 1.0,
      rotationValue: 0
    };

    logicRef.current = new ARSceneContentLogic(
      arManager,
      furnitureCatalog,
      modelUrlCache,
      updateState,
      initialState,
      (f) => onFurnitureSelectRef.current(f)
    );

    return () => {
      logicRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (logicRef.current) {
      logicRef.current.updateARManager(arManager);
      logicRef.current.updateFurnitureCatalog(furnitureCatalog);
      logicRef.current.updateModelUrlCache(modelUrlCache);
    }
  }, [arManager, furnitureCatalog, modelUrlCache]);

  const { camera } = useThree();
  const { session } = useXR();

  // Update frame for controller input
  useFrame((_state, delta) => {
    if (logicRef.current && session) {
      logicRef.current.updateFrame(session, camera, delta);
    }
  });

  const currentState = state;

  if (!logicRef.current) return null;

  const logic = logicRef.current;

  // Render placed objects
  const renderPlacedObjects = () => {
    if (!arManager) return null;

    const allObjects = arManager.getAllObjects();

    return (
      <group>
        {allObjects.map((obj) => (
          <primitive
            key={obj.name}
            object={obj}
            onClick={(e: { stopPropagation: () => void }) => {
              e.stopPropagation();
              if (logic) {
                logic.handleSelectObject(obj.name);
              }
            }}
          />
        ))}
      </group>
    );
  };

  return (
    <>
      {renderPlacedObjects()}

      <CatalogToggle onToggle={() => logic.handleToggleUI()} />

      <HeadLockedUI distance={1.6} verticalOffset={0} enabled={currentState.showInstructions}>
        <VRInstructionPanel 
          show={currentState.showInstructions} 
          onClose={() => logic.updateState({ showInstructions: false })} 
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.7} verticalOffset={0} enabled={currentState.showFurniture}>
        <VRFurniturePanel
          show={currentState.showFurniture}
          catalog={furnitureCatalog}
          loading={catalogLoading}
          onSelectItem={(f) => logic.handleSelectFurniture(f)}
          placedFurnitureIds={logic.getPlacedCatalogIds()}
        />
      </HeadLockedUI>

      <HeadLockedUI distance={1.4} enabled={currentState.showSlider && currentState.selectedObjectId !== null}>
        <VRSlider
          show={currentState.showSlider && currentState.selectedObjectId !== null}
          value={currentState.sliderValue}
          onChange={(v: number) => logic.handleScaleChange(v)}
          label="Scale"
          min={0.1}
          max={2}
          position={[0, 0, 0]}
          onClose={() => logic.updateState({ showSlider: false })}
        />
      </HeadLockedUI>

      <ARPlacementController
        arManager={arManager}
        selectedFurniture={currentState.selectedFurniture}
        onObjectPlaced={(objectId) => logic.handleObjectPlaced(objectId)}
      />
    </>
  );
}
