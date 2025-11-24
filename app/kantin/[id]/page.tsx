'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import MenuCard from '@/components/MenuCard';
import { kantinStorage, KantinAccount } from '@/lib/kantin';
import { Menu, CartItem } from '@/types';
import { storage } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import Image from 'next/image';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';
import { FiTrash2 } from "react-icons/fi";

export default function KantinDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [kantin, setKantin] = useState<KantinAccount | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoadingKantin, setIsLoadingKantin] = useState(true);
  const [isLoadingMenus, setIsLoadingMenus] = useState(true);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [cartCount, setCartCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const loadKantin = () => {
      const kantinId = params.id as string;
      const kantinData = kantinStorage.findById(kantinId);
      
      if (!kantinData) {
        router.push('/kantin');
        return;
      }
      
      setKantin(kantinData);
      localStorage.setItem('current_kantin_id', kantinData.id);
      setIsLoadingKantin(false);
      
      // Load menus from kantin's spreadsheet
      if (kantinData.spreadsheetApiUrl) {
        loadMenus(kantinData.spreadsheetApiUrl);
      } else {
        setIsLoadingMenus(false);
      }
    };

    loadKantin();
  }, [params.id, router]);

  const loadMenus = async (spreadsheetApiUrl: string) => {
    setIsLoadingMenus(true);
    try {
      const response = await fetch(`/api/google-script?sheet=Menus&scriptUrl=${encodeURIComponent(spreadsheetApiUrl)}`);
      const result = await response.json();
      
      // Handle both response formats: {success: true, data: [...]} or {data: [...]}
      let menuData: any[] = [];
      
      if (result.data && Array.isArray(result.data)) {
        menuData = result.data;
      } else if (Array.isArray(result)) {
        menuData = result;
      } else if (result.success !== false && result.data) {
        menuData = Array.isArray(result.data) ? result.data : [];
      }
      
      if (menuData.length > 0) {
        // Parse data from spreadsheet
        const parsedMenus = menuData.map((menu: any) => {
          // Parse quantity - handle 0 as valid value, not undefined
          let parsedQuantity: number | undefined = undefined;
          if (menu.quantity !== null && menu.quantity !== undefined && menu.quantity !== '') {
            parsedQuantity = typeof menu.quantity === 'string' ? parseInt(menu.quantity, 10) : Number(menu.quantity);
            // If parsing results in NaN, set to undefined
            if (isNaN(parsedQuantity)) {
              parsedQuantity = undefined;
            }
          }
          
          const parsedMenu = {
            id: menu.id || `menu-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name: menu.name || '',
            description: menu.description || '',
            price: typeof menu.price === 'string' ? parseInt(menu.price, 10) : (menu.price || 0),
            available: menu.available === true || menu.available === 'true' || menu.available === 'TRUE',
            image: menu.image || '',
            quantity: parsedQuantity,
          };
          
          // Debug log for quantity parsing
          if (parsedMenu.quantity === 0 || parsedMenu.quantity === undefined) {
            console.log(`Menu "${parsedMenu.name}": original quantity="${menu.quantity}", parsed quantity=${parsedMenu.quantity}, available=${parsedMenu.available}`);
          }
          
          return parsedMenu;
        });
        setMenus(parsedMenus);
      } else {
        setMenus([]);
      }
    } catch (error) {
      console.error('Error loading menus:', error);
      setMenus([]);
    } finally {
      setIsLoadingMenus(false);
    }
  };

  useEffect(() => {
    const savedCart = storage.cart.get();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(savedCart);
    const count = Object.values(savedCart).reduce((sum, item) => sum + item.quantity, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCartCount(count);
  }, []);

  const handleAddToCart = () => {
    const savedCart = storage.cart.get();
    setCart(savedCart);
    const count = Object.values(savedCart).reduce((sum, item) => sum + item.quantity, 0);
    setCartCount(count);
  };

  const handleRemoveItem = (menuId: string) => {
    const savedCart = storage.cart.get();
    delete savedCart[menuId];
    storage.cart.save(savedCart);
    setCart(savedCart);
    const count = Object.values(savedCart).reduce((sum, item) => sum + item.quantity, 0);
    setCartCount(count);
  };

  const total = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (isLoadingKantin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </main>
      </div>
    );
  }

  if (!kantin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <p className="text-gray-500">Kantin tidak ditemukan</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6 sm:py-8 pb-24 md:pb-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/kantin"
            className="inline-flex items-center gap-2 text-unpas-blue hover:text-unpas-blue/80 mb-4 sm:mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm sm:text-base">Kembali ke Daftar Kantin</span>
          </Link>
          
          {/* Profile Section with Cover Image */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
            {/* Cover Image - Profile Photo Style */}
            {kantin.coverImage ? (
              <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-xl overflow-hidden relative shadow-md border-2 border-gray-200">
                <Image 
                  src={kantin.coverImage} 
                  alt={kantin.name} 
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 96px, (max-width: 1024px) 128px, 160px"
                  onError={(e) => {
                    console.error('Error loading cover image:', kantin.coverImage);
                  }}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-xl bg-gradient-to-br from-unpas-blue/20 to-unpas-gold/20 flex items-center justify-center shadow-md border-2 border-gray-200">
                <svg
                  className="w-12 h-12 sm:w-16 sm:h-16 text-unpas-blue/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            )}
            
            {/* Title and Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800">{kantin.name}</h1>
                <div className="flex items-center gap-2">
                  {kantin.isOpen !== false && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full whitespace-nowrap">
                      Buka
                    </span>
                  )}
                  {kantin.isOpen === false && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full whitespace-nowrap">
                      Tutup
                    </span>
                  )}
                </div>
              </div>
              
              {/* Description */}
              {kantin.description && (
                <p className="text-gray-600 text-sm sm:text-base">{kantin.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 pb-24 lg:pb-0">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Menu</h2>
            {isLoadingMenus ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : menus.length === 0 ? (
              <p className="text-gray-500">Tidak ada menu tersedia</p>
            ) : (
              <div className="space-y-4">
                {menus.map((menu) => (
                  <MenuCard
                    key={menu.id}
                    menu={menu}
                    kantinId={kantin.id}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Desktop Cart */}
          <div className="hidden lg:block lg:col-span-1 order-1 lg:order-2">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-20">
              <h3 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">Keranjang</h3>
              {cartCount === 0 ? (
                <p className="text-gray-500 text-center py-8">Keranjang kosong</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {Object.values(cart).map((item) => (
                      <div key={item.menuId} className="flex items-center justify-between border-b pb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{item.menuName}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} x {formatCurrency(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-unpas-blue whitespace-nowrap">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                          <button
                            onClick={() => handleRemoveItem(item.menuId)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer"
                            aria-label="Hapus item"
                            title="Hapus item"
                          >
                           <FiTrash2/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-semibold text-gray-800">Total</span>
                      <span className="text-xl font-bold text-unpas-blue">{formatCurrency(total)}</span>
                    </div>
                      <Link
                        href={`/kantin/${kantin.id}/checkout`}
                        className="block w-full bg-unpas-blue text-white text-center px-4 py-3 rounded-lg font-medium hover:bg-unpas-blue/90 transition-colors"
                      >
                        Checkout ({cartCount} item)
                      </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Cart - Sticky Bottom */}
        {cartCount > 0 && (
          <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="w-full px-4 py-3 flex items-center justify-between bg-unpas-blue text-white"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-unpas-gold text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Keranjang ({cartCount} item)</p>
                  <p className="text-xs opacity-90">{formatCurrency(total)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatCurrency(total)}</span>
                <svg
                  className={`w-5 h-5 transition-transform ${isCartOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {isCartOpen && (
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="p-4 space-y-3 border-b border-gray-200">
                  {Object.values(cart).map((item) => (
                    <div key={item.menuId} className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{item.menuName}</p>
                        <p className="text-xs text-gray-600">
                          {item.quantity} x {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-unpas-blue text-sm whitespace-nowrap">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                        <button
                          onClick={() => handleRemoveItem(item.menuId)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors flex-shrink-0"
                          aria-label="Hapus item"
                          title="Hapus item"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-semibold text-gray-800">Total</span>
                    <span className="text-lg font-bold text-unpas-blue">{formatCurrency(total)}</span>
                  </div>
                  <Link
                    href={`/kantin/${kantin.id}/checkout`}
                    onClick={() => setIsCartOpen(false)}
                    className="block w-full bg-unpas-blue text-white text-center px-4 py-3 rounded-lg font-medium hover:bg-unpas-blue/90 transition-colors"
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <FloatingWhatsAppButton 
        phoneNumber={kantin?.whatsapp} 
        kantinName={kantin?.name}
        hasCart={cartCount > 0}
      />
    </div>
  );
}

