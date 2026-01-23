import { Text } from "@react-three/drei";
import { GradientBackground, RoundedPlane } from "./common/PanelElements";
import { useState } from "react";

interface VRCalibrationPanelProps {
  show: boolean;
  step: 'instructions' | 'positioning' | 'confirm' | 'complete';
  onConfirmPosition: () => void;
  onSkip?: () => void;
  onRecalibrate?: () => void;
  homeId: string;
  isRecalibration?: boolean;
}

const calibrationSteps = {
  instructions: {
    title: "Room Calibration Required",
    subtitle: "Align your virtual home with reality",
    content: [
      "To make furniture appear in the correct",
      "real-world location, we need to calibrate",
      "your position once.",
      "",
      "Stand at a recognizable spot in your room",
      "(like a doorway or corner) facing a known",
      "direction.",
    ],
    buttonText: "I'm Ready",
    buttonColor: "#1E40AF",
  },
  positioning: {
    title: "Set Your Position",
    subtitle: "Stand still and look forward",
    content: [
      "Stand at your chosen calibration point.",
      "",
      "Face the direction you want as 'forward'",
      "in your virtual home.",
      "",
      "When ready, press the button below to",
      "lock in your position.",
    ],
    buttonText: "Set Position",
    buttonColor: "#059669",
  },
  confirm: {
    title: "Confirm Calibration",
    subtitle: "Is the home aligned correctly?",
    content: [
      "Look around your virtual space.",
      "",
      "Does the 3D model align with your",
      "real room layout?",
      "",
      "If not, you can recalibrate.",
    ],
    buttonText: "Looks Good!",
    buttonColor: "#059669",
  },
  complete: {
    title: "Calibration Complete",
    subtitle: "Your room is now aligned",
    content: [
      "Your position has been saved.",
      "",
      "Next time you enter this home,",
      "it will automatically align to",
      "your real room.",
      "",
      "You can recalibrate from Settings.",
    ],
    buttonText: "Continue",
    buttonColor: "#1E40AF",
  },
};

export function VRCalibrationPanel({
  show,
  step,
  onConfirmPosition,
  onSkip,
  onRecalibrate,
  homeId,
  isRecalibration = false,
}: VRCalibrationPanelProps) {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  if (!show) return null;

  const currentStep = calibrationSteps[step];

  return (
    <group>
      {/* Background */}
      <mesh>
        <GradientBackground 
          width={1.1} 
          height={1.0} 
          radius={0.1} 
          color1="#EAF4FA" 
          color2="#F5F7FA" 
          opacity={0.9} 
        />
      </mesh>

      {/* Accent border top */}
      <mesh position={[0, 0.45, 0.005]}>
        <planeGeometry args={[1.0, 0.04]} />
        <meshBasicMaterial color="#1E40AF" />
      </mesh>

      {/* Icon/Indicator */}
      <group position={[0, 0.35, 0.01]}>
        <mesh>
          <circleGeometry args={[0.05, 32]} />
          <meshStandardMaterial 
            color={step === 'complete' ? '#059669' : '#1E40AF'} 
            emissive={step === 'complete' ? '#059669' : '#1E40AF'}
            emissiveIntensity={0.3}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.04}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          {step === 'complete' ? '✓' : step === 'positioning' ? '◎' : '⚙'}
        </Text>
      </group>

      {/* Header */}
      <Text 
        position={[0, 0.25, 0.01]} 
        fontSize={0.05} 
        color="#1E293B" 
        anchorX="center" 
        anchorY="middle" 
        fontWeight="bold"
      >
        {isRecalibration && step === 'instructions' ? 'Recalibrate Room' : currentStep.title}
      </Text>

      {/* Subtitle */}
      <Text 
        position={[0, 0.18, 0.01]} 
        fontSize={0.032} 
        color="#64748B" 
        anchorX="center" 
        anchorY="middle"
      >
        {currentStep.subtitle}
      </Text>

      {/* Separator */}
      <mesh position={[0, 0.12, 0.01]}>
        <planeGeometry args={[0.9, 0.002]} />
        <meshBasicMaterial color="#CBD5E1" />
      </mesh>

      {/* Content */}
      {currentStep.content.map((line, i) => (
        <Text 
          key={i} 
          position={[0, 0.05 - i * 0.055, 0.01]} 
          fontSize={0.028} 
          color="#475569" 
          anchorX="center" 
          anchorY="middle"
          maxWidth={0.95}
        >
          {line}
        </Text>
      ))}

      {/* Home ID indicator (small) */}
      <Text 
        position={[0.4, -0.4, 0.01]} 
        fontSize={0.02} 
        color="#94A3B8" 
        anchorX="right" 
        anchorY="middle"
      >
        Home: {homeId}
      </Text>

      {/* Main Action Button */}
      <group
        position={[0, -0.35, 0.01]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHoveredButton("main");
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHoveredButton(null);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onConfirmPosition();
        }}
      >
        <mesh>
          <RoundedPlane width={0.4} height={0.1} radius={0.05} />
          <meshStandardMaterial
            color={hoveredButton === "main" ? currentStep.buttonColor : currentStep.buttonColor}
            emissive={currentStep.buttonColor}
            emissiveIntensity={hoveredButton === "main" ? 0.5 : 0.2}
          />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.035}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {currentStep.buttonText}
        </Text>
      </group>

      {/* Secondary buttons */}
      {step === 'confirm' && onRecalibrate && (
        <group
          position={[-0.25, -0.35, 0.01]}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredButton("recalibrate");
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setHoveredButton(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onRecalibrate();
          }}
        >
          <mesh>
            <RoundedPlane width={0.25} height={0.08} radius={0.04} />
            <meshStandardMaterial
              color={hoveredButton === "recalibrate" ? "#DC2626" : "#EF4444"}
              emissive="#EF4444"
              emissiveIntensity={hoveredButton === "recalibrate" ? 0.4 : 0.1}
            />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.028}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
          >
            Recalibrate
          </Text>
        </group>
      )}

      {/* Skip button (only show on instructions for non-essential calibration) */}
      {step === 'instructions' && onSkip && (
        <group
          position={[0, -0.45, 0.01]}
          onPointerEnter={(e) => {
            e.stopPropagation();
            setHoveredButton("skip");
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            setHoveredButton(null);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSkip();
          }}
        >
          <Text
            fontSize={0.025}
            color={hoveredButton === "skip" ? "#64748B" : "#94A3B8"}
            anchorX="center"
            anchorY="middle"
          >
            Skip for now
          </Text>
        </group>
      )}

      {/* Step indicators */}
      <group position={[0, -0.48, 0.01]}>
        {['instructions', 'positioning', 'confirm', 'complete'].map((s, i) => (
          <mesh key={s} position={[(i - 1.5) * 0.06, 0, 0]}>
            <circleGeometry args={[0.012, 16]} />
            <meshBasicMaterial 
              color={s === step ? '#1E40AF' : '#CBD5E1'} 
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default VRCalibrationPanel;

