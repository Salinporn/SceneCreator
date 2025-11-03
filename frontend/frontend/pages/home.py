import reflex as rx
from ..template import template
from reflex.components.component import NoSSRComponent
from ..components.product_card import product_list
from typing import Any, Dict, List
import urllib.parse
from typing import Optional
from reflex.event import Event
from ..rooms_data import rooms_data
from ..components.product_card import product_list
from ..state import DynamicState

def hover_photo(name: str, img: str, link: str) -> rx.Component:
    return rx.vstack(
        rx.link(
            rx.box(
                rx.image(
                    src=img,
                    width="100%",
                    height="250px",
                    object_fit="cover",
                ),
                rx.box(
                    rx.button(
                        name,
                        background_color="rgba(0,0,0,0.7)",
                        color="white",
                        padding="30px 10px",
                        cursor="pointer",
                        font_size="20px",
                        font_weight="bold",
                        font_family="Racing Sans One",
                    ),
                    position="absolute",
                    top="50%",
                    left="50%",
                    transform="translate(-50%, -50%)",
                    opacity="0",
                    transition="opacity 0.3s ease",
                    _hover={"opacity": "1"},
                ),
                position="relative",
                overflow="hidden",
                _hover={"cursor": "pointer"},
            ),
            href=link,
        ),
       rx.link(
            rx.text(
                name,
                font_size="16px",
                font_weight="bold",
                color="#22282C",
                text_align="center",
                margin_top="8px",
            ),
            href=link,
        ),
        spacing="2",
        align="center",
    )



def product_spot(x: str, y: str, name: str, price: str, url: str) -> rx.Component:
   
    return rx.box(
        rx.hover_card.root(
            rx.hover_card.trigger(
                rx.button(
                    "●",
                    size="2",
                    border_radius = "50px",
                    background_color= "rgba(0, 0, 0, 0.4)", 
                    color="white",
                    font_size="25px",
                    cursor="pointer",
                    padding="10px 5px",
                    border="1px solid grey",
                    _hover={
                        "transform": "scale(1.2)",      
                     
                    },
                ),
            ),
            rx.hover_card.content(
                rx.vstack(
                    rx.text(name, font_weight="bold", color="#22282c", font_size="12px"),
                    rx.text(price, color="black",font_size = "16px",font_weight="bold"),
                    rx.link("View >", href=url, color="#22282c",font_size = "12px"),
                ),
                side="right",
                style={"background": "white", "padding": "10px", "border_radius": "8px"},
            ),
        ),
        position="absolute",
        top=y,
        left=x,
    )

def testimonials_section():
    card_style = {
        "border_radius": "10px",
        "padding": "20px",
        "width": "300px",
        "min_height": "200px",
        "text_align": "center",
        "box_shadow": "0 4px 8px rgba(0, 0, 0, 0.1)"
    }

    reviews = [
        {"name": "Cyntra", "rating": 5, "text": "I absolutely love my new sofa! The color matches perfectly with my living room, and it’s even more comfortable than I expected. Delivery was quick and hassle-free", "bg": "#e0e5e8","color":"black"},
        {"name": "Pop", "rating": 5, "text": "I absolutely love my new sofa! The color matches perfectly with my living room, and it’s even more comfortable than I expected. Delivery was quick and hassle-free", "bg": "#212529", "color": "white"},
        {"name": "Mai", "rating": 5, "text": "I absolutely love my new sofa! The color matches perfectly with my living room, and it’s even more comfortable than I expected. Delivery was quick and hassle-free", "bg": "#e0e5e8","color":"black"},
    ]

    review_cards = []
    for review in reviews:
        review_cards.append(
            rx.vstack(
                rx.hstack(
                    *[rx.text("★", color="#FFA500") for _ in range(review["rating"])],
                    spacing="2"
                   
                ),
                rx.text(review["name"], font_weight="bold", font_size="1.1em",color=review.get("color", "black")),
                rx.text(review["text"], font_size="0.9em", color=review.get("color", "black")),
                bg=review["bg"],
                **card_style
            ),
            
        )

    return review_cards

