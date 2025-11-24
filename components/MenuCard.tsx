'use client';

import { Menu } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

interface MenuCardProps {
  menu: Menu;
  kantinId?: string;
  onAddToCart?: () => void;
}

export default function MenuCard({ menu, kantinId, onAddToCart }: MenuCardProps) {
  // Initialize quantity from cart if item already exists
  const getInitialQuantity = () => {
    const cart = storage.cart.get();
    const existingItem = cart[menu.id];
    return existingItem ? existingItem.quantity : 1;
  };

  const [quantity, setQuantity] = useState(getInitialQuantity);

  // Check if menu is unavailable or out of stock
  // quantity === 0 means out of stock
  // quantity === undefined means no stock tracking (unlimited)
  // quantity < 1 means out of stock
  const isUnavailable = !menu.available || menu.quantity === 0 || (menu.quantity !== undefined && menu.quantity < 1);
  const statusLabel = !menu.available ? 'Tidak Tersedia' : 'Habis';
  
  // Debug log
  if (menu.quantity === 0 || (!menu.available && menu.quantity !== undefined)) {
    console.log(`MenuCard "${menu.name}": quantity=${menu.quantity}, available=${menu.available}, isUnavailable=${isUnavailable}`);
  }

  const handleAddToCart = () => {
    if (isUnavailable) return;
    
    // Use the current quantity (not increment)
    // Cart will be updated by updateCartQuantity which is called in handleQuantityChange
    // But we still need to ensure it's saved here
    updateCartQuantity(quantity);
  };

  // Get current cart quantity for this menu
  const getCartQuantity = () => {
    const cart = storage.cart.get();
    const existingItem = cart[menu.id];
    return existingItem ? existingItem.quantity : 0;
  };

  // Calculate max quantity considering stock and current cart quantity
  const maxQuantity = menu.quantity !== undefined ? menu.quantity : undefined;
  const cartQuantity = getCartQuantity();
  // Max quantity = stock - (current cart quantity - current MenuCard quantity)
  // This ensures total (cart + MenuCard) doesn't exceed stock
  const availableStock = maxQuantity !== undefined 
    ? maxQuantity - (cartQuantity - quantity)
    : undefined;

  const handleQuantityChange = (newQuantity: number) => {
    if (isUnavailable) return;
    
    const finalQuantity = Math.max(1, newQuantity);
    
    // Check if exceeds available stock
    if (availableStock !== undefined && finalQuantity > availableStock) {
      setQuantity(availableStock);
      // Update cart immediately when quantity changes
      updateCartQuantity(availableStock);
      return;
    }
    
    setQuantity(finalQuantity);
    // Update cart immediately when quantity changes
    updateCartQuantity(finalQuantity);
  };

  // Update cart quantity when MenuCard quantity changes
  const updateCartQuantity = (newQuantity: number) => {
    if (isUnavailable || newQuantity < 1) return;
    
    const cart = storage.cart.get();
    
    if (newQuantity === 0) {
      // Remove from cart if quantity is 0
      delete cart[menu.id];
    } else {
      cart[menu.id] = {
        menuId: menu.id,
        menuName: menu.name,
        quantity: newQuantity,
        price: menu.price,
      };
    }
    
    storage.cart.save(cart);
    if (onAddToCart) onAddToCart();
  };

  // Sync quantity with cart when menu.id changes or when component mounts
  useEffect(() => {
    const cart = storage.cart.get();
    const existingItem = cart[menu.id];
    if (existingItem) {
      setQuantity(existingItem.quantity);
    } else {
      setQuantity(1);
    }
  }, [menu.id]);

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-all ${
      isUnavailable 
        ? 'opacity-60 cursor-not-allowed' 
        : 'hover:shadow-lg'
    }`}>
      {menu.image && (
        <div className="w-full h-40 sm:h-48 bg-gray-200 overflow-hidden relative">
          <img 
            src={menu.image} 
            alt={menu.name} 
            className={`w-full h-full object-cover ${
              isUnavailable ? 'grayscale' : ''
            }`}
          />
          {isUnavailable && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm sm:text-base shadow-lg">
                {statusLabel}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="p-3 sm:p-4">
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold text-base sm:text-lg ${
              isUnavailable ? 'text-gray-500 line-through' : 'text-gray-800'
            }`}>
              {menu.name}
            </h3>
            {!menu.image && isUnavailable && (
              <span className="inline-block bg-red-100 text-red-700 text-xs px-2 py-1 rounded whitespace-nowrap">
                {statusLabel}
              </span>
            )}
          </div>
          {menu.description && (
            <p className={`text-xs sm:text-sm mt-1 ${
              isUnavailable ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {menu.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <p className={`text-lg sm:text-xl font-bold ${
              isUnavailable ? 'text-gray-400' : 'text-unpas-blue'
            }`}>
              {formatCurrency(menu.price)}
            </p>
            {!isUnavailable && menu.quantity !== undefined && (
              <span className="text-xs sm:text-sm text-gray-500">
                Stok: {menu.quantity}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className={`flex items-center gap-2 border rounded-lg justify-center ${
            isUnavailable 
              ? 'border-gray-200 bg-gray-50' 
              : 'border-gray-300'
          }`}>
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={isUnavailable}
              className={`px-4 py-2 min-h-[44px] min-w-[44px] cursor-pointer ${
                isUnavailable
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="Kurangi jumlah"
            >
              -
            </button>
            <span className={`px-4 py-2 font-medium min-w-[3rem] text-center ${
              isUnavailable ? 'text-gray-400' : 'text-gray-800'
            }`}>
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={isUnavailable || (availableStock !== undefined && quantity >= availableStock)}
              className={`px-4 py-2 min-h-[44px] min-w-[44px] cursor-pointer ${
                isUnavailable || (availableStock !== undefined && quantity >= availableStock)
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="Tambah jumlah"
            >
              +
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isUnavailable}
            className={`flex-1 px-4 py-3 rounded-lg font-medium min-h-[44px] text-sm sm:text-base transition-color cursor-pointer ${
              isUnavailable
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-unpas-blue text-white hover:bg-unpas-blue/90'
            }`}
          >
            {isUnavailable ? statusLabel : 'Tambah ke Keranjang'}
          </button>
        </div>
      </div>
    </div>
  );
}

