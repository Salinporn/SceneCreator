import * as React from 'react'; 
import * as THREE from 'three';

export function RoundedPlane({ width, height, radius }: { width: number; height: number; radius: number }) {
  const shape = React.useMemo(() => {
    const s = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    s.moveTo(x + radius, y);
    s.lineTo(x + width - radius, y);
    s.quadraticCurveTo(x + width, y, x + width, y + radius);
    s.lineTo(x + width, y + height - radius);
    s.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    s.lineTo(x + radius, y + height);
    s.quadraticCurveTo(x, y + height, x, y + height - radius);
    s.lineTo(x, y + radius);
    s.quadraticCurveTo(x, y, x + radius, y);
    return s;
  }, [width, height, radius]);

  return <shapeGeometry args={[shape]} />;
}

export function GradientBackground({ 
  width, 
  height, 
  radius, 
  color1, 
  color2, 
  opacity = 1.0 
}: {
  width: number;
  height: number;
  radius: number;
  color1: string;
  color2: string;
  opacity?: number;
}) {
  const material = React.useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(color1) },
        color2: { value: new THREE.Color(color2) },
        opacity: { value: opacity },
      },
      transparent: true, // allow transparency
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          vec3 blended = mix(color1, color2, vUv.y);
          gl_FragColor = vec4(blended, opacity);
        }
      `,
    });
  }, [color1, color2, opacity]);

  return (
    <mesh>
      <RoundedPlane width={width} height={height} radius={radius} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

interface CardBackgroundProps {
  width: number;
  height: number;
  radius: number;
  colorTop: string;
  colorBottom: string;
  opacity?: number;
  topStrength?: number; // 0 = no top color, 1 = full top color
}

export function CardBackground({
  width,
  height,
  radius,
  colorTop,
  colorBottom,
  opacity = 1.0,
  topStrength = 1.0,
}: CardBackgroundProps) {
  const material = React.useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorTop: { value: new THREE.Color(colorTop) },
        colorBottom: { value: new THREE.Color(colorBottom) },
        opacity: { value: opacity },
        topStrength: { value: topStrength },
      },
      transparent: true,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorTop;
        uniform vec3 colorBottom;
        uniform float opacity;
        uniform float topStrength;
        varying vec2 vUv;
        void main() {
          // Mix bottom and top colors, scaling top color by topStrength
          vec3 blended = mix(colorBottom, colorTop, vUv.y * topStrength);
          gl_FragColor = vec4(blended, opacity);
        }
      `,
    });
  }, [colorTop, colorBottom, opacity, topStrength]);

  return (
    <mesh>
      <RoundedPlane width={width} height={height} radius={radius} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function ButtonBackground({
  width,
  height,
  radius,
  colorTop,
  colorBottom,
  opacity = 1.0,
}: {
  width: number;
  height: number;
  radius: number;
  colorTop: string;
  colorBottom: string;
  opacity?: number;
}) {
  const material = React.useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorTop: { value: new THREE.Color(colorTop) },
        colorBottom: { value: new THREE.Color(colorBottom) },
        opacity: { value: opacity },
      },
      transparent: true,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorTop;
        uniform vec3 colorBottom;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          vec3 blended = mix(colorBottom, colorTop, vUv.y);
          gl_FragColor = vec4(blended, opacity);
        }
      `,
    });
  }, [colorTop, colorBottom, opacity]);

  return (
    <mesh>
      <RoundedPlane width={width} height={height} radius={radius} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
