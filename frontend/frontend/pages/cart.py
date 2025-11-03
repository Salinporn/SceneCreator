import reflex as rx
from typing import List
from ..template import template

class CartItem(rx.Base):
   
    id: int
    name: str
    price: int
    quantity: int
    colors: List[str]
    image: str

class CartState(rx.State):

    
    cart_items: List[CartItem] = [
        {
            "id": 1,
            "name": "Modern Sectional Sofa",
            "price": 100,
            "quantity": 1,
            "colors": ["#C0C0C0", "#F5F5DC", "#D2B48C"],
            "image": "/images/bedsidetable.jpg",
        },
        {
            "id": 2,
            "name": "Modern Sectional Sofa",
            "price": 100,
            "quantity": 1,
            "colors": ["#C0C0C0", "#F5F5DC", "#D2B48C"],
            "image": "/images/puff.jpg",
        },
        {
            "id": 3,
            "name": "Modern Sectional Sofa",
            "price": 100,
            "quantity": 1,
            "colors": ["#C0C0C0", "#F5F5DC", "#D2B48C"],
            "image": "/images/sofa_grey.jpg",
        },
        {
            "id": 4,
            "name": "Modern Sectional Sofa",
            "price": 100,
            "quantity": 1,
            "colors": ["#C0C0C0", "#F5F5DC", "#D2B48C"],
            "image": "/images/modernChair.jpg",
        },
        {
            "id": 5,
            "name": "Modern Sectional Sofa",
            "price": 100,
            "quantity": 1,
            "colors": ["#C0C0C0", "#F5F5DC", "#D2B48C"],
            "image": "/placeholder.jpg",
        },
    ]
    
    promo_code: str = ""
    delivery_fee: int = 50
    discount: int = 50
    selected_payment: str = ""
    
    @rx.var
    def subtotal(self) -> int:
        return sum(item["price"] * item["quantity"] for item in self.cart_items)
    
    @rx.var
    def total(self) -> int:
        return self.subtotal + self.delivery_fee - self.discount
    
    def increment_quantity(self, item_id: int):
        for i, item in enumerate(self.cart_items):
            if item["id"] == item_id:
                self.cart_items[i]["quantity"] += 1
                break
    
    def decrement_quantity(self, item_id: int):
        for i, item in enumerate(self.cart_items):
            if item["id"] == item_id and item["quantity"] > 1:
                self.cart_items[i]["quantity"] -= 1
                break
    
    def remove_item(self, item_id: int):
        self.cart_items = [item for item in self.cart_items if item["id"] != item_id]
    
    def remove_all(self):
        self.cart_items = []
    
    def apply_promo(self):
       
        pass
    
    def place_order(self):
     
        pass


def cart_item(item: CartItem) -> rx.Component:
  
    return rx.box(
        rx.hstack(
          
            rx.checkbox(size="2"),
            
       
            rx.box(
                rx.image(
                    src=item["image"],
                    width="120px",
                    height="120px",
                    object_fit="cover",
                    border_radius="8px",
                    bg="gray.100",
                ),
            ),
            
         
            rx.vstack(
                rx.hstack(
                    rx.text(
                        item["name"],
                        font_size="18px",
                        font_weight="600",
                        color="#22282c"
                    ),
                    rx.badge("physical", color_scheme="orange", variant="soft"),
                    spacing="2",
                    align="center",
                ),
                rx.hstack(
                    rx.text("Colors:", font_size="14px",color="#22282c"),
                    rx.foreach(
                        item["colors"],
                        lambda color: rx.box(
                            width="16px",
                            height="16px",
                            border_radius="50%",
                            bg=color,
                            border="1px solid #e2e8f0",
                        )
                    ),
                    spacing="2",
                ),
                rx.text(
                    f"Price: ${item['price']} / pre item",
                    color="#22282c",
                    font_size="14px",
                ),
                rx.hstack(
                    rx.button(
                        "−",
                        on_click=lambda: CartState.decrement_quantity(item["id"]),
                        variant="outline",
                        size="1",
                        border_radius="md",
                    ),
                    rx.text(item["quantity"], font_weight="600",color="#22282c", min_width="30px", text_align="center"),
                    rx.button(
                        "+",
                        on_click=lambda: CartState.increment_quantity(item["id"]),
                        variant="outline",
                        size="1",
                        border_radius="md",
                    ),
                    spacing="2",
                ),
                spacing="2",
                align_items="start",
                flex="1",
            ),
            
           
            rx.vstack(
                rx.button(
                    rx.icon("trash-2", size=18),
                    on_click=lambda: CartState.remove_item(item["id"]),
                    variant="ghost",
                    color_scheme="red",
                ),
                rx.text(
                    f"$ {item['price'] * item['quantity']}",
                    font_size="20px",
                    font_weight="700",
                    color="#22282c"
                ),
                spacing="4",
                align_items="end",
            ),
            
            spacing="4",
            align="start",
            width="100%",
        ),
        padding="20px",
        border="1px solid #e2e8f0",
        border_radius="12px",
        bg="white",
        width="100%",
    )


def order_summary() -> rx.Component:
  
    return rx.box(
        rx.vstack(
            rx.heading("Order Summary", size="7", margin_bottom="20px",color="#22282c",),
            
           
            rx.hstack(
                rx.text("Subtotal", font_size="18px",color="#22282c",),
                rx.spacer(),
                rx.text(f"$ {CartState.subtotal}", font_size="18px", font_weight="600",color="#22282c",),
                width="100%",
            ),
            
   
            rx.hstack(
                rx.text("Delivery", font_size="18px",color="#22282c",),
                rx.spacer(),
                rx.text(f"$ {CartState.delivery_fee}", font_size="18px", font_weight="600",color="#22282c"),
                width="100%",
            ),
            
       
            rx.hstack(
                rx.text("Discount", font_size="18px",color="#22282c",),
                rx.spacer(),
                rx.text(f"-$ {CartState.discount}", font_size="18px", font_weight="600",color="#22282c",),
                width="100%",
            ),
            
          
            rx.hstack(
                rx.text("Promo Code", font_size="18px",color="#22282c",),
                rx.spacer(),
                rx.input(
                    placeholder="",
                    value=CartState.promo_code,
                    on_change=CartState.set_promo_code,
                    width="200px",
                    border_radius="8px",
                ),
                rx.button(
                    "Apply",
                    on_click=CartState.apply_promo,
                    bg="#22282c",
                    font_weight = "bold",
                    cursor = "pointer",
                    color="white",
                    border_radius="8px",
                    padding="8px 24px",
                     _hover={
                    "color": "#22282c",
                    "border": "1px solid #22282c",
                    "background_color": "white"
                }
                ),
                width="100%",
                spacing="2",
            ),
            
            rx.divider(margin_y="20px"),
            
        
            rx.hstack(
                rx.text("Total", font_size="24px", font_weight="700",color="#22282c",),
                rx.spacer(),
                rx.text(f"$ {CartState.total}", font_size="24px", font_weight="700",color="#22282c",),
                width="100%",
            ),
            
          
            rx.button(
                "Place Order",
                on_click=CartState.place_order,
                bg="#22282c",
                color="white",
                width="100%",
                padding="25px",
                border_radius="12px",
                font_size="16px",
                font_weight="bold",
                margin_top="20px",
                cursor = "pointer",
                _hover={
                    "color": "#22282c",
                    "border": "1px solid #22282c",
                    "background_color": "white"
                }
            ),
            
            spacing="4",
            
        ),
        padding="30px",
        border="1px solid #e2e8f0",
        border_radius="12px",
        bg="white",
        width="100%",
    )


def shipping_address() -> rx.Component:
   
    return rx.box(
        rx.vstack(
            rx.heading("Shipping Address", size="6", margin_bottom="20px",color="#22282c",),
            
            rx.hstack(
                rx.text("John Smith", font_size="18px", font_weight="600",color="#22282c",),
                rx.spacer(),
                rx.text("(+66) 256789076", font_size="16px", color="#22282c",),
                width="100%",
            ),
            
            rx.text(
                "3 Thanon Chalone Krun, Khwaeng lam Prathew Lam Pla Thio, Latkrabang, Bangkok, 10520",
                font_size="14px",
                color="#22282c",
                margin_top="8px",
            ),
            
            rx.link(
                "See all Delivery Addresses",
                href="/addresses",        # ⬅️ route or URL you want to open
                color="#929FA7",
                text_decoration="underline",
                margin_top="12px",
            ),
            
            spacing="2",
            align_items="start",
            width="100%",
        ),
        padding="30px",
        border="1px solid #e2e8f0",
        border_radius="12px",
        bg="white",
        margin_top="20px",
    )


def payment_method() -> rx.Component:
   
    return rx.box(
        rx.vstack(
            rx.heading("Select Payment Method", size="6", margin_bottom="20px", text_align="center",color="#22282c",),
            
            rx.hstack(
              
                rx.button(
                    rx.hstack(
                        rx.icon("qr-code", size=24),
                        rx.vstack(
                            rx.text("QR Prompt Pay", font_weight="600"),
                            rx.text("Scan QR code to pay", font_size="12px", color="gray.500"),
                            spacing="0",
                            align_items="start",
                        ),
                        spacing="3",
                    ),
                    variant="outline",
                    color="#22282c",
                    width="22%",
                    padding="30px",
                    border_radius="12px",
                    justify_content="start",
                ),             
            
                rx.button(
                    rx.hstack(
                        rx.icon("credit-card", size=24),
                        rx.vstack(
                            rx.text("4734 22** **** 5678", font_weight="600"),
                            rx.text("Credit/Debit Card", font_size="12px", color="gray.500"),
                            spacing="0",
                            align_items="start",
                        ),
                        spacing="3",
                    ),
                    variant="outline",
                    color="#22282c",
                    width="22%",
                    padding="30px",
                    border_radius="12px",
                    justify_content="start",
                ),
                
            
                rx.button(
                    rx.hstack(
                        rx.icon("wallet", size=24),
                        rx.vstack(
                            rx.text("TrueMoney", font_weight="600"),
                            rx.text("Secured & effortless payment", font_size="12px", color="gray.500"),
                            spacing="0",
                            align_items="start",
                        ),
                        spacing="3",
                    ),
                    variant="outline",
                    color="#22282c",
                    width="22%",
                    padding="30px",
                    border_radius="12px",
                    justify_content="start",
                ),
                   rx.select(
                ["Krungthai", "SCB", "Bangkok Bank"],
                default_value="Krungthai",
                width="22%",
              
            
            ),
                
                spacing="3",
                width="100%",
                justify="between",
               
            ),
            
            rx.link(
                "See all Payment Method",
                href="/addresses",        # ⬅️ route or URL you want to open
                color="#929FA7",
                text_decoration="underline",
                margin_top="12px",
              
            ),
            
            spacing="3",
           
        ),
        padding="30px",
        margin_top="30px",
        width="100%",
         border="1px solid #e2e8f0",
        border_radius="16px"
    )


def cart_content() -> rx.Component:
    return rx.hstack(
        rx.vstack(
            rx.heading(
                "YOUR CART",
                text_align="center",
                margin_bottom="30px",
                font_size="32px",
                color="#22282c",
                font_family="Poppins"
            ),
            
            rx.box(
                rx.hstack(
                    rx.vstack(
                        rx.box(
                            rx.vstack(
                                rx.foreach(
                                    CartState.cart_items,
                                    cart_item,
                                ),
                                spacing="4",
                                width="100%",
                            ),
                            max_height="700px",  # Approximately height for 5 items
                            overflow_y="auto",
                            padding_right="10px",
                            width="100%",
                        ),
                         rx.link(
                            "Remove all from cart",
                            href="/",        # ⬅️ route or URL you want to open
                            color="#929FA7",
                            text_decoration="underline",
                            margin_top="12px",
                        ),
                        spacing="4",
                        align_items="start",
                        width="55%"
                    ),
                    
                    rx.vstack(
                        order_summary(),
                        shipping_address(),
                        spacing="4",
                        align_items="start",
                        width="45%"
                    ),
                    
                    spacing="6",
                    align="start",
                    width="100%",
                    justify="center",   
                ),
                padding="30px",
                border_radius="12px",
                width="100%",          
                margin_x="auto",     
            ),
            
            payment_method(),
            
            spacing="5",
            width="100%",
            padding_y="40px",
            align_items="center",
        ),
        
        min_height="100vh",
        width="100%",
        justify="center",
        align="center",
    )


def cart_page() -> rx.Component:
    return template(cart_content)