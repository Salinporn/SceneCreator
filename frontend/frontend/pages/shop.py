import reflex as rx 
from ..template import template 
from reflex.components.component import NoSSRComponent 
from ..components.product_card import product_list
from ..rooms_data import products
from typing import Any, Dict, List 
import urllib.parse 
#from ..state import State


def search_and_filters():
    return rx.hstack(
   
       rx.input(
                    rx.input.slot(rx.icon("search"),color="#22282C"),
                    placeholder="Search...",
                    type="search",
                    size="2",
                    justify="end",
                    background_color = "white",
                    border_radius = "20px",
                    color="#22282C",
                    border="1px solid #929FA7"
                ),


        rx.select(
            ["All Categories", "Chair", "Sofa", "Table", "Bed"],
            default_value="All Categories",
            width="160px",
            height="40px",
          
        ),
        rx.select(
            ["All Prices", "Low to High", "High to Low"],
            default_value="All Prices",
            width="160px",
            height="40px",
            
        ),
       
        rx.select(
            ["All Products", "Physical", "Digital"],
            default_value="All Products",
            width="160px",
            height="40px",
          
        ),
         rx.select(
            [ "Most Popular", "Newest"],
            default_value="Most Popular",
            width="160px",
            height="40px",
         
        ),
        spacing="2",
        justify="center",
        width="100%",
        margin_bottom = "1rem",
      
    )


@rx.event 
def go_to_demo(model:str): 
    #State.selected_model = model 
    return rx.redirect("/about")



def shop_content() -> rx.Component:


    return rx.vstack(
        rx.vstack(
            rx.heading("FURNITURE CATALOG", font_size="2em", font_weight="bold", color="#22282C",font_family="Poppins"),
            rx.text("Explore our full range of AR & VR-ready furniture models", font_size="1em", color="#22282C",font_family="Poppins"),
            text_align="center",
            margin_bottom="2rem",
        ),
        search_and_filters(),
        rx.hstack(
            product_list(products),
   
            spacing="6",
            justify="center",
        ),
      
        align="center",
        width="100%",
        height="100%",
        margin_top="50px",
    ) 

def shop_page() -> rx.Component:
    return template(shop_content)


filter_style = {
    "background_color": "white",
    "border": "1px solid #22282C",
    "border_radius":"12px"
}

