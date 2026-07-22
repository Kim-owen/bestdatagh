import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Network = "MTN" | "Telecel" | "AirtelTigo";

export type CartItem = {
  id: string; // network + size
  network: Network;
  size: string;
  price: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  toast: string | null;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  showToast: (msg: string) => void;
};

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "bestdata_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, hydrated]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const addItem: CartState["addItem"] = useCallback((item, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + qty } : p));
      return [...prev, { ...item, qty }];
    });
    showToast(`${item.size} ${item.network} added to cart`);
  }, [showToast]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, qty: Math.max(1, qty) } : p)));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartState>(() => {
    const count = items.reduce((a, b) => a + b.qty, 0);
    const subtotal = items.reduce((a, b) => a + b.price * b.qty, 0);
    return { items, count, subtotal, isOpen, toast, addItem, removeItem, setQty, clear, open, close, showToast };
  }, [items, isOpen, toast, addItem, removeItem, setQty, clear, open, close, showToast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const NOOP_CART: CartState = {
  items: [],
  count: 0,
  subtotal: 0,
  isOpen: false,
  toast: null,
  addItem: () => {},
  removeItem: () => {},
  setQty: () => {},
  clear: () => {},
  open: () => {},
  close: () => {},
  showToast: () => {},
};

export function useCart() {
  const ctx = useContext(CartContext);
  return ctx ?? NOOP_CART;
}
