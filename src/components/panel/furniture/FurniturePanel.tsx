import * as React from "react"; 
import { Text } from "@react-three/drei";
import { Furniture } from "../../types/Furniture";
import { FurnitureImage } from "./FurnitureImage";
import { RoundedPlane } from "../RoundedPlane";

export function VRFurniturePanel({ 
  show, 
  catalog, 
  loading, 
  onSelectItem, 
  placedFurnitureIds = [] 
}: { 
  show: boolean; 
  catalog: Furniture[];
  loading: boolean;
  onSelectItem: (f: Furniture) => void;
  placedFurnitureIds?: string[];
}) {
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  
  if (!show) return null;

  const itemsPerRow = 3;
  const rows = Math.ceil(catalog.length / itemsPerRow);
  
  const headerHeight = 0.25;
  const itemHeight = 0.65;
  const topPadding = 0.06;
  const bottomPadding = 0.06;
  
  const panelHeight = Math.max(
    1.5,
    headerHeight + topPadding + (rows * itemHeight) + bottomPadding
  );

  const panelWidth = 1.7;

  
  return (
    <group>
      {/* Main background - light theme */}
      <mesh position={[0, 0, -0.02]}>
        <RoundedPlane width={panelWidth} height={panelHeight} radius={0.1} />
        <meshStandardMaterial 
          color="#34495e" 
          opacity={0.7} 
          transparent 
          roughness={0.7}
        />
      </mesh>

      {/* Header */}
      <Text 
        position={[0, panelHeight / 2 - 0.15, 0.01]} 
        fontSize={0.1} 
        color="#ffffff" 
        anchorX="center" 
        anchorY="middle"
        fontWeight="bold"
      >
        My Inventory
      </Text>

      {/* Content */}
      {loading ? (
        <group position={[0, 0, 0.01]}>
          <Text 
            position={[0, 0, 0]} 
            fontSize={0.06} 
            color="#ffffff" 
            anchorX="center" 
            anchorY="middle"
          >
            Loading furniture...
          </Text>
        </group>
      ) : catalog.length === 0 ? (
        <Text 
          position={[0, 0, 0.01]} 
          fontSize={0.05} 
          color="#ffffff" 
          anchorX="center" 
          anchorY="middle"
        >
          No furniture available
        </Text>
      ) : (
        <group>
          {catalog.map((f, itemIndex) => {
            const col = itemIndex % itemsPerRow;
            const row = Math.floor(itemIndex / itemsPerRow);
            
            const cardWidth = 0.44;
            const cardHeight = 0.59;
            const cardSpacing = 0.05;
            const totalWidth = itemsPerRow * cardWidth + (itemsPerRow - 1) * cardSpacing;
            const x = -totalWidth / 2 + col * (cardWidth + cardSpacing) + cardWidth / 2;
            const y = panelHeight / 2 - headerHeight - topPadding - (row * itemHeight) - cardHeight / 2;

            const isHovered = hoveredItem === f.id;
            const isPlaced = placedFurnitureIds.includes(f.id);

            return (
              <group key={`${f.id}-${itemIndex}`} position={[x, y, 0.02]}>

                {/* Card background */}
                <mesh
                  position={[0, 0, 0]}
                  onPointerEnter={(e) => {
                    e.stopPropagation();
                    setHoveredItem(f.id);
                  }}
                  onPointerLeave={(e) => {
                    e.stopPropagation();
                    setHoveredItem(null);
                  }}
                  onPointerDown={(e) => { 
                    e.stopPropagation(); 
                    onSelectItem(f); 
                  }}
                >
                  <RoundedPlane width={cardWidth} height={cardHeight} radius={0.04} />
                  <meshStandardMaterial 
                    color={
                      isPlaced 
                        ? "rgba(143, 207, 250, 1)" 
                        : isHovered 
                        ? "rgba(193, 230, 255, 1)"
                        : "#ffffff"
                    }
                    roughness={0.9}
                    metalness={0.0}
                  />
                </mesh>

                {isPlaced && (
                  <mesh position={[0, 0.09, 0.03]}>
                    <planeGeometry args={[0.35, 0.35]} />
                    <meshBasicMaterial color="rgba(143, 207, 250, 1)" transparent opacity={0.5} />
                  </mesh>
                )}


                {/* {isPlaced && (
                  <Text
                    position={[0, 0.1, 0.05]}
                    fontSize={0.05}
                    color="rgba(233, 246, 255, 1)"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="600"
                  >
                    Placed
                  </Text>
                )} */}

                <group position={[0, 0.08, 0.01]}>
                  
                  {f.image ? (
                    <mesh>
                      <planeGeometry args={[0.35, 0.35]} />
                      <FurnitureImageMaterial image={f.image} />
                    </mesh>
                  ) : (
                    <mesh>
                      <planeGeometry args={[0.35, 0.35]} />
                      <meshStandardMaterial color="#d0d6dd" />
                      <Text 
                        fontSize={0.045} 
                        color="#ffffff" 
                        anchorX="center" 
                        anchorY="middle"
                      >
                        No Image
                      </Text>
                    </mesh>
                  )}
                </group>

                {f.type && (
                  <group position={[-0.07, -0.15, 0.02]}>
                    <mesh>
                      <planeGeometry args={[0.2, 0.07]} />
                      <meshStandardMaterial 
                        color="#2c3e50" 
                        roughness={0.5}
                      />
                    </mesh>
                    <Text
                      position={[0, 0, 0.001]}
                      fontSize={0.041}
                      color="#ffffff"
                      anchorX="center"
                      anchorY="middle"
                      fontWeight="600"
                    >
                      {f.type}
                    </Text>
                  </group>
                )}

                <Text
                  position={[0, -0.23, 0.02]}
                  fontSize={0.042}
                  color="#334155"
                  anchorX="center"
                  anchorY="middle"
                  maxWidth={cardWidth - 0.08}
                  textAlign="center"
                  fontWeight="500"
                >
                  {f.name}
                </Text>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

function FurnitureImageMaterial({ image }: { image: string }) {
  return <FurnitureImage image={image} />;
}
