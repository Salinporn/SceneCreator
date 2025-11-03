'''import reflex as rx
from ..template import template
from ..components.model_viewer_3d import ThreeFiberCanvas, ModelViewer3D, CameraControls, SceneWithLighting
from ..state import State

def about_content(model:str) -> rx.Component:
  
    room_model_url = "/models/room.glb" 

    return rx.vstack(
        rx.heading("Room Preview"),
        rx.text(f"Received model: {model}"),

        rx.hstack(
        ThreeFiberCanvas.create(
            SceneWithLighting.create(
                
                ModelViewer3D.create(
                    url=room_model_url,
                    scale=2.0,
                    position=[0,0,0]
                ),
                
                ModelViewer3D.create(
                    url= model ,
                    scale=State.model_scale,
                    position=[State.model_x, State.model_y, State.model_z]
                ),
                CameraControls.create()
            ),
            camera={"position": [3,3,3], "fov":50},
            style={"background":"#fff"} 
        ),

        rx.form(
            rx.vstack(
                rx.input(
                    placeholder="Scale", 
                    value=State.model_scale, 
                    on_change=State.set_model_scale
                ),
                rx.input(
                    placeholder="X Position", 
                    value=State.model_x, 
                    on_change=State.set_model_x
                ),
                rx.input(
                    placeholder="Y Position", 
                    value=State.model_y, 
                    on_change=State.set_model_y
                ),
                rx.input(
                    placeholder="Z Position", 
                    value=State.model_z, 
                    on_change=State.set_model_z
                ),
                rx.button("Update Model", type="submit"),
                spacing="2"
            ),
            on_submit=rx.event.prevent_default
        ),
        width="700px",
        height="400px"
        ),

        spacing="4",
        align_item="center",

       
    )

@rx.page(route="/about")
def about_page() -> rx.Component:
    model = State.selected_model
    return template(lambda: about_content(model))
'''