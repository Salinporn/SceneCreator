import reflex as rx
from typing import Any, Dict, List

class ThreeFiberCanvas(rx.Component):
    library = "@react-three/fiber"
    tag = "Canvas"

class CameraControls(rx.Component):
    tag = "CameraControls3DComponent"

    def add_imports(self) -> Dict[str, Any]:
        return {"react": ["useRef", "useEffect"], "@react-three/fiber": ["useThree"]}

    def add_custom_code(self) -> List[str]:
        return [
            """
            function CameraControls3DComponent() {
                const { camera, gl } = useThree();
                const controlsRef = useRef();

                useEffect(() => {
                    let controls;
                    (async () => {
                        const mod = await import('three/examples/jsm/controls/OrbitControls.js');
                        const { OrbitControls } = mod;
                        controls = new OrbitControls(camera, gl.domElement);
                    })();
                    return () => controls && controls.dispose();
                }, [camera, gl]);

                return null;
            }
            """
        ]

class SceneWithLighting(rx.Component):
    tag = "SceneWithLightingComponent"

    def add_custom_code(self) -> List[str]:
        return [
            """
            function SceneWithLightingComponent({ children }) {
                return (
                    <>
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[5,5,5]} intensity={1} castShadow />
                        {children}
                    </>
                );
            }
            """
        ]
