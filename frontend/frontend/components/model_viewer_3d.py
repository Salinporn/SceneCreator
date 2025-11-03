import reflex as rx
from typing import Any, Dict, List
from reflex.components.component import NoSSRComponent


class ThreeFiberCanvas(NoSSRComponent):
    """Canvas for react-three-fiber (Three.js in React)."""

    library = "@react-three/fiber"
    tag = "Canvas"


class ModelViewer3D(rx.Component):
    """Load and display a GLB model using GLTFLoader."""

    tag = "ModelViewer3DComponent"

    url: rx.Var[str] = ""
    position: rx.Var[List[float]] = [0, 0, 0]
    scale: rx.Var[float] = 1.0
    rotation: rx.Var[List[float]] = [0, 0, 0]

    def add_imports(self) -> Dict[str, Any]:
        return {"react": ["useRef", "useEffect", "useState"]}

    def add_custom_code(self) -> List[str]:
        return [
            """
            function ModelViewer3DComponent({ url, position=[0,0,0], scale=1, rotation=[0,0,0] }) {
                const [model, setModel] = useState(null);
                const modelRef = useRef();

                useEffect(() => {
                    if (!url) return;
                    let cancelled = false;

                    (async () => {
                        const mod = await import('three/examples/jsm/loaders/GLTFLoader.js');
                        const { GLTFLoader } = mod;
                        const loader = new GLTFLoader();

                        loader.load(
                            url,
                            (gltf) => {
                                if (!cancelled) {
                                    setModel(gltf.scene);
                                }
                            },
                            undefined,
                            (err) => console.error("Error loading model:", err)
                        );
                    })();

                    return () => { cancelled = true; };
                }, [url]);

                if (!model) {
                    return (
                        <mesh position={position}>
                            <boxGeometry args={[1, 1, 1]} />
                            <meshStandardMaterial wireframe color="gray" />
                        </mesh>
                    );
                }

                return (
                    <primitive
                        ref={modelRef}
                        object={model}
                        position={position}
                        scale={scale}
                        rotation={rotation}
                        dispose={null}
                    />
                );
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
                        <directionalLight position={[5, 5, 5]} intensity={1} />
                        {children}
                    </>
                );
            }
            """
        ]


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
