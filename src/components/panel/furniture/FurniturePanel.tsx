import * as React from "react"; 
import { Text } from "@react-three/drei";
import { Furniture } from "../../types/Furniture";
import { FurnitureImage } from "./FurnitureImage";

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
  const itemHeight = 0.9;
  const topPadding = 0.1;
  const bottomPadding = 0.15;
  
  const panelHeight = Math.max(
    2.0,
    headerHeight + topPadding + (rows * itemHeight) + bottomPadding
  );

  const panelWidth = 2.6;

  
  return (
    <group>
      {/* Main background - light theme */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[panelWidth, panelHeight]} />
        <meshStandardMaterial 
          color="#f8fafc" 
          opacity={0.5} 
          transparent 
          roughness={0.7}
        />
      </mesh>

      {/* Header */}
      <Text 
        position={[0, panelHeight / 2 - 0.13, 0.01]} 
        fontSize={0.1} 
        color="#1e293b" 
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
            color="#64748b" 
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
          color="#64748b" 
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
            
            const cardWidth = 0.6;
            const cardHeight = 0.8;
            const cardSpacing = 0.1;
            const totalWidth = itemsPerRow * cardWidth + (itemsPerRow - 1) * cardSpacing;
            const x = -totalWidth / 2 + col * (cardWidth + cardSpacing) + cardWidth / 2;
            const y = panelHeight / 2 - headerHeight - topPadding - (row * itemHeight) - cardHeight / 2;

            const isHovered = hoveredItem === f.id;
          const isPlaced = placedFurnitureIds.includes(f.id);

            return (
              <group key={`${f.id}-${itemIndex}`} position={[x, y, 0.02]}>
                {/* Card shadow */}
                <mesh position={[0, 0, -0.001]}>
                  <planeGeometry args={[cardWidth + 0.015, cardHeight + 0.015]} />
                  <meshStandardMaterial 
                    color="#cbd5e1" 
                    transparent 
                    opacity={0.3}
                  />
                </mesh>

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
                  <planeGeometry args={[cardWidth, cardHeight]} />
                  <meshStandardMaterial 
                    color={
                      isPlaced 
                        ? "#e2e8f0"   // greyed if already placed
                        : isHovered 
                        ? "#e0f2fe"   // blue highlight when hovered
                        : "#ffffff"
                    }
                    roughness={0.9}
                    metalness={0.0}
                  />
                </mesh>

                {isPlaced && (
                  <mesh position={[0, 0, 0.03]}>
                    <planeGeometry args={[cardWidth + 0.02, cardHeight + 0.02]} />
                    <meshBasicMaterial color="#22c55e" transparent opacity={0.5} />
                  </mesh>
                )}

                {isPlaced && (
                  <Text
                    position={[0, -0.38, 0.05]}
                    fontSize={0.045}
                    color="#16a34a"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="600"
                  >
                    ✓ Placed
                  </Text>
                )}

                <group position={[0, 0.08, 0.01]}>
                  <mesh position={[0, 0, -0.001]}>
                    <planeGeometry args={[0.5, 0.5]} />
                    <meshBasicMaterial color="#f1f5f9" />
                  </mesh>
                  
                  {f.image ? (
                    <mesh>
                      <planeGeometry args={[0.48, 0.48]} />
                      <FurnitureImageMaterial image={f.image} />
                    </mesh>
                  ) : (
                    <mesh>
                      <planeGeometry args={[0.48, 0.48]} />
                      <meshStandardMaterial color="#d0d6dd" />
                      <Text 
                        fontSize={0.04} 
                        color="#7d8899" 
                        anchorX="center" 
                        anchorY="middle"
                      >
                        No Image
                      </Text>
                    </mesh>
                  )}
                </group>

                {f.type && (
                  <group position={[-0.12, -0.22, 0.02]}>
                    <mesh>
                      <planeGeometry args={[0.24, 0.07]} />
                      <meshStandardMaterial 
                        color="#333333" 
                        roughness={0.5}
                      />
                    </mesh>
                    <Text
                      position={[0, 0, 0.001]}
                      fontSize={0.045}
                      color="#ffffff"
                      anchorX="center"
                      anchorY="middle"
                      fontWeight="500"
                    >
                      {f.type}
                    </Text>
                  </group>
                )}

                <Text
                  position={[0, -0.31, 0.02]}
                  fontSize={0.05}
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