def ikea_showcase_layout() -> rx.Component:
    """IKEA-style product showcase matching the reference image"""
    return rx.box(
        rx.hstack(
           
            rx.box(
                rx.image(
                    src="/images/room.jpg",
                    width="100%",
                    height="100%",
                    object_fit="cover",
                ),
            
                
                rx.box(
                    rx.hstack(
                        rx.vstack(
                            rx.text("MALM", font_weight="700", font_size="15px", color="#111"),
                            rx.text("Bed frame, high", font_size="12px", color="#484848"),
                            rx.hstack(
                                rx.text("7,290", font_weight="700", font_size="22px", color="#111"),
                                rx.text("THB", font_size="13px", color="#484848"),
                                spacing="1",
                                align_items="baseline",
                            ),
                            align_items="start",
                            spacing="0",
                        ),
                        rx.box(
                            rx.text("›", font_size="24px", color="#484848",on_click=rx.redirect("/product_detail")),
                            display="flex",
                            align_items="center",
                        ),
                        justify_content="space-between",
                        align_items="center",
                        width="100%",
                    ),
                    position="absolute",
                    top="39%",
                    left="30%",
                    bg="white",
                    padding="14px 16px",
                    box_shadow="0 2px 8px rgba(0,0,0,0.12)",
                    width="190px",
                    cursor="pointer",
                    transition="all 0.2s ease",
                    _hover={
                        "box_shadow": "0 4px 12px rgba(0,0,0,0.18)",
                        "transform": "translateY(-1px)",
                    },
                ),
                product_spot("20%", "80%", "Modern Sofa", "299 THB", "/product_detail"),
                
                position="relative",
                width="40%",
                height="810px",
                overflow="hidden",
            ),
           
            rx.vstack(
               
                rx.box(
                    rx.image(
                        src="/images/roomChair.png",
                        width="100%",
                        height="100%",
                        object_fit="cover",
                    ),
                    
                    product_spot("60%", "35%", "Modern Chair", "569 THB", "/product_detail"),
                
                    position="relative",
                    height="300px",
                    overflow="hidden",
                    flex="0 0 auto",
                ),
                
              
                rx.box(
                    rx.image(
                        src="/images/roomSofa.png",
                        width="100%",
                        height="100%",
                        object_fit="cover",
                    ),
                    product_spot("30%", "30%", "Bedside Table", "799 THB", "/product_detail"),
                    product_spot("60%", "70%", "Modern Sofa", "299 THB", "/product_detail"),
                    position="relative",
                    height="500px",
                    overflow="hidden",
                    flex="0 0 auto",
                ),
                width="30%",
                spacing="3",
                align_items="stretch",
                height="800px",
                justify_content="flex-start",
            ),

            rx.vstack(
    
                rx.box(
                    rx.image(
                        src="/images/roomWardrobe.png",
                        width="100%",
                        height="100%",
                        object_fit="cover",
                    ),
                    product_spot("48%", "30%", "Wooden Wardrobe", "1909 THB", "/product_detail"),
                    product_spot("70%", "80%", "Bedside Table", "249 THB", "/product_detail"),
                   
                    position="relative",
                    height="550px",
                    overflow="hidden",
                    flex="0 0 auto",
                ),
                
              
                rx.box(
                    rx.image(
                        src="/images/roomShelf.png",
                        width="100%",
                        height="100%",
                        object_fit="cover",
                    ),
                    product_spot("40%", "25%", "Book Shelf", "799 THB", "/product_detail"),
                    position="relative",
                    height="250px",
                    overflow="hidden",
                    flex="0 0 auto",
                ),
                width="30%",
                spacing="3",
                align_items="stretch",
                height="800px",
                justify_content="flex-start",
            ),
            
            width="100%",
            spacing="3",
            align_items="stretch",
            padding="10px 0",
        ),
        width="100%",
        margin_bottom="50px",
    )


