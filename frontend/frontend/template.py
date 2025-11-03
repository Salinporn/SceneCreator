from typing import Callable
import reflex as rx
from .components.navbar import navbar_page

def template(page: Callable[[], rx.Component]) -> rx.Component:
    return rx.box(
        rx.vstack( 
                rx.box(navbar_page(),width="100%",max_width="100vw"),
        
                rx.box(page(),width="100%",max_width="100vw",padding="60px 50px"),
                
            ),
            style=style1,
        ),    

style1 = {
    "width": "100vw",
    "min_height": "100vh",
    "background_color": "white",
    "font_family": "Lato, sans-serif",


}