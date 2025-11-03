import reflex as rx
from typing import Any, Dict

class ThreepipeViewer(rx.Component):
    tag = "ThreepipeViewerComponent"
    
    # Props
    model_url: rx.Var[str] = ""
    environment_url: rx.Var[str] = "https://samples.threepipe.org/minimal/venice_sunset_1k.hdr"
    width: rx.Var[str] = "100%"
    height: rx.Var[str] = "100vh"
    show_ui: rx.Var[bool] = True
    enable_dropzone: rx.Var[bool] = True
    
    initial_model_position: rx.Var[list] = [0, 25, 0]
    initial_model_scale: rx.Var[float] = 1.0
    
    def add_imports(self) -> Dict[str, Any]:
        return {
            "react": ["useRef", "useEffect", "useState"],
            "threepipe": {
                rx.utils.imports.ImportVar(tag="ThreeViewer", install=True),
                rx.utils.imports.ImportVar(tag="LoadingScreenPlugin", install=True),
                rx.utils.imports.ImportVar(tag="PickingPlugin", install=True),
                rx.utils.imports.ImportVar(tag="TransformControlsPlugin", install=True),
                rx.utils.imports.ImportVar(tag="EditorViewWidgetPlugin", install=True),
                rx.utils.imports.ImportVar(tag="DropzonePlugin", install=True),
            },
            "@threepipe/plugin-tweakpane": {
                rx.utils.imports.ImportVar(tag="TweakpaneUiPlugin", install=True),
            },
        }
    
    def add_custom_code(self) -> list[str]:
        return [
            """
            function ThreepipeViewerComponent({ 
                modelUrl = "",
                environmentUrl = "https://samples.threepipe.org/minimal/venice_sunset_1k.hdr",
                width = "100%",
                height = "100vh",
                showUi = true,
                enableDropzone = true,
                initialModelPosition = [0, 0, 0],
                initialModelScale = 0.5
            }) {
                const canvasRef = useRef(null);
                const viewerRef = useRef(null);
                const pluginsRef = useRef({});
                const initialModelUrlRef = useRef(modelUrl);
                const [loading, setLoading] = useState(true);
                const [error, setError] = useState(null);
                const [initialized, setInitialized] = useState(false);
                const [showDropPrompt, setShowDropPrompt] = useState(!modelUrl);
                const [loadedModels, setLoadedModels] = useState([]);
                
                // Sidebar state
                const [sidebarOpen, setSidebarOpen] = useState(true);
                const [decorationsExpanded, setDecorationsExpanded] = useState(false);
                const [modelsExpanded, setModelsExpanded] = useState(false);
                const [searchQuery, setSearchQuery] = useState('');
                const [selectedCategory, setSelectedCategory] = useState('All');

                useEffect(() => {
                    let viewer = null;
                    let cleanup = false;
                    let animationFrameId = null;
                    
                    async function initViewer() {
                        if (!canvasRef.current || cleanup) return;
                        
                        try {
                            setLoading(true);
                            setError(null);
                            
                            console.log('🚀 Starting Threepipe initialization...');
                            
                            if (cleanup) return;
                            
                            viewer = new ThreeViewer({
                                canvas: canvasRef.current,
                                msaa: true,
                                renderScale: 'auto',
                                plugins: [LoadingScreenPlugin],
                                camera: {
                                    near: 0.0001,
                                    far: 100000,
                                },
                                dropzone: enableDropzone ? {
                                    allowedExtensions: ['gltf', 'glb', 'hdr', 'bin', 'png', 'jpeg', 'webp', 'jpg', 'exr', 'fbx', 'obj', 'stl', 'ply', 'usdz', 'zip'],
                                    addOptions: {
                                        disposeSceneObjects: false,
                                        autoSetEnvironment: true,
                                        autoScale: false,
                                        autoCenter: false,
                                        autoScaleRadius: 5,
                                        importConfig: true,
                                    },
                                } : false,
                            });
                            
                            viewerRef.current = viewer;
                            
                            const camera = viewer.scene.mainCamera;
                            
                            if (camera.controls) {
                                camera.controls.minDistance = 0.01;
                                camera.controls.maxDistance = 1000;
                                camera.controls.enableDamping = true;
                                camera.controls.dampingFactor = 0.05;
                            }
                            
                            function updateCameraClipping() {
                                if (!viewer || cleanup) return;
                                
                                const cam = viewer.scene.mainCamera;
                                if (cam.isPerspectiveCamera && cam.controls) {
                                    const distance = cam.controls.target.distanceTo(cam.position);
                                    cam.near = Math.max(distance * 0.0001, 0.00001);
                                    cam.far = Math.max(distance * 1000, 10000);
                                    cam.updateProjectionMatrix();
                                }
                                
                                if (!cleanup) {
                                    animationFrameId = requestAnimationFrame(updateCameraClipping);
                                }
                            }
                            
                            updateCameraClipping();
                            
                            const picking = viewer.addPluginSync(PickingPlugin);
                            const transformControlsPlugin = viewer.addPluginSync(TransformControlsPlugin);
                            const editorView = viewer.addPluginSync(
                                new EditorViewWidgetPlugin('bottom-left', 256)
                            );
                            
                            pluginsRef.current = {
                                picking,
                                transformControlsPlugin,
                                editorView
                            };
                            
                            if (enableDropzone) {
                                const dropzone = viewer.getPlugin(DropzonePlugin);
                                if (dropzone) {
                                    let droppedFileNames = [];
                                    
                                    canvasRef.current.addEventListener('drop', (e) => {
                                        droppedFileNames = [];
                                        if (e.dataTransfer && e.dataTransfer.files) {
                                            for (let file of e.dataTransfer.files) {
                                                droppedFileNames.push(file.name);
                                            }
                                        }
                                    });
                                    
                                    dropzone.addEventListener('drop', (e) => {
                                        if (e.assets && e.assets.length > 0) {
                                            setShowDropPrompt(false);
                                            
                                            const newModels = e.assets.map((asset, index) => {
                                                const fileName = droppedFileNames[index] || 
                                                               asset.name || 
                                                               asset.assetInfo?.originalName ||
                                                               asset.modelObject?.name || 
                                                               `Model ${index + 1}`;
                                                
                                                if (asset.modelObject) {
                                                    asset.modelObject.position.set(0, 0, 0);
                                                    asset.modelObject.scale.set(1, 1, 1);
                                                }
                                                
                                                return {
                                                    name: fileName,
                                                    object: asset,
                                                    id: Math.random().toString(36).substr(2, 9)
                                                };
                                            });
                                            
                                            setLoadedModels(prev => [...prev, ...newModels]);
                                            
                                            if (e.assets[0] && picking) {
                                                setTimeout(() => {
                                                    picking.setSelectedObject(e.assets[0]);
                                                }, 100);
                                            }
                                        }
                                    });
                                }
                            }
                            
                            if (showUi) {
                                try {
                                    const ui = viewer.addPluginSync(new TweakpaneUiPlugin(true));
                                    ui.setupPluginUi(TransformControlsPlugin, { expanded: true });
                                    ui.setupPluginUi(PickingPlugin);
                                    ui.setupPluginUi(EditorViewWidgetPlugin);
                                    if (enableDropzone) {
                                        ui.setupPluginUi(DropzonePlugin);
                                    }
                                    pluginsRef.current.ui = ui;
                                } catch (uiError) {
                                    console.error('❌ Tweakpane UI error:', uiError);
                                }
                            }
                            
                            if (environmentUrl) {
                                await viewer.setEnvironmentMap(environmentUrl);
                            }
                            
                            if (modelUrl) {
                                const model = await viewer.load(modelUrl, {
                                    autoCenter: false,
                                    autoScale: false,
                                });
                                
                                if (model) {
                                    if (model.modelObject) {
                                        model.modelObject.position.set(
                                            initialModelPosition[0],
                                            initialModelPosition[1],
                                            initialModelPosition[2]
                                        );
                                        model.modelObject.scale.set(
                                            initialModelScale,
                                            initialModelScale,
                                            initialModelScale
                                        );
                                    }
                                    
                                    setShowDropPrompt(false);
                                    
                                    const modelName = modelUrl.split('/').pop() || 'Initial Model';
                                    const newModel = {
                                        name: modelName,
                                        object: model,
                                        id: 'initial-model'
                                    };
                                    setLoadedModels([newModel]);
                                    
                                    if (picking) {
                                        picking.setSelectedObject(model);
                                    }
                                }
                            }
                            
                            window.threepipeViewer = viewer;
                            window.threepipePicking = picking;
                            
                            window.loadFurnitureFromUrl = async (url, name) => {
                                try {
                                    const model = await viewer.load(url, {
                                        autoCenter: false,
                                        autoScale: false,
                                    });
                                    
                                    if (model && model.modelObject) {
                                        model.modelObject.position.set(0, 0, 0);
                                        model.modelObject.scale.set(1, 1, 1);
                                        
                                        const newModel = {
                                            name: name,
                                            object: model,
                                            id: Math.random().toString(36).substr(2, 9)
                                        };
                                        
                                        setLoadedModels(prev => [...prev, newModel]);
                                        setShowDropPrompt(false);
                                        
                                        if (picking) {
                                            picking.setSelectedObject(model);
                                        }
                                        
                                        return true;
                                    }
                                } catch (err) {
                                    console.error('❌ Failed to load furniture:', err);
                                    return false;
                                }
                            };
                            
                            setLoading(false);
                            setInitialized(true);
                            
                        } catch (err) {
                            console.error('💥 Error:', err);
                            if (!cleanup) {
                                setError(err.message);
                                setLoading(false);
                            }
                        }
                    }
                    
                    initViewer();
                    
                    return () => {
                        cleanup = true;
                        if (animationFrameId) {
                            cancelAnimationFrame(animationFrameId);
                        }
                        if (viewer) {
                            try {
                                viewer.dispose();
                            } catch (e) {
                                console.error('Dispose error:', e);
                            }
                        }
                    };
                }, [showUi, enableDropzone, initialModelPosition, initialModelScale]);
                
                const selectModel = (model) => {
                    if (pluginsRef.current.picking && model.object) {
                        pluginsRef.current.picking.setSelectedObject(model.object);
                    }
                };
                
                const removeModel = (modelId) => {
                    const modelToRemove = loadedModels.find(m => m.id === modelId);
                    if (modelToRemove && viewerRef.current) {
                        viewerRef.current.scene.remove(modelToRemove.object);
                        modelToRemove.object.dispose?.();
                        setLoadedModels(prev => prev.filter(m => m.id !== modelId));
                        
                        if (loadedModels.length === 1) {
                            setShowDropPrompt(true);
                        }
                    }
                };
                
                // Enhanced furniture catalog with more items
                const furnitureCatalog = [
                    {
                        id: 'chair1',
                        name: 'Rocking Chair',
                        url: '/models/Rocking_Chair.glb',
                        thumbnail: '🪑',
                        category: 'Seating',
                        tags: ['chair', 'rocking', 'furniture', 'seating']
                    },
                    {
                        id: 'helmet1',
                        name: 'Damaged Helmet',
                        url: 'https://samples.threepipe.org/minimal/DamagedHelmet/glTF/DamagedHelmet.gltf',
                        thumbnail: '🪖',
                        category: 'Decoration',
                        tags: ['helmet', 'decoration', 'metal']
                    },
                    {
                        id: 'cabin1',
                        name: 'Forest Cabin',
                        url: '/models/forest_cabin.glb',
                        thumbnail: '🏠',
                        category: 'Building',
                        tags: ['cabin', 'house', 'building', 'forest']
                    },
                    {
                        id: 'sofa1',
                        name: 'Modern Sofa',
                        url: '/models/sofa.glb',
                        thumbnail: '🛋️',
                        category: 'Seating',
                        tags: ['sofa', 'couch', 'furniture', 'seating', 'modern']
                    },
                    {
                        id: 'table1',
                        name: 'Dining Table',
                        url: '/models/table.glb',
                        thumbnail: '🪑',
                        category: 'Tables',
                        tags: ['table', 'dining', 'furniture', 'wood']
                    },
                    {
                        id: 'lamp1',
                        name: 'Floor Lamp',
                        url: '/models/lamp.glb',
                        thumbnail: '💡',
                        category: 'Lighting',
                        tags: ['lamp', 'light', 'floor', 'lighting']
                    },
                    {
                        id: 'bed1',
                        name: 'King Bed',
                        url: '/models/bed.glb',
                        thumbnail: '🛏️',
                        category: 'Bedroom',
                        tags: ['bed', 'bedroom', 'sleep', 'furniture']
                    },
                    {
                        id: 'desk1',
                        name: 'Office Desk',
                        url: '/models/desk.glb',
                        thumbnail: '🖥️',
                        category: 'Tables',
                        tags: ['desk', 'office', 'work', 'table']
                    },
                ];
                
                // Get unique categories
                const categories = ['All', ...new Set(furnitureCatalog.map(item => item.category))];
                
                // Filter furniture by category and search query
                const filteredFurniture = furnitureCatalog.filter(item => {
                    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
                    const search = searchQuery.toLowerCase();
                    const matchesSearch = !search || (
                        item.name.toLowerCase().includes(search) ||
                        item.category.toLowerCase().includes(search) ||
                        item.tags.some(tag => tag.toLowerCase().includes(search))
                    );
                    return matchesCategory && matchesSearch;
                });
                
                // Group furniture by category
                const groupedFurniture = {};
                filteredFurniture.forEach(item => {
                    if (!groupedFurniture[item.category]) {
                        groupedFurniture[item.category] = [];
                    }
                    groupedFurniture[item.category].push(item);
                });
                
                const loadFurniture = (item) => {
                    window.loadFurnitureFromUrl(item.url, item.name);
                };
                
                return (
                    <div style={{
                        width: width,
                        height: height,
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: '#1a1a2e'
                    }}>
                        <canvas 
                            ref={canvasRef}
                            id="mcanvas"
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'block'
                            }}
                        />
                        
                        {/* SIDEBAR */}
                        <div style={{
                            position: 'absolute',
                            left: sidebarOpen ? '0' : '-400px',
                            top: '0',
                            width: '400px',
                            height: '100%',
                            background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
                            borderRight: '1px solid rgba(0, 0, 0, 0.1)',
                            boxShadow: sidebarOpen ? '4px 0 32px rgba(0, 0, 0, 0.15)' : 'none',
                            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            zIndex: 1500,
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            {/* Sidebar Header */}
                            <div style={{
                                padding: '24px 20px',
                                borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                                background: 'white',
                            }}>
                                <div style={{
                                    color: '#1a1a2e',
                                    fontSize: '24px',
                                    fontWeight: '700',
                                    marginBottom: '8px',
                                }}>
                                    Digital Home
                                </div>
                                <div style={{
                                    color: '#64748b',
                                    fontSize: '14px',
                                }}>
                                    Back to Shop
                                </div>
                            </div>
                            
                            {/* Main Content */}
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '16px',
                                background: '#f8f9fa',
                            }}>
                                {/* Decorations Section */}
                                <div style={{ marginBottom: '12px' }}>
                                    <button
                                        onClick={() => {
                                            setDecorationsExpanded(!decorationsExpanded);
                                            if (!decorationsExpanded) {
                                                setModelsExpanded(false);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '18px 20px',
                                            background: decorationsExpanded 
                                                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                                : 'white',
                                            border: '1px solid rgba(0, 0, 0, 0.08)',
                                            borderRadius: '12px',
                                            color: decorationsExpanded ? 'white' : '#1a1a2e',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            textAlign: 'left',
                                            boxShadow: decorationsExpanded ? '0 4px 12px rgba(59, 130, 246, 0.25)' : 'none',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!decorationsExpanded) {
                                                e.currentTarget.style.background = '#f1f5f9';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!decorationsExpanded) {
                                                e.currentTarget.style.background = 'white';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '24px' }}>🛋️</span>
                                            <span>Furniture Catalog</span>
                                        </div>
                                        <span style={{ 
                                            fontSize: '18px',
                                            transform: decorationsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.3s'
                                        }}>
                                            ▼
                                        </span>
                                    </button>
                                    
                                    {/* Decorations Expanded Content */}
                                    {decorationsExpanded && (
                                        <div style={{
                                            marginTop: '12px',
                                            padding: '20px',
                                            background: 'white',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(0, 0, 0, 0.08)',
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                                        }}>
                                            {/* Search Bar */}
                                            <div style={{ marginBottom: '16px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Search furniture..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '12px 16px 12px 44px',
                                                            background: '#f8f9fa',
                                                            border: '1px solid rgba(0, 0, 0, 0.1)',
                                                            borderRadius: '10px',
                                                            color: '#1a1a2e',
                                                            fontSize: '14px',
                                                            outline: 'none',
                                                            transition: 'all 0.2s',
                                                        }}
                                                        onFocus={(e) => {
                                                            e.target.style.background = 'white';
                                                            e.target.style.borderColor = '#3b82f6';
                                                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                                        }}
                                                        onBlur={(e) => {
                                                            e.target.style.background = '#f8f9fa';
                                                            e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                                                            e.target.style.boxShadow = 'none';
                                                        }}
                                                    />
                                                    <span style={{
                                                        position: 'absolute',
                                                        left: '16px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        fontSize: '18px',
                                                        pointerEvents: 'none',
                                                    }}>
                                                        🔍
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Category Filter Buttons */}
                                            <div style={{ marginBottom: '20px' }}>
                                                <div style={{
                                                    color: '#64748b',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    marginBottom: '12px',
                                                }}>
                                                    Categories
                                                </div>
                                                <div style={{ 
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '8px',
                                                }}>
                                                    {categories.map((category) => (
                                                        <button
                                                            key={category}
                                                            onClick={() => setSelectedCategory(category)}
                                                            style={{
                                                                padding: '8px 16px',
                                                                background: selectedCategory === category 
                                                                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                                                    : '#f1f5f9',
                                                                border: 'none',
                                                                borderRadius: '20px',
                                                                color: selectedCategory === category ? 'white' : '#475569',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                boxShadow: selectedCategory === category 
                                                                    ? '0 2px 8px rgba(59, 130, 246, 0.3)' 
                                                                    : 'none',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (selectedCategory !== category) {
                                                                    e.target.style.background = '#e2e8f0';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (selectedCategory !== category) {
                                                                    e.target.style.background = '#f1f5f9';
                                                                }
                                                            }}
                                                        >
                                                            {category}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {/* Furniture Display by Category */}
                                            <div style={{ 
                                                maxHeight: '500px',
                                                overflowY: 'auto',
                                                paddingRight: '4px',
                                            }}>
                                                {Object.keys(groupedFurniture).length > 0 ? (
                                                    Object.entries(groupedFurniture).map(([category, items]) => (
                                                        <div key={category} style={{ marginBottom: '24px' }}>
                                                            <div style={{
                                                                color: '#1a1a2e',
                                                                fontSize: '15px',
                                                                fontWeight: '700',
                                                                marginBottom: '12px',
                                                                paddingBottom: '8px',
                                                                borderBottom: '2px solid #e2e8f0',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                            }}>
                                                                <span>{category}</span>
                                                                <span style={{
                                                                    background: '#e2e8f0',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '11px',
                                                                    fontWeight: '600',
                                                                    color: '#64748b',
                                                                }}>
                                                                    {items.length}
                                                                </span>
                                                            </div>
                                                            
                                                            <div style={{ 
                                                                display: 'grid',
                                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                                gap: '12px',
                                                            }}>
                                                                {items.map((item) => (
                                                                    <div 
                                                                        key={item.id}
                                                                        style={{
                                                                            background: 'white',
                                                                            border: '1px solid rgba(0, 0, 0, 0.08)',
                                                                            borderRadius: '12px',
                                                                            overflow: 'hidden',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s',
                                                                        }}
                                                                        onClick={() => loadFurniture(item)}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                                                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.2)';
                                                                            e.currentTarget.style.borderColor = '#3b82f6';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                                            e.currentTarget.style.boxShadow = 'none';
                                                                            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                                                                        }}
                                                                    >
                                                                        {/* Thumbnail */}
                                                                        <div style={{
                                                                            width: '100%',
                                                                            height: '100px',
                                                                            background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: '40px',
                                                                            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                                                                        }}>
                                                                            {item.thumbnail}
                                                                        </div>
                                                                        
                                                                        {/* Info */}
                                                                        <div style={{ padding: '12px' }}>
                                                                            <div style={{
                                                                                color: '#1a1a2e',
                                                                                fontSize: '13px',
                                                                                fontWeight: '600',
                                                                                marginBottom: '4px',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                                whiteSpace: 'nowrap',
                                                                            }}>
                                                                                {item.name}
                                                                            </div>
                                                                            <div style={{
                                                                                color: '#64748b',
                                                                                fontSize: '11px',
                                                                            }}>
                                                                                Click to add
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{
                                                        textAlign: 'center',
                                                        padding: '40px 20px',
                                                        color: '#64748b',
                                                        fontSize: '14px',
                                                    }}>
                                                        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
                                                        <div>No furniture found</div>
                                                        <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                                                            Try a different search or category
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Loaded Models Section */}
                                <div style={{ marginBottom: '12px' }}>
                                    <button
                                        onClick={() => {
                                            setModelsExpanded(!modelsExpanded);
                                            if (!modelsExpanded) {
                                                setDecorationsExpanded(false);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '18px 20px',
                                            background: modelsExpanded 
                                                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                : 'white',
                                            border: '1px solid rgba(0, 0, 0, 0.08)',
                                            borderRadius: '12px',
                                            color: modelsExpanded ? 'white' : '#1a1a2e',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            textAlign: 'left',
                                            boxShadow: modelsExpanded ? '0 4px 12px rgba(34, 197, 94, 0.25)' : 'none',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!modelsExpanded) {
                                                e.currentTarget.style.background = '#f1f5f9';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!modelsExpanded) {
                                                e.currentTarget.style.background = 'white';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '24px' }}>📥</span>
                                            <span>Loaded Models</span>
                                            <span style={{
                                                background: modelsExpanded ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                            }}>
                                                {loadedModels.length}
                                            </span>
                                        </div>
                                        <span style={{ 
                                            fontSize: '18px',
                                            transform: modelsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.3s'
                                        }}>
                                            ▼
                                        </span>
                                    </button>
                                    
                                    {/* Loaded Models Content */}
                                    {modelsExpanded && (
                                        <div style={{
                                            marginTop: '12px',
                                            padding: '20px',
                                            background: 'white',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(0, 0, 0, 0.08)',
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                                            maxHeight: '500px',
                                            overflowY: 'auto',
                                        }}>
                                            {loadedModels.length === 0 ? (
                                                <div style={{
                                                    textAlign: 'center',
                                                    color: '#64748b',
                                                    padding: '40px 20px',
                                                }}>
                                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                                                    <div style={{ fontSize: '14px', fontWeight: '600' }}>No models loaded</div>
                                                    <div style={{ fontSize: '12px', marginTop: '8px' }}>
                                                        Drop files or add furniture
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {loadedModels.map((model) => (
                                                        <div 
                                                            key={model.id}
                                                            style={{
                                                                background: '#f8f9fa',
                                                                border: '1px solid rgba(0, 0, 0, 0.08)',
                                                                borderRadius: '10px',
                                                                padding: '14px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                            }}
                                                            onClick={() => selectModel(model)}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#e0f2fe';
                                                                e.currentTarget.style.borderColor = '#3b82f6';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = '#f8f9fa';
                                                                e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                                                            }}
                                                        >
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                gap: '12px',
                                                            }}>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{
                                                                        color: '#1a1a2e',
                                                                        fontSize: '14px',
                                                                        fontWeight: '600',
                                                                        marginBottom: '4px',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                    }}>
                                                                        {model.name}
                                                                    </div>
                                                                    <div style={{
                                                                        color: '#64748b',
                                                                        fontSize: '11px',
                                                                    }}>
                                                                        Click to select
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeModel(model.id);
                                                                    }}
                                                                    style={{
                                                                        background: '#fee2e2',
                                                                        border: '1px solid #fecaca',
                                                                        borderRadius: '8px',
                                                                        color: '#dc2626',
                                                                        padding: '8px 14px',
                                                                        fontSize: '12px',
                                                                        fontWeight: '600',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s',
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.target.style.background = '#fecaca';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.target.style.background = '#fee2e2';
                                                                    }}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* SIDEBAR TOGGLE BUTTON */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            style={{
                                position: 'absolute',
                                left: sidebarOpen ? '400px' : '0',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '20px',
                                height: '80px',
                                background: 'white',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                borderLeft: sidebarOpen ? '1px solid rgba(0, 0, 0, 0.1)' : 'none',
                                borderRadius: sidebarOpen ? '0 12px 12px 0' : '0 12px 12px 0',
                                color: '#1a1a2e',
                                fontSize: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                zIndex: 1600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '2px 0 12px rgba(0, 0, 0, 0.1)',
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#3b82f6';
                                e.target.style.color = 'white';
                                e.target.style.width = '28px';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'white';
                                e.target.style.color = '#1a1a2e';
                                e.target.style.width = '20px';
                            }}
                        >
                            {sidebarOpen ? '<' : '>'}
                        </button>
                        
                        {/* Loading, Error, etc. - same as before */}
                        {loading && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: '18px',
                                textAlign: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                padding: '24px 32px',
                                borderRadius: '12px',
                                zIndex: 999
                            }}>
                                <div style={{ marginBottom: '12px', fontSize: '32px' }}>🔄</div>
                                <div style={{ fontWeight: 'bold' }}>Loading...</div>
                            </div>
                        )}
                        
                        <style>{`
                            @keyframes spin {
                                from { transform: rotate(0deg); }
                                to { transform: rotate(360deg); }
                            }
                        `}</style>
                    </div>
                );
            }
            """
        ]

threepipe_advanced_viewer = ThreepipeViewer.create

class ViewerState(rx.State):
    """State for the 3D viewer."""
    
    initial_model: str = "/models/forest_cabin.glb"
    current_model: str = initial_model
    show_ui: bool = True
    enable_dropzone: bool = True
    
    initial_model_position: list = [-20, -8, 10]
    initial_model_scale: float = 1.5
    
    def load_helmet(self):
        self.current_model = "https://samples.threepipe.org/minimal/DamagedHelmet/glTF/DamagedHelmet.gltf"
    
    def load_chair(self):
        self.current_model = "/models/Rocking_Chair.glb"
    
    def toggle_ui(self):
        self.show_ui = not self.show_ui 

def room_content() -> rx.Component:
     return rx.fragment(
        rx.box(
            threepipe_advanced_viewer(
                model_url=ViewerState.current_model,
                show_ui=ViewerState.show_ui,
                enable_dropzone=ViewerState.enable_dropzone,
                initial_model_position=ViewerState.initial_model_position,
                initial_model_scale=ViewerState.initial_model_scale,
                width="100%",
                height="100vh",
            ),
            position="relative",
        ),
        
        width="100%",
        height="100vh",
        bg="gray.900",
        overflow="hidden",
    )

def my_digital_home_page() -> rx.Component:
    return room_content()