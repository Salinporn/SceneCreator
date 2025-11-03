import reflex as rx
from typing import List, Dict

def hover_swap_photo(default_img: str, hover_img: str, link: str) -> rx.Component:
    return rx.box(
        rx.box(
            rx.image(
                src=default_img,
                width="100%",
                height="250px",
                border_radius="12px",
                object_fit="cover",
            ),
            rx.box(
                rx.image(
                    src=hover_img,
                    width="100%",
                    height="250px",
                    border_radius="12px",
                    object_fit="cover",
                ),
                rx.center(
                    rx.text(
                        "See Detail",
                        font_size="18px",
                        font_weight="bold",
                        color="white",
                        background_color="rgba(0,0,0,0.6)",
                        padding="6px 12px",
                        border_radius="8px",
                    ),
                    position="absolute",
                    top="50%",
                    left="50%",
                    transform="translate(-50%, -50%)",
                ),
                position="absolute",
                top="0",
                left="0",
                width="100%",
                height="100%",
                opacity="0",
                transition="opacity 0.3s ease",
                _hover={"opacity": "1"},
                z_index="2",
            ),
            position="relative",
            width="100%",
            overflow="hidden",
            cursor="pointer",
            on_click=rx.redirect(link),  
        ),
        style={
            "width": "100%",
            "height": "220px",
            "border_radius": "12px 12px 0 0",
            "margin_bottom": "40px",
        },
    )


def product_card(product: Dict) -> rx.Component:
    return rx.box(
        rx.vstack(
            hover_swap_photo(
                product.get("image", "/images/default.png"),
                product.get("hover_image", "/images/default_hover.png"),
                product.get("link", "/cart"),
            ),
            rx.vstack(
                rx.hstack(
                    rx.badge(product["category"], color_scheme="orange", border_radius="md"),
                    rx.spacer(),
                    rx.icon("star", color="gold"),
                    rx.text(product["rating"], font_weight="medium", color="#22282C"),
                    rx.icon("heart", color="black"),
                    align="center",
                    width="100%",
                ),
                rx.text(product["title"], font_weight="bold", font_size="1.1em", color="#22282C"),
                rx.hstack(
                    rx.text("Physical: ", font_weight="medium", color="#22282C"),
                    rx.text(f"${product['physical_price']}", font_weight="bold", color="#22282C"),
                    rx.spacer(),
                    rx.button(
                        rx.icon("shopping-cart"),
                        "Add",
                        color="#22282C",
                        border="1px solid #929FA7",
                        background_color="white",
                        border_radius="8px",
                    ),
                    width="100%",
                ),
                rx.hstack(
                    rx.text("Digital: ", font_weight="medium", color="#22282C"),
                    rx.text(f"${product['digital_price']}", font_weight="bold", color="#22282C"),
                    rx.spacer(),
                    rx.button(
                        rx.icon("zap"),
                        "Add",
                        color="#22282C",
                        border="1px solid #929FA7",
                        background_color="white",
                        border_radius="8px",
                    ),
                    width="100%",
                ),
                width="100%",
                align="start",
                padding="0px 20px",
            ),
            bg="white",
            border="1px solid #E2E8F0",
            border_radius="16px",
            width="300px",
            height="450px"
        )
    )


def product_list(products: list[dict]) -> rx.Component:
    return rx.hstack(
        rx.foreach(
            products,
            lambda p: product_card(p)
        ),
        spacing="6",
        justify="center",
        wrap="wrap",  # Changed from "nowrap" to "wrap" for better responsiveness
    )