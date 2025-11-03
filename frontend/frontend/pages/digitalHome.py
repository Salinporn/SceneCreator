'''import reflex as rx
from ..template import template
from ..components.product_card import product_list

def room_content() -> rx.Component:

    products = [
        {
            "title": "Modern Stylish Mini Table",
            "category": "Tables",
            "physical_price": 1299,
            "digital_price": 99,
            "rating": 4.8,
            "model_url": "/models/antique_table.glb",
            "image": "/images/sofaPillow.png",
            "hover_image": "/images/room.jpg",
            "link": "/products/mini-table",
        },
        {
            "title": "Luxury Sofa",
            "category": "Sofas",
            "physical_price": 2999,
            "digital_price": 149,
            "rating": 4.7,
            "model_url": "/models/luxury_sofa.glb",
            "image": "/images/sofa.png",
            "hover_image": "/images/sofa_hover.png",
            "link": "/products/luxury-sofa",
        },
        {
            "title": "Wooden Chair",
            "category": "Chairs",
            "physical_price": 899,
            "digital_price": 59,
            "rating": 4.5,
            "model_url": "/models/wooden_chair.glb",
            "image": "/images/chair.png",
            "hover_image": "/images/chair_hover.png",
            "link": "/products/wooden-chair",
        },
    ]

    return rx.hstack(
      
        rx.box(
            rx.vstack(
            
                rx.center(
                    rx.image(
                    src="images/room.jpg",
                    width="95%",
                    height="auto",
               
            ),
                    style={"margin": " 20px 0px"},
                ),
                
                rx.center(
                    rx.text("Room Name", font_size="18px", font_weight="bold",color="#22282C"),
                    width="100%",
                ),
                
           
                rx.vstack(
                    rx.link("Personal Information", href="/profile", style=menu_item_style(active=True)),
                    rx.link("My Address", href="/address", style=menu_item_style()),
                    rx.link("Wishlist", href="/wishlist", style=menu_item_style()),
                    rx.link("My Orders", href="/orders", style=menu_item_style()),
                    rx.link("My Reviews", href="/reviews", style=menu_item_style()),
                    rx.link("Notification", href="/notification", style=menu_item_style()),
                    rx.link("Logout", href="/logout", style=menu_item_style()),
                    spacing="3",
                 
                ),
            ),
            width="280px",
            height="100%",
            bg="#F9FAFB",
         
        ),

        rx.box(
            product_list(products),
        ),

      
        spacing="9",
        width="100%",
        height="100vh",
        padding_top = "30px"
      
    )


def menu_item_style(active: bool = False):
    return {
        "padding": "12px",
        "font_size": "15px",
        "color": "#22282C" if not active else "white",
        "background_color": "#22282C" if active else "transparent",
        "text_decoration": "none",
        "width": "280px"
    }

def room_page() -> rx.Component:
    return template(room_content)


'''

