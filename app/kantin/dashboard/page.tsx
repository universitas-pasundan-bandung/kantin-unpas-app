'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { auth } from '@/lib/auth';
import { Menu, Transaction } from '@/types';
import { showAlert } from '@/lib/swal';
import { KantinAccount } from '@/lib/kantin';
import LoadingSpinner from '@/components/LoadingSpinner';
import KantinProfileModal from '@/components/KantinProfileModal';
import { ProfileSkeleton } from '@/components/SkeletonLoader';
import KantinProfileCard from '@/components/KantinProfileCard';
import KantinTabNavigation from '@/components/KantinTabNavigation';
import KantinMenuTab from '@/components/KantinMenuTab';
import PesananTable from '@/components/PesananTable';
import { getAccessToken } from '@/lib/googleAuth';

function KantinDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'menu';
  
  const [kantinData, setKantinData] = useState<KantinAccount | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingTransactionStatus, setIsUpdatingTransactionStatus] = useState<string | null>(null);
  const [isLoadingMenus, setIsLoadingMenus] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleTabChange = (tab: 'menu' | 'pesanan') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/kantin/dashboard?${params.toString()}`, { scroll: false });
  };

  // Check Google Drive connection
  const checkGoogleDriveConnection = () => {
    const token = getAccessToken();
    return !!token;
  };

  const loadTransactions = useCallback(async (spreadsheetApiUrl: string) => {
    setIsLoadingTransactions(true);
    try {
      const response = await fetch(`/api/transactions?scriptUrl=${encodeURIComponent(spreadsheetApiUrl)}`);
      const result = await response.json();
      
      // Handle both response formats: {success: true, data: [...]} or {data: [...]}
      const transactionData = result.success !== false && result.data && Array.isArray(result.data)
        ? result.data
        : (Array.isArray(result) ? result : []);
      
      if (transactionData.length > 0 || (result.success !== false && result.data !== undefined)) {
        // Parse items from string to array if needed
        const parsedTransactions = transactionData.map((txn: any) => {
          let items = txn.items;
          let deliveryLocation = txn.deliveryLocation;
          
          // Parse items from string to array if needed
          if (typeof items === 'string') {
            try {
              // Check if it's a valid JSON string
              if (items.trim().startsWith('[') || items.trim().startsWith('{')) {
                items = JSON.parse(items);
              } else {
                // If not valid JSON, try to parse as array or set to empty array
                console.warn('Invalid items format:', items);
                items = [];
              }
            } catch (parseError) {
              console.error('Error parsing items:', parseError, 'items value:', items);
              items = [];
            }
          }
          
          // Parse deliveryLocation from string to object if needed
          if (typeof deliveryLocation === 'string' && deliveryLocation.trim()) {
            try {
              if (deliveryLocation.trim().startsWith('{')) {
                deliveryLocation = JSON.parse(deliveryLocation);
              } else {
                deliveryLocation = undefined;
              }
            } catch (parseError) {
              console.error('Error parsing deliveryLocation:', parseError);
              deliveryLocation = undefined;
            }
          }
          
          return {
            ...txn,
            items,
            deliveryLocation,
          };
        });
        // Replace all transactions in state with fresh data from API
        setTransactions(parsedTransactions);
        console.log('Transactions loaded:', parsedTransactions.length);
      } else {
        setTransactions([]);
        if (result.success === false) {
          showAlert.error(result.error || 'Gagal memuat data transaksi');
        }
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      showAlert.error('Terjadi kesalahan saat memuat transaksi');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  const loadMenus = useCallback(async (spreadsheetApiUrl: string) => {
    setIsLoadingMenus(true);
    try {
      const response = await fetch(`/api/google-script?sheet=Menus&scriptUrl=${encodeURIComponent(spreadsheetApiUrl)}`);
      const result = await response.json();
      
      console.log('API Response:', result);
      
      // Handle both response formats: {success: true, data: [...]} or {data: [...]}
      // Google Script returns {data: [...]} directly
      let menuData: any[] = [];
      
      if (result.data && Array.isArray(result.data)) {
        // Format: {data: [...]}
        menuData = result.data;
      } else if (Array.isArray(result)) {
        // Format: [...] (direct array)
        menuData = result;
      } else if (result.success !== false && result.data) {
        // Format: {success: true, data: [...]}
        menuData = Array.isArray(result.data) ? result.data : [];
      }
      
      console.log('Parsed menuData:', menuData);
      
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
          
          return {
            id: menu.id || `menu-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name: menu.name || '',
            description: menu.description || '',
            price: typeof menu.price === 'string' ? parseInt(menu.price, 10) : (menu.price || 0),
            available: menu.available === true || menu.available === 'true' || menu.available === 'TRUE',
            image: menu.image || '',
            quantity: parsedQuantity,
          };
        });
        // Replace all menus in state with fresh data from API
        setMenus(parsedMenus);
        console.log('Menus loaded successfully:', parsedMenus.length, parsedMenus);
      } else {
        // If no menus found, set empty array
        setMenus([]);
        console.log('No menus found in response. Result:', result);
      }
    } catch (error) {
      console.error('Error loading menus:', error);
      showAlert.error('Terjadi kesalahan saat memuat menu');
      setMenus([]);
    } finally {
      setIsLoadingMenus(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const verifiedAuth = await auth.checkAuth();
      
      if (!verifiedAuth || !auth.isKantin()) {
        router.push('/login');
        return;
      }

      // Set kantin data from verified auth
      const kantin = verifiedAuth as unknown as KantinAccount;
      
      // Debug: Log spreadsheetApiUrl to verify it's coming from /me endpoint
      console.log('Kantin data from /me:', {
        id: kantin.id,
        name: kantin.name,
        spreadsheetApiUrl: kantin.spreadsheetApiUrl,
      });
      
      if (!kantin.spreadsheetApiUrl) {
        console.error('spreadsheetApiUrl tidak ditemukan di response /me');
        showAlert.error('Spreadsheet API URL tidak ditemukan. Silakan hubungi administrator.');
      }
      
      setKantinData(kantin);
      setIsLoading(false);
      
      // Load menus from spreadsheet
      if (kantin.spreadsheetApiUrl) {
        loadMenus(kantin.spreadsheetApiUrl);
      }
    };

    checkAuth();
  }, [router, loadMenus]);

  useEffect(() => {
    // Load transactions when switching to pesanan tab
    if (activeTab === 'pesanan' && kantinData?.spreadsheetApiUrl) {
      loadTransactions(kantinData.spreadsheetApiUrl);
    }
  }, [activeTab, kantinData?.spreadsheetApiUrl, loadTransactions]);

  const handleUpdateTransactionStatus = async (transactionId: string, newStatus: Transaction['status']) => {
    const token = auth.getToken();

    if (!token) {
      showAlert.error('Token tidak ditemukan. Silakan login kembali.');
      router.push('/login');
      return;
    }

    setIsUpdatingTransactionStatus(transactionId);
    try {
      // Call API to update transaction status
      const response = await fetch('/api/auth/kantin/update-transaction-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionId,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reload transactions and menus to get updated data (menus might have quantity changes)
        if (kantinData?.spreadsheetApiUrl) {
          await Promise.all([
            loadTransactions(kantinData.spreadsheetApiUrl),
            loadMenus(kantinData.spreadsheetApiUrl),
          ]);
        }
        showAlert.successToast(`Status pesanan berhasil diubah menjadi ${getStatusLabel(newStatus)}`);
      } else {
        showAlert.error(result.error || 'Gagal mengupdate status pesanan');
      }
    } catch (error) {
      console.error('Error updating transaction status:', error);
      showAlert.error('Terjadi kesalahan saat mengupdate status');
    } finally {
      setIsUpdatingTransactionStatus(null);
    }
  };

  const getStatusLabel = (status: Transaction['status']): string => {
    const labels: Record<Transaction['status'], string> = {
      pending: 'Menunggu',
      processing: 'Diproses',
      ready: 'Siap',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    };
    return labels[status] || status;
  };

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  const handleToggleStatus = async () => {
    if (!kantinData || isUpdatingStatus) return;

    const newStatus = !kantinData.isOpen;
    const token = auth.getToken();

    if (!token) {
      showAlert.error('Token tidak ditemukan. Silakan login kembali.');
      router.push('/login');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const response = await fetch('/api/auth/kantin/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isOpen: newStatus }),
      });

      const result = await response.json();

      if (!result.success) {
        showAlert.error(result.error || 'Gagal mengupdate status');
        setIsUpdatingStatus(false);
        return;
      }

      // Update local state with fresh data
      setKantinData(result.data);
      showAlert.successToast(`Kantin ${newStatus ? 'dibuka' : 'ditutup'}`);
    } catch (error) {
      console.error('Error updating status:', error);
      showAlert.error('Terjadi kesalahan saat mengupdate status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <ProfileSkeleton />
          <div className="mt-6">
            <div className="bg-white rounded-lg p-6">
              <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!kantinData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isAdmin={true} />
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Profile Section */}
        <KantinProfileCard
          kantinData={kantinData}
          isUpdatingStatus={isUpdatingStatus}
          onEditProfile={() => setShowProfileModal(true)}
          onLogout={handleLogout}
          onToggleStatus={handleToggleStatus}
        />

        {/* Tab Navigation */}
        <KantinTabNavigation
          activeTab={activeTab as 'menu' | 'pesanan'}
          onTabChange={handleTabChange}
        />

        {/* Tab Content */}
        {activeTab === 'menu' ? (
          <div>
            <KantinMenuTab
              menus={menus}
              isLoading={isLoadingMenus}
              kantinData={kantinData}
              onMenusChange={setMenus}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <PesananTable
              transactions={transactions}
              isLoading={isLoadingTransactions}
              isUpdatingTransactionStatus={isUpdatingTransactionStatus}
              onRefresh={() => kantinData?.spreadsheetApiUrl && loadTransactions(kantinData.spreadsheetApiUrl)}
              onStatusChange={handleUpdateTransactionStatus}
            />
          </div>
        )}

        {/* Profile Modal */}
        {kantinData && (
          <KantinProfileModal
            isOpen={showProfileModal}
            kantinData={kantinData}
            onClose={() => setShowProfileModal(false)}
            onUpdate={(updatedData) => {
              setKantinData(updatedData);
              // Update auth data as well
              const token = auth.getToken();
              if (token) {
                const kantinAuth = {
                  ...updatedData,
                  kantinId: updatedData.id,
                  kantinName: updatedData.name,
                  ownerId: updatedData.ownerId,
                  role: 'kantin' as const,
                };
                auth.loginKantin(kantinAuth, token);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

export default function KantinDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </main>
      </div>
    }>
      <KantinDashboardContent />
    </Suspense>
  );
}
