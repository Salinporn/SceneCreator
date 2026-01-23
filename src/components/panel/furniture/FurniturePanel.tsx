import * as React from "react";
import { Text } from "@react-three/drei";
import { Furniture } from "../../types/Furniture";
import { FurnitureImage } from "./FurnitureImage";
import { RoundedPlane, GradientBackground, CardBackground } from "../common/PanelElements";

export function VRFurniturePanel({
  show,
  catalog,
  loading,
  onSelectItem,
  placedFurnitureIds = [],
  onClose
}: {
  show: boolean;
  catalog: Furniture[];
  loading: boolean;
  onSelectItem: (f: Furniture) => void;
  placedFurnitureIds?: string[];
  onClose: () => void;
}) {
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);

  if (!show) return null;

  const itemsPerRow = 3;
  const rows = Math.ceil(catalog.length / itemsPerRow);

  const headerHeight = 0.25;
  const itemHeight = 0.5;
  const topPadding = 0.001;
  const bottomPadding = 0.02;

  const panelHeight = Math.max(
    1.2,
    headerHeight + topPadding + (rows * itemHeight) + bottomPadding
  );

  const panelWidth = 1;


  return (
    <group>
      {/* Main background - light theme */}
      <mesh position={[0, 0, -0.02]}>
        <GradientBackground width={panelWidth} height={panelHeight} radius={0.1} color1="#EAF4FA" color2="#F5F7FA" opacity={0.7} />
      </mesh>


      {/** Background Shadow */}
      <mesh position={[0, -0.01, -0.03]}>
        <RoundedPlane width={panelWidth} height={panelHeight} radius={0.1} />
        <meshStandardMaterial
          color="#000000"
          opacity={0.15}
          transparent
          roughness={1.0}
        />
      </mesh>



      {/* Header */}
      <Text
        position={[0, panelHeight / 2 - 0.12, 0.01]}
        fontSize={0.05}
        color="#334155"
        anchorX="center"
        anchorY="middle"
        fontWeight="semi-bold"
      >
        📦My Inventory
      </Text>
     
      {/* Close Button */}
      <group
        position={[0.4, 0.32, 0.01]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHoveredButton("close");
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHoveredButton(null);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <mesh>
          <RoundedPlane width={0.08} height={0.08} radius={0.03} />
          <meshStandardMaterial
            color={hoveredButton === "close" ? "##334155" : "#334155"}
            emissive={hoveredButton === "close" ? "#ccc" : "#ccc"}
            emissiveIntensity={hoveredButton === "close" ? 0.6 : 0.4}
          />
        </mesh>
        <Text
          position={[-0.005, -0.01, 0.01]}
          fontSize={0.05}
          color="#fff"
          anchorX="center"
          anchorY="middle"
        >
          ✕
        </Text>
      </group>
 
      {/* Content */}
      {loading ? (
        <group position={[0, 0, 0.01]}>
          <Text
            position={[0, 0, 0]}
            fontSize={0.03}
            color="#334155"
            anchorX="center"
            anchorY="middle"
          >
            Loading furniture...
          </Text>
        </group>
      ) : catalog.length === 0 ? (
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.03}
          color="#334155"
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

            const cardWidth = 0.25;
            const cardHeight = 0.4;
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
                  <CardBackground
                    width={cardWidth}
                    height={cardHeight}
                    radius={0.04}
                    colorTop={isPlaced ? "#C7E4FA" : isHovered ? "#C7E4FA" : "#DCEEFB"}
                    colorBottom={isPlaced ? "#A5D1E7" : isHovered ? "#E6F0F7" : "#F0F2F5"}
                    opacity={0.5}
                    topStrength={ isPlaced ? 2.5 : isHovered ? 2.8 : 2.5 }
                  />
                </mesh>

                {/* Card background Shadow */}
                <mesh position={[0, -0.01, -0.01]}>
                  <RoundedPlane width={cardWidth} height={cardHeight} radius={0.04} />
                  <meshStandardMaterial
                    color="#000000"
                    opacity={0.1}
                    transparent
                    roughness={1.0}
                  />
                </mesh>

                <group position={[0, 0.08, 0.01]}>

                  {f.image ? (
                    <mesh>
                      <planeGeometry args={[0.2, 0.2]} />
                      <FurnitureImageMaterial image={f.image} />
                    </mesh>
                  ) : (
                    <mesh>
                      <planeGeometry args={[0.2, 0.2]} />
                      <meshStandardMaterial color="#d0d6dd" />
                      <Text
                        fontSize={0.03}
                        color="#ffffffff"
                        anchorX="center"
                        anchorY="middle"
                      >
                        No Image
                      </Text>
                    </mesh>
                  )}
                </group>

                {f.type && (
                  <group position={[-0.04, -0.06, 0.02]}>
                    <mesh>
                      <planeGeometry args={[0.12, 0.05]} />
                      <meshStandardMaterial
                        color="#66B9E2"
                        roughness={0.5}
                      />
                    </mesh>
                    <Text
                      position={[0, 0, 0.001]}
                      fontSize={0.02}
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
                  position={[0, -0.14, 0.02]}
                  fontSize={0.03}
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
