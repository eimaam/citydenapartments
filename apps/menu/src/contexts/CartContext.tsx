import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type {
  MenuItemResponse,
  MenuItemSize,
  SelectedOptionItem,
} from '@citydenapartments/shared';

export interface CartItem {
  id: string; // unique hash based on item + size + options
  menuItem: MenuItemResponse;
  selectedSize?: MenuItemSize;
  selectedOptions: SelectedOptionItem[];
  quantity: number;
  specialInstructions?: string;
  unitPrice: number;
  lineTotal: number;
}

export interface ActiveBranch {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
}

interface CartContextType {
  activeBranch: ActiveBranch | null;
  setActiveBranch: (branch: ActiveBranch) => void;
  items: CartItem[];
  addItem: (
    item: MenuItemResponse,
    quantity: number,
    selectedSize?: MenuItemSize,
    selectedOptions?: SelectedOptionItem[],
    specialInstructions?: string,
  ) => boolean;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  subtotal: number;
  totalItemsCount: number;
  getItemQuantityInCart: (menuItemId: string) => number;
}

const CartContext = createContext<CartContextType | null>(null);

function generateCartItemId(
  menuItemId: string,
  selectedSize?: MenuItemSize,
  selectedOptions: SelectedOptionItem[] = [],
): string {
  const sizeKey = selectedSize ? selectedSize.name : 'base';
  const optKey = selectedOptions
    .map((o) => `${o.groupName}:${o.optionName}`)
    .sort()
    .join('|');
  return `${menuItemId}_${sizeKey}_${optKey}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [activeBranch, setActiveBranchState] = useState<ActiveBranch | null>(() => {
    try {
      const saved = localStorage.getItem('cda_menu_active_branch');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cda_menu_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (activeBranch) {
      localStorage.setItem('cda_menu_active_branch', JSON.stringify(activeBranch));
    }
  }, [activeBranch]);

  useEffect(() => {
    localStorage.setItem('cda_menu_cart', JSON.stringify(items));
  }, [items]);

  const setActiveBranch = (branch: ActiveBranch) => {
    if (activeBranch && activeBranch._id !== branch._id && items.length > 0) {
      const confirmSwitch = window.confirm(
        `Switching to ${branch.name} will clear your current cart from ${activeBranch.name}. Do you want to proceed?`,
      );
      if (!confirmSwitch) return;
      setItems([]);
    }
    setActiveBranchState(branch);
  };

  const addItem = (
    item: MenuItemResponse,
    quantity: number,
    selectedSize?: MenuItemSize,
    selectedOptions: SelectedOptionItem[] = [],
    specialInstructions?: string,
  ): boolean => {
    if (!activeBranch) return false;

    // Calculate unit price
    let base = item.basePrice || 0;
    if (item.hasSizes && selectedSize) {
      base = selectedSize.price;
    }
    const extra = selectedOptions.reduce((sum, o) => sum + (o.extraPrice || 0), 0);
    const unitPrice = base + extra;
    const lineTotal = unitPrice * quantity;

    const cartItemId = generateCartItemId(item._id, selectedSize, selectedOptions);

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === cartItemId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + quantity;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          lineTotal: unitPrice * newQty,
          specialInstructions: specialInstructions || updated[existingIdx].specialInstructions,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: cartItemId,
          menuItem: item,
          selectedSize,
          selectedOptions,
          quantity,
          specialInstructions,
          unitPrice,
          lineTotal,
        },
      ];
    });

    return true;
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id !== id) return i;
          const newQty = i.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...i,
            quantity: newQty,
            lineTotal: i.unitPrice * newQty,
          };
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, i) => sum + i.lineTotal, 0);
  }, [items]);

  const totalItemsCount = useMemo(() => {
    return items.reduce((sum, i) => sum + i.quantity, 0);
  }, [items]);

  const getItemQuantityInCart = (menuItemId: string): number => {
    return items
      .filter((i) => i.menuItem._id === menuItemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        activeBranch,
        setActiveBranch,
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        subtotal,
        totalItemsCount,
        getItemQuantityInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
