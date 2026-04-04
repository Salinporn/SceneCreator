import { Text } from "@react-three/drei";
import { GradientBackground, RoundedPlane } from "./common/PanelElements";
import { useState } from "react";
import { useCursor } from "@react-three/drei";

interface SidebarItemData {
  id: string;
  icon: string;
  label: string;
  color: string;
  description: string;
  conditional?: boolean;
  
}

const baseSidebarItems: SidebarItemData[] = [
  {
    id: "movement",
    icon: "✥",
    label: "Movement",
    color: "#10B981",
    description: "Navigation controls",
  },
  {
    id: "rotation",
    icon: "⟲",
    label: "Rotation",
    color: "#3B82F6",
    description: "Rotate furniture",
  },
  {
    id: "scale",
    icon: "⬚",
    label: "Scale",
    color: "#EC4899",
    description: "Resize objects",
  },
 
  {
    id: "texture",
    icon: "🎨",
    label: "Texture",
    color: "#F97316",
    description: "Change texture",
  },
  {
    id: "settings",
    icon: "⚙",
    label: "Settings",
    color: "#8B5CF6",
    description: "Scene settings",
  },
  {
    id: "customize",
    icon: "✎",
    label: "Customize",
    color: "#F59E0B",
    description: "Personalize scene",
  },
  {
    id: "avatar",
    icon: "🧍",
    label: "Avatar",
    color: "#6366F1",
    description: "3rd person view",
  },
];

const SIDEBAR_WIDTH = 0.22;
const SIDEBAR_CENTER_X = SIDEBAR_WIDTH / 10;

interface SidebarItemProps {
  item: SidebarItemData;
  yPos: number;
  isActive: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  isHovered: boolean;
  
}

function SidebarItem({ item, yPos, isActive, onHover, onClick, isHovered }: SidebarItemProps) {
  useCursor(isHovered, "pointer");

  return (
    <group position={[SIDEBAR_CENTER_X, yPos, 0]}>
  
      <group
        onPointerEnter={(e) => {
          e.stopPropagation();
          onHover(item.id);
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClick(item.id);
        }}
      >
        <mesh>
          <RoundedPlane width={0.1} height={0.1} radius={0.02} />
          <meshStandardMaterial
            color={
              isActive
                ? item.color
                : isHovered
                  ? "#334155"
                  : "#3c5876"
            }
            emissive={isHovered ? item.color : "#ab9090"}
            emissiveIntensity={isHovered ? 0.3 : 0}
          />
        </mesh>

   
        <Text
          position={[0.005, 0, 0.01]}
          fontSize={0.05}
          color={isActive || isHovered ? "#000000" : "#94A3B8"}
          anchorX="center"
          anchorY="middle"
        >
          {item.icon}
        </Text>

  
        {isActive && (
          <mesh position={[0.07, 0, 0.01]}>
            <planeGeometry args={[0.01, 0.1]} />
            <meshBasicMaterial color={item.color} />
          </mesh>
        )}
      </group>

   
      {isHovered && (
        <group position={[0.15, 0, 0]}>
          <mesh>
            <planeGeometry args={[0.2, 0.06]} />
            <meshBasicMaterial color="#334155" opacity={0.95} transparent />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.025}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
          >
            {item.label}
          </Text>
        </group>
      )}
    </group>
  );
}

interface VRSidebarProps {
  show: boolean;
  onItemSelect: (itemId: string) => void;
  activeItemId?: string | null;
  visibleItemIds?: string[];
  hiddenItemIds?: string[];
  extraItems?: SidebarItemData[];
}

export function VRSidebar({
  show,
  onItemSelect,
  extraItems = [],
  activeItemId,
  visibleItemIds,
  hiddenItemIds = [],
}: VRSidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [internalActiveItem, setInternalActiveItem] = useState<string | null>(null);
  if (!show) return null;

  const allItems = [...baseSidebarItems, ...extraItems];
  let sidebarItems: SidebarItemData[];
  if (visibleItemIds && visibleItemIds.length > 0) {
    sidebarItems = visibleItemIds
      .map((id) => allItems.find((item) => item.id === id))
      .filter((item): item is SidebarItemData => item != null);
  } else if (hiddenItemIds.length > 0) {
    sidebarItems = allItems.filter((item) => !hiddenItemIds.includes(item.id));
  } else {
    sidebarItems = allItems;
  }

  const activeItem = activeItemId !== undefined ? activeItemId : internalActiveItem;


  const handleItemClick = (itemId: string) => {
    setInternalActiveItem(itemId);
    onItemSelect(itemId);
  };

  const sidebarHeight = 0.25 + sidebarItems.length * 0.12;
  const topPadding = 0.06;
  const itemSpacing = 0.14;
  const firstItemY = sidebarHeight / 2 - topPadding - 0.07;

  return (
    <group position={[0.2, 0, 0]}>
 
      <mesh position={[0.01, 0, -0.01]}>
        <GradientBackground
          width={SIDEBAR_WIDTH}
          height={sidebarHeight}
          radius={0.02}
          color1="#dee9f4"
          color2="#d7e3f2"
          opacity={0.85}
        />
      </mesh>

     
      {sidebarItems.map((item, index) => (
        <SidebarItem
          key={item.id}
          item={item}
          yPos={firstItemY - index * itemSpacing}
          isActive={activeItem === item.id}
          isHovered={hoveredItem === item.id}
          onHover={setHoveredItem}
          onClick={handleItemClick}
        />
      ))}

      {sidebarItems.map((_, index) => {
        if (index === sidebarItems.length - 1) return null;
        const yPos = firstItemY - index * itemSpacing - itemSpacing / 2;
        return (
          <mesh key={`divider-${index}`} position={[SIDEBAR_CENTER_X, yPos, 0]}>
            <planeGeometry args={[0.1, 0.002]} />
            <meshBasicMaterial color="#3c5870" opacity={0} transparent />
          </mesh>
        );
      })}
    </group>
  );
}
