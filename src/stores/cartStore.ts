import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  taxRate: number;
  taxIncluded: boolean;
  discountPercent: number;
  unit: string;
  trackStock: boolean;
  availableStock: number;
}

interface CartStore {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  globalDiscountPercent: number;
  shippingAmount: number;
  addItem: (item: Omit<CartItem, 'quantity' | 'discountPercent'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, percent: number) => void;
  setCustomer: (id: string | null, name: string | null) => void;
  setGlobalDiscount: (percent: number) => void;
  setShipping: (amount: number) => void;
  clear: () => void;
  subtotal: () => number;
  taxAmount: () => number;
  discountAmount: () => number;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customerId: null,
  customerName: null,
  globalDiscountPercent: 0,
  shippingAmount: 0,

  addItem: (item) => {
    const items = get().items;
    const existingItem = items.find((i) => i.productId === item.productId);

    if (existingItem) {
      set({
        items: items.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({
        items: [...items, { ...item, quantity: 1, discountPercent: 0 }],
      });
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.productId !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set({
      items: get().items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      ),
    });
  },

  updateDiscount: (productId, percent) => {
    set({
      items: get().items.map((i) =>
        i.productId === productId ? { ...i, discountPercent: percent } : i
      ),
    });
  },

  setCustomer: (id, name) => {
    set({ customerId: id, customerName: name });
  },

  setGlobalDiscount: (percent) => {
    set({ globalDiscountPercent: percent });
  },

  setShipping: (amount) => {
    set({ shippingAmount: amount });
  },

  clear: () => {
    set({
      items: [],
      customerId: null,
      customerName: null,
      globalDiscountPercent: 0,
      shippingAmount: 0,
    });
  },

  subtotal: () => {
    const items = get().items;
    return items.reduce((sum, item) => {
      let itemPrice = item.price * item.quantity;

      if (item.taxIncluded) {
        itemPrice = itemPrice / (1 + item.taxRate);
      }

      if (item.discountPercent > 0) {
        itemPrice = itemPrice * (1 - item.discountPercent / 100);
      }

      return sum + itemPrice;
    }, 0);
  },

  taxAmount: () => {
    const items = get().items;
    return items.reduce((sum, item) => {
      let itemPrice = item.price * item.quantity;

      if (item.discountPercent > 0) {
        itemPrice = itemPrice * (1 - item.discountPercent / 100);
      }

      let itemSubtotal = itemPrice;
      if (item.taxIncluded) {
        itemSubtotal = itemPrice / (1 + item.taxRate);
      }

      const itemTax = itemSubtotal * item.taxRate;
      return sum + itemTax;
    }, 0);
  },

  discountAmount: () => {
    const items = get().items;
    const itemDiscounts = items.reduce((sum, item) => {
      if (item.discountPercent > 0) {
        const itemTotal = item.price * item.quantity;
        const discount = itemTotal * (item.discountPercent / 100);
        return sum + discount;
      }
      return sum;
    }, 0);

    const globalDiscount = get().globalDiscountPercent;
    if (globalDiscount > 0) {
      const beforeGlobalDiscount = get().subtotal() + get().taxAmount();
      return itemDiscounts + (beforeGlobalDiscount * (globalDiscount / 100));
    }

    return itemDiscounts;
  },

  total: () => {
    const subtotal = get().subtotal();
    const tax = get().taxAmount();
    const globalDiscount = get().globalDiscountPercent;
    const shipping = get().shippingAmount;

    let total = subtotal + tax;

    if (globalDiscount > 0) {
      total = total * (1 - globalDiscount / 100);
    }

    return total + shipping;
  },

  itemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
