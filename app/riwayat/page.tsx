'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { storage } from '@/lib/storage';
import { Transaction } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { showAlert } from '@/lib/swal';
import { TableSkeleton } from '@/components/SkeletonLoader';

function RiwayatContent() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'search'>('list');
  const [selectedKantinId, setSelectedKantinId] = useState<string>('');
  const [kantins, setKantins] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load kantins list
    const { kantinStorage } = require('@/lib/kantin');
    const { mockKantins } = require('@/lib/data');
    const allKantinsFromStorage = kantinStorage.getAll();
    const allKantinsList = [
      // ...mockKantins.map((k: any) => ({ id: k.id, name: k.name })),
      ...allKantinsFromStorage.map((k: any) => ({ id: k.id, name: k.name }))
    ];
    setKantins(allKantinsList);

    const kantinId = searchParams.get('kantinId');
    if (kantinId) {
      setSelectedKantinId(kantinId);
      loadTransactionsFromSheet(kantinId);
    } else {
      // Load from localStorage as fallback
      const savedTransactions = storage.transactions.getAll();
      setTransactions(savedTransactions);
    }

    const code = searchParams.get('code');
    if (code) {
      setSearchCode(code);
      setActiveTab('search');
      if (kantinId) {
        // Search in sheet
        searchTransactionInSheet(kantinId, code);
      } else {
        // Search in localStorage
        const found = storage.transactions.findByCode(code);
        setSearchResult(found || null);
      }
    }
  }, [searchParams]);

  const loadTransactionsFromSheet = async (kantinId: string) => {
    setLoading(true);
    try {
      const { kantinStorage } = require('@/lib/kantin');
      const { mockKantins } = require('@/lib/data');
      const kantin = kantinStorage.getAll().find((k: any) => k.id === kantinId);
      const mockKantin = mockKantins.find((k: any) => k.id === kantinId);
      const spreadsheetApiUrl = kantin?.spreadsheetApiUrl || mockKantin?.spreadsheetApiUrl;

      if (spreadsheetApiUrl) {
        const response = await fetch(`/api/transactions?scriptUrl=${encodeURIComponent(spreadsheetApiUrl)}`);
        const result = await response.json();
        if (result.success && result.data) {
          // Parse items and deliveryLocation from string to object if needed
          const parsedTransactions = result.data.map((txn: any) => {
            let items = txn.items;
            let deliveryLocation = txn.deliveryLocation;
            
            // Parse items from string to array if needed
            if (typeof items === 'string') {
              try {
                if (items.trim().startsWith('[') || items.trim().startsWith('{')) {
                  items = JSON.parse(items);
                } else {
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
          
          // Replace transactions for this kantin in localStorage
          storage.transactions.replaceByKantinId(kantinId, parsedTransactions);
          
          // Update state
          setTransactions(parsedTransactions);
        } else {
          // Fallback to localStorage
          const savedTransactions = storage.transactions.getAll();
          setTransactions(savedTransactions.filter((t: Transaction) => t.kantinId === kantinId));
        }
      } else {
        // Fallback to localStorage
        const savedTransactions = storage.transactions.getAll();
        setTransactions(savedTransactions.filter((t: Transaction) => t.kantinId === kantinId));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Fallback to localStorage
      const savedTransactions = storage.transactions.getAll();
      setTransactions(savedTransactions.filter((t: Transaction) => t.kantinId === kantinId));
    } finally {
      setLoading(false);
    }
  };

  const searchTransactionInSheet = async (kantinId: string, code: string) => {
    setLoading(true);
    try {
      const { kantinStorage } = require('@/lib/kantin');
      const { mockKantins } = require('@/lib/data');
      const kantin = kantinStorage.getAll().find((k: any) => k.id === kantinId);
      const mockKantin = mockKantins.find((k: any) => k.id === kantinId);
      const spreadsheetApiUrl = kantin?.spreadsheetApiUrl || mockKantin?.spreadsheetApiUrl;

      if (spreadsheetApiUrl) {
        const response = await fetch(`/api/transactions?scriptUrl=${encodeURIComponent(spreadsheetApiUrl)}`);
        const result = await response.json();
        if (result.success && result.data) {
          const found = result.data.find((t: Transaction) => 
            t.code.toLowerCase() === code.toLowerCase() || t.id === code
          );
          
          if (found) {
            // Parse items and deliveryLocation from string to object if needed
            let items = found.items;
            let deliveryLocation = found.deliveryLocation;
            
            // Parse items from string to array if needed
            if (typeof items === 'string') {
              try {
                if (items.trim().startsWith('[') || items.trim().startsWith('{')) {
                  items = JSON.parse(items);
                } else {
                  console.warn('Invalid items format:', items);
                  items = [];
                }
              } catch (parseError) {
                console.error('Error parsing items:', parseError, 'items value:', items);
                items = [];
              }
            }
            
            // Ensure items is always an array
            if (!Array.isArray(items)) {
              items = [];
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
            
            setSearchResult({
              ...found,
              items,
              deliveryLocation,
            });
          } else {
            setSearchResult(null);
          }
        } else {
          // Fallback to localStorage
          const found = storage.transactions.findByCode(code);
          if (found) {
            // Ensure items is always an array
            const normalizedFound = {
              ...found,
              items: Array.isArray(found.items) ? found.items : [],
            };
            setSearchResult(normalizedFound);
          } else {
            setSearchResult(null);
          }
        }
      } else {
        // Fallback to localStorage
        const found = storage.transactions.findByCode(code);
        if (found) {
          // Ensure items is always an array
          const normalizedFound = {
            ...found,
            items: Array.isArray(found.items) ? found.items : [],
          };
          setSearchResult(normalizedFound);
        } else {
          setSearchResult(null);
        }
      }
    } catch (error) {
      console.error('Error searching transaction:', error);
      // Fallback to localStorage
      const found = storage.transactions.findByCode(code);
      if (found) {
        // Ensure items is always an array
        const normalizedFound = {
          ...found,
          items: Array.isArray(found.items) ? found.items : [],
        };
        setSearchResult(normalizedFound);
      } else {
        setSearchResult(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKantinChange = (kantinId: string) => {
    setSelectedKantinId(kantinId);
    if (kantinId) {
      loadTransactionsFromSheet(kantinId);
    } else {
      const savedTransactions = storage.transactions.getAll();
      setTransactions(savedTransactions);
    }
  };

  const handleSearch = () => {
    if (!searchCode.trim()) {
      showAlert.warning('Harap masukkan kode transaksi');
      return;
    }
    if (selectedKantinId) {
      searchTransactionInSheet(selectedKantinId, searchCode);
    } else {
      const found = storage.transactions.findByCode(searchCode);
      if (found) {
        // Ensure items is always an array
        const normalizedFound = {
          ...found,
          items: Array.isArray(found.items) ? found.items : [],
        };
        setSearchResult(normalizedFound);
      } else {
        setSearchResult(null);
        showAlert.error('Kode transaksi tidak ditemukan');
      }
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return 'Menunggu';
      case 'processing':
        return 'Diproses';
      case 'ready':
        return 'Siap';
      case 'completed':
        return 'Selesai';
      case 'cancelled':
        return 'Dibatalkan';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Riwayat Transaksi</h1>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Kantin
            </label>
            <select
              value={selectedKantinId}
              onChange={(e) => handleKantinChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-unpas-blue text-sm sm:text-base min-h-[44px]"
            >
                    <option value="">-- Semua Kantin --</option>
              {kantins.map((kantin) => (
                <option key={kantin.id} value={kantin.id}>
                  {kantin.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'list'
                    ? 'bg-unpas-blue text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Riwayat Saya
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'search'
                    ? 'bg-unpas-blue text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Cari Kode Transaksi
              </button>
            </div>

            {activeTab === 'search' && (
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="Masukkan kode transaksi (contoh: EK-XXX-XXX)"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-unpas-blue text-sm sm:text-base min-h-[44px]"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    className="bg-unpas-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-unpas-blue/90 transition-colors min-h-[44px] text-sm sm:text-base"
                  >
                    Cari
                  </button>
                </div>

                {searchResult && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Kode Transaksi</p>
                        <p className="text-lg font-bold text-unpas-blue">{searchResult.code}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(searchResult.status)}`}>
                        {getStatusText(searchResult.status)}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      {searchResult.customerName && (
                        <p><span className="font-medium">Nama Pemesan:</span> {searchResult.customerName}</p>
                      )}
                      <p><span className="font-medium">Kantin:</span> {searchResult.kantinName}</p>
                      <p><span className="font-medium">Tanggal:</span> {formatDate(searchResult.createdAt)}</p>
                      <p><span className="font-medium">Total:</span> {formatCurrency(searchResult.total)}</p>
                      <div className="mt-3">
                        <p className="font-medium mb-2">Items:</p>
                        {Array.isArray(searchResult.items) && searchResult.items.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1">
                            {searchResult.items.map((item, idx) => (
                              <li key={idx}>
                                {item.menuName} - {item.quantity}x {formatCurrency(item.price)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">Tidak ada item</p>
                        )}
                      </div>
                      {searchResult.deliveryLocation ? (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div>
                              <p className="text-xs font-medium text-blue-800">Lokasi Pengiriman</p>
                              <p className="text-sm text-gray-800">{searchResult.deliveryLocation.name}</p>
                              <p className="text-xs text-gray-600">{searchResult.deliveryLocation.tableNumber}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <div>
                              <p className="text-xs font-medium text-green-800">Take Away</p>
                              <p className="text-sm text-gray-800">Pesanan diambil langsung di lokasi kantin</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {searchResult === null && searchCode && (
                  <div className="mt-6 text-center text-gray-500">
                    Kode transaksi tidak ditemukan
                  </div>
                )}
              </div>
            )}

            {activeTab === 'list' && (
              <div className="p-4 sm:p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-unpas-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Memuat data...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>Belum ada riwayat transaksi</p>
                    {selectedKantinId && (
                      <p className="text-sm mt-2">Pilih toko untuk melihat riwayat transaksi</p>
                    )}
                    {!selectedKantinId && (
                      <p className="text-sm mt-2">Pesananmu akan muncul di sini</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Kode Transaksi</p>
                            <p className="text-lg font-bold text-unpas-blue">{transaction.code}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transaction.status)}`}>
                            {getStatusText(transaction.status)}
                          </span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                          {transaction.customerName && (
                            <p><span className="font-medium">Nama Pemesan:</span> {transaction.customerName}</p>
                          )}
                          <p><span className="font-medium">Kantin:</span> {transaction.kantinName}</p>
                          <p><span className="font-medium">Tanggal:</span> {formatDate(transaction.createdAt)}</p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t">
                          <p className="text-sm text-gray-600">
                            {transaction.items.length} item
                          </p>
                          <p className="text-lg font-bold text-unpas-blue">
                            {formatCurrency(transaction.total)}
                          </p>
                        </div>
                        {transaction.deliveryLocation ? (
                          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <div>
                                <p className="text-xs font-medium text-blue-800">Lokasi Pengiriman</p>
                                <p className="text-sm text-gray-800">{transaction.deliveryLocation.name}</p>
                                <p className="text-xs text-gray-600">{transaction.deliveryLocation.tableNumber}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                              <div>
                                <p className="text-xs font-medium text-green-800">Take Away</p>
                                <p className="text-sm text-gray-800">Pesanan diambil langsung di lokasi kantin</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RiwayatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <p>Memuat...</p>
          </div>
        </main>
      </div>
    }>
      <RiwayatContent />
    </Suspense>
  );
}

