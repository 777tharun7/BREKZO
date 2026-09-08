import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [canteenId, setCanteenId] = useState(null);

  // Load cart from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('breakzo_cart');
    const savedCanteen = localStorage.getItem('breakzo_cart_canteen');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    if (savedCanteen) {
      setCanteenId(Number(savedCanteen));
    }
  }, []);

  // Save cart to local storage on change
  useEffect(() => {
    localStorage.setItem('breakzo_cart', JSON.stringify(cart));
    if (canteenId) {
      localStorage.setItem('breakzo_cart_canteen', canteenId);
    }
  }, [cart, canteenId]);

  const getCartItemId = (item) => {
    return `${item.id}-${JSON.stringify(item.customizations || {})}`;
  };

  const addToCart = (item, currentCanteenId) => {
    if (canteenId !== null && canteenId !== currentCanteenId && cart.length > 0) {
      toast.error('You can only order from one canteen at a time. Please clear your cart first.');
      return false;
    }

    if (canteenId === null) {
      setCanteenId(currentCanteenId);
    }

    const uniqueId = getCartItemId(item);

    setCart(prevCart => {
      const existing = prevCart.find(cartItem => cartItem.cartItemId === uniqueId);
      if (existing) {
        return prevCart.map(cartItem => 
          cartItem.cartItemId === uniqueId 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { ...item, cartItemId: uniqueId, quantity: 1 }];
    });
    
    toast.success(`${item.name} added to cart`);
    return true;
  };

  const removeFromCart = (uniqueId) => {
    setCart(prevCart => {
      const existing = prevCart.find(cartItem => cartItem.cartItemId === uniqueId);
      if (existing && existing.quantity > 1) {
        return prevCart.map(cartItem => 
          cartItem.cartItemId === uniqueId 
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      }
      const newCart = prevCart.filter(cartItem => cartItem.cartItemId !== uniqueId);
      if (newCart.length === 0) {
        setCanteenId(null);
      }
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    setCanteenId(null);
    localStorage.removeItem('breakzo_cart');
    localStorage.removeItem('breakzo_cart_canteen');
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      canteenId, 
      addToCart, 
      removeFromCart, 
      clearCart,
      cartTotal,
      cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};
