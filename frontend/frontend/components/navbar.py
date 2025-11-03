import reflex as rx
import httpx
import os
from ..state import AuthState


def nav_link(label: str, href: str):
    return rx.link(
        label,
        href=href,
        style={
            "font_family": "Lato, sans-serif",
            "font_size": "16px",
            "color": "#22282C",
            "display": "inline-block",
            "text_decoration": "none",
        },
    )


def navbar_page():
    return rx.hstack(
     
        rx.hstack(
            nav_link("Digital Home", "/"),
            nav_link("Shop", "/shop"),
            # nav_link("My Home", "/my_home"),
            rx.cond(
                AuthState.is_logged_in,
                rx.button(
                    rx.hstack(
                        rx.text("My Home"),
                        spacing="2",
                    ),
                    variant="ghost",
                    style={
                        "color": "#22282C",
                        "font_family": "Lato, sans-serif",
                        "font_size": "16px",
                        "_hover": {
                            "cursor": "pointer",
                            "color": "#E0E6EA",
                            "background_color": "transparent"
                        },
                    },
                    on_click=AuthState.open_scene_creator,
                ),
                rx.fragment(),  # HIDDEN if not logged in
            ),
            # nav_link("About", "/about"),
            spacing="6",
        ),
        
        rx.spacer(),
        
   
        rx.hstack(
          
            rx.input(
                rx.input.slot(rx.icon("search"), color="#807E80"),
                placeholder="Search...",
                type="search",
                size="2",
                width="400px",
                justify="end",
                background_color="#E0E6EA",
                border_radius="20px",
                color="#22282C",
            ),
          
            rx.button(
                rx.icon("shopping-cart"),
                aria_label="Cart",
                variant="ghost",
                style=icon_style,
                on_click=rx.redirect("/cart")
            ),
            
            rx.cond(
                AuthState.is_logged_in,
         
                rx.menu.root(
                    rx.menu.trigger(
                        rx.button(
                            rx.hstack(
                                rx.icon("user", size=20),
                                rx.text(AuthState.username, weight="medium"),
                                spacing="2",
                            ),
                            variant="ghost",
                            style={
                                "color": "#22282C",
                                "padding": "8px 16px",
                                "border_radius": "8px",
                                "_hover": {
                                    "background_color": "#F3F4F6",
                                },
                            },
                        ),
                    ),
                    rx.menu.content(
                        rx.menu.item(
                            rx.hstack(
                                rx.icon("user", size=16),
                                rx.text("Profile"),
                                spacing="2",
                            ),
                            on_click=rx.redirect("/profile"),
                        ),
                        rx.menu.separator(),
                        rx.menu.item(
                            rx.hstack(
                                rx.icon("log-out", size=16),
                                rx.text("Logout"),
                                spacing="2",
                            ),
                            on_click=AuthState.logout,
                            color="red",
                        ),
                    ),
                ),
            
                rx.button(
                    "Sign Up",
                    color="white",
                    background_color="#22282C",
                    border_radius="8px",
                    _hover={
                        "background_color": "#3A4248",
                    },
                    on_click=rx.redirect("/login")
                ),
            ),
            
            spacing="4",
        ),
        
        style=style3,
        on_mount=AuthState.check_auth, 
    )


style1 = {
    "font_family": "Lato, sans-serif",
    "font_size": "16px",
    "color": "#22282C",
    "font_weight": "bold",
}

style3 = {
    "justify_content": "space-between",
    "align_items": "center",
    "border_bottom": "1px solid #E0E6EA",
    "box_shadow": "0 1px 2px rgba(0, 0, 0, 0.1)",
    "width": "100%",
    "padding": "20px 30px",
    "position": "fixed",
    "top": "0",
    "left": "0",
    "z_index": "1000",
    "background_color": "white"
}

icon_style = {
    "color": "#22282C",
    "width": "40px",
    "height": "40px",
}