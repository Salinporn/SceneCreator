# room.py
import reflex as rx
from ...state import DynamicState
from ...components.product_card import product_list
from ...template import template


def room_content() -> rx.Component:
    
    return rx.hstack(
        # Sidebar
        rx.box(
            rx.vstack(
                rx.center(
                    rx.image(
                        src=DynamicState.room_image,
                        width="95%",
                        height="auto",
                    ),
                    style={"margin": "0px 0px"},
                ),
                rx.center(
                    rx.text(
                        DynamicState.room_title,
                        font_size="18px",
                        font_weight="bold",
                        color="#22282C",
                    ),
                    width="100%",
                ),
                rx.vstack(
                    rx.foreach(
                        DynamicState.room_categories,
                        lambda category: rx.link(
                            rx.hstack(
                                rx.icon(tag="chevron-right", size=16),  
                                rx.text(category),
                                spacing="2",
                                align_items="center",
                            ),
                            style=menu_item_style(),
                            href="#"
        ),
    ),
    align_items="start",
    width="100%",
                ),

            ),
            width="280px",  
            height="100%",
            bg="#F9FAFB",
        ),

     
        rx.box(
               rx.hstack(
                    rx.foreach(
                    DynamicState.room_products,
                    lambda product: product_list([product])  
            ),    
               ),
            
            
        ),

        spacing="9",
        width="100%",
        height="100vh",
        padding_top="30px"
    )


def menu_item_style(active: bool = False):
        return {
            "padding": "12px 20px",
            "font_size": "15px",
            "color": "#22282C" if not active else "white",
            "background_color": "#22282C" if active else "transparent",
            "text_decoration": "none",
            "width": "280px",
          
            
        }

@rx.page(route="/rooms/[room]", on_load=DynamicState.on_load)
def room_page() -> rx.Component:
        return template(room_content)


    
