import { useMemo } from "react";
import * as THREE from "three";

export function FurnitureImage({ image }: { image: string }) {
  const texture = useMemo(() => {
    if (!image) return null;
    
    const loader = new THREE.TextureLoader();
    const imageUrl = image.startsWith("data:") ? image : `data:image/png;base64,${image}`;
    
    const tex = loader.load(
      imageUrl,
      (texture) => {
        texture.needsUpdate = true;
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
      }
    );
    
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    
    return tex;
  }, [image]);

  if (!texture) {
    return (
      <mesh>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>
    );
  }

  return (
    <mesh>
      <planeGeometry args={[0.5, 0.5]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        side={THREE.FrontSide}
        toneMapped={false}
      />
    </mesh>
  );
}