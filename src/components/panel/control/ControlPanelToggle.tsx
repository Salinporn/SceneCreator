import * as React from "react";
import { useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";

export function ControlPanelToggle({ onToggle }: { onToggle: () => void }) {
  const xr = useXR();
  const prevButtonStateRef = React.useRef<Map<string, boolean>>(new Map());

  useFrame(() => {
    const session = xr.session;
    if (!session || !session.inputSources) return;

    session.inputSources.forEach((inputSource, controllerIndex: number) => {
      const gamepad = inputSource.gamepad;
      if (!gamepad || !gamepad.buttons) return;

      const buttonIndex = 4; // X and A buttons
      const button = gamepad.buttons[buttonIndex];
      if (!button) return;

      const isPressed = button.pressed;
      const key = `${controllerIndex}-${buttonIndex}`;
      const wasPressed = prevButtonStateRef.current.get(key) || false;

      if (isPressed && !wasPressed) {
        onToggle();
      }

      prevButtonStateRef.current.set(key, isPressed);
    });
  });

  return null;
}