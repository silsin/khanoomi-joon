"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  weight: number;
  karat: number;
  image: string;
  quantity: number;
  stock: number;
  /** Weight variant picked on the product page (products with weight choices). */
  variantWeight?: number;
  /** Free gift options picked on the product page. */
  giftPack?: string;
  postcard?: string;
}

/**
 * Stable key for a cart line: the product plus its chosen weight. Two weights of
 * the same product are two separate lines; products without variants key by id
 * alone (unchanged behaviour).
 */
export function cartLineKey(item: Pick<CartItem, "productId" | "variantWeight">): string {
  return item.variantWeight ? `${item.productId}::${item.variantWeight}` : item.productId;
}

interface CartContextType {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "quantity">) => void;
  /** key = cartLineKey(item) */
  remove: (key: string) => void;
  /** key = cartLineKey(item) */
  update: (key: string, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextType>({
  items: [], count: 0, total: 0,
  add: () => {}, remove: () => {}, update: () => {}, clear: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dg_cart");
      if (saved) setItems(JSON.parse(saved));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("dg_cart", JSON.stringify(items));
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "quantity">) => {
    const key = cartLineKey(item);
    setItems(prev => {
      const existing = prev.find(i => cartLineKey(i) === key);
      if (existing) {
        return prev.map(i =>
          cartLineKey(i) === key
            ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const remove = useCallback((key: string) => {
    setItems(prev => prev.filter(i => cartLineKey(i) !== key));
  }, []);

  const update = useCallback((key: string, quantity: number) => {
    if (quantity < 1) {
      setItems(prev => prev.filter(i => cartLineKey(i) !== key));
    } else {
      setItems(prev =>
        prev.map(i =>
          cartLineKey(i) === key
            ? { ...i, quantity: Math.min(quantity, i.stock) }
            : i
        )
      );
    }
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, count, total, add, remove, update, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