'''
rx.box(
        
       rx.hstack(

        rx.box(
            rx.image(
                src="/images/room.jpg",
                width="100%",
                height="610px",
            ),
            product_spot("14%", "40%", "Wardrobe", "299 THB", "/cart"),
            product_spot("70%", "60%", "Bedside Table", "1,290 THB", "/cart"),
            product_spot("88%", "30%", "Shelf", "1,290 THB", "/products/cart"),
            product_spot("50%", "70%", "Bed", "1,290 THB", "/products/cart"),
            product_spot("90%", "60%", "Modern Chair", "1,290 THB", "/cart"),
            position="relative",
            width="85%",    
        ),

        rx.vstack(
            rx.image(src="/images/room.jpg", width="100%", height="auto",max_height="200px",object_fit="cover"),
            rx.image(src="/images/room.jpg", width="100%", height="auto",max_height="200px",object_fit="cover"),
            rx.image(src="/images/room.jpg", width="100%", height="auto",max_height="200px",object_fit="cover"),
            width="30%",    
            spacing="1",
            align_items = "stretch",
        ),

        width="100%",
        align_items="start",
        spacing="2",
        margin_bottom="50px",
        
    )'''


def home_content() -> rx.Component:

    return rx.box(
    
    ikea_showcase_layout(), 

    rx.center(
        rx.text("Design your Space",font_size = "2rem", font_weight="bold",color="#22282c",font_family="Racing Sans One",text_align="center"),
    ),
    rx.center(
         rx.text("Whether it’s your living room, bedroom, or office, we’ve got the perfect pieces to match your style.",font_size = "16px", color="#22282c",margin_bottom="50px"),
    ),
    rx.vstack(
        
        rx.hstack(
        
            rx.vstack(
                hover_photo("Bedroom", "/images/bedroom.jpg", "/rooms/bedroom"),
        
            ),

            rx.vstack(
                hover_photo("Office Room", "/images/officeroom.jpg", "/rooms/officeroom"),
        
            ),
            
            rx.vstack(
                hover_photo("Living Room", "/images/livingroom.jpg", "/rooms/livingroom"),
                
            ),
            rx.vstack(
                hover_photo("Kitchen", "/images/kitchenroom.jpg", "/rooms/kitchen"),
        
            ),
          
        
            ),
              rx.center(
                 rx.button(
                "Load More Rooms", style = load_button
            ),
           
            width="100%",
            justify="between",
            margin_bottom="50px",
            align_item = "center"
            
        ),
    
    ),
   
    rx.hstack(
        rx.vstack(
            rx.text("UNIQUE & STYLISH COLLECTIONS",font_size="14px"),
            rx.hstack(
                rx.text(
                "Create Your",
                font_size="2rem",
                font_family="Racing Sans One",
                font_weight="bold",
                line_height="1.5",
            ),
                rx.text("Interior",font_size="2rem",font_family="Praise",font_weight="bold",font_style="italic"),
            ),
            rx.text("that Inspire everyday",font_size="1.5rem"),
            rx.text("Explore your dream furniture in stunning 3D AR/VR and see exactly how it fits your space before you buy",margin_bottom="2rem",font_size="14px"),
            rx.button("Explore More",style=button_style, ),
            color="#22282C",
            width="50%",    
        ),
        rx.box(
            rx.video(
                url="/videos/demo.mp4",
                controls=True,
                auto_play=True,
                loop=True,
                muted=False,
                width="100%",
                height="300px",
                border_radius="10px",
               
            ),
            width="50%",
            float="right",
           
        ),
        align_items="flex-start",
        width="100%", 
        margin_bottom="50px"
   
    ),

    rx.center(
        rx.text("Top Collections",font_size = "2rem", font_weight="bold",color="#22282c",font_family="Racing Sans One",text_align="center"),
    ),
    rx.center(
        rx.text("Our best furniture and decor picked just for you. Stylish, comfy, and high quality.",font_size = "16px", color="#22282c",margin_bottom="50px"),
    ),

    rx.box(
        rx.hstack(
            rx.foreach(
            DynamicState.room_products,
            lambda product: product_list([product]),
                    
            ),    
            justify="center",   
            align="center",    
            width="100%",      
            spacing="2",

            ),    
            
        ),
    
   
    rx.hstack(
            rx.vstack(
                rx.image(src="/images/high_quality.png", width="60px", height="60px",style=icon_style),
                rx.text("High Quality", font_size="16px", font_weight="bold",color="#22282C"),
                rx.text("Startup interaction design sales", font_size="16px", color="#22282C",text_align="center"),
                spacing="2",
                align="center",
                width="25%",
            ),
            rx.vstack(
                rx.image(src="/images/location.png", width="60px", height="60px",style=icon_style),
                rx.text("Fast Delivery", font_size="16px", font_weight="bold",color="#22282C"),
                rx.text("Startup interaction design sales", font_size="16px", color="#22282C",text_align="center"),
                spacing="2",
                align="center",
                width="25%",
            ),
            rx.vstack(
                rx.image(src="/images/3D.png", width="60px", height="60px",style=icon_style),
                rx.text("AR/VR Preview", font_size="16px", font_weight="bold",color="#22282C"),
                rx.text("Startup interaction design sales", font_size="16px", color="#22282C",text_align="center"),
                spacing="2",
                align="center",
                width="25%",
            ),
            rx.vstack(
                rx.image(src="/images/service.png", width="60px", height="60px",style=icon_style),
                rx.text("24Hour Service", font_size="16px", font_weight="bold",color="#22282C"),
                rx.text("Startup interaction design sales", font_size="16px", color="#22282C",text_align="center"),
                spacing="2",
                align="center",
                width="25%",
            ),
            margin_bottom = "3rem",
            justify="center",
            align="center",
            padding="40px",
            spacing="6",
            width="100%",
            style={
            "background": "linear-gradient(to bottom, white 30%, #929FA7 10%)"
        }
        ),

    rx.hstack(
        rx.vstack(
            rx.text("Up To"),
            rx.text(
                "50% OFF",
                font_size="2.5rem",
                font_family="Racing Sans One",
                font_weight="bold",
                font_style="italic",
                line_height="1.5",
            ),
            rx.text("Discover the perfect sofa for your home and enjoy amazing savings while this promotion lasts.",margin_bottom="2rem"),
            rx.button("Shop Now",style=button_style, ),
            color="#22282C",
            width="40%",    
        ),
        rx.box(           
            rx.image(
                src="/images/sofa_grey.jpg",
                alt="Home Image",    border_radius="10px",
            ),
            width="60%",   
            float="right",   
         
        ),
        margin_bottom="1rem",
   
    ),

    
        rx.hstack(
            rx.button("←", bg="#212529", color="white", border_radius="50%",width="40px",height="40px"),
            rx.hstack(
                *testimonials_section(),   
                align="center",
                justify="center"
            ),
            rx.button("→", bg="#212529", color="white", border_radius="50%",width="40px",height="40px"),
            width="100%",
            justify="center",
            align = "center",
            padding="40px",
),
    
    height="100%",
)


def home_page() -> rx.Component:
    return template(home_content)


button_style = {
    "background_color": "#22282C",
    "color": "white",
    "font_size": "16px",
    "padding": "20px 30px",
    "cursor": "pointer",
    "font_weight": "bold",
    "border_radius": "8px",
    "_hover": {
        "background_color": "white",
        "color": "#22282C",
        "border": "1px solid #929FA7"
    }
}

icon_style = {
    "background_color":"white", 
    "border_radius":"100px", 
    "padding":"8px",

}

load_button = {
   "background_color": "white",
    "border": "1px solid #929FA7",
    "color": "#22282c",
    "font_size": "12px",
    "padding": "20px 30px",
    "cursor": "pointer",
    "font_weight": "bold",
    "border_radius": "20px",
    "margin_top": "20px",
    "_hover": {
        "background_color": "#22282c",
        "color": "white",
       
    } 
}