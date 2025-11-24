'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import GoogleDriveConnect from '@/components/GoogleDriveConnect';
import { storage } from '@/lib/storage';
import { getAccessToken, checkAuthStatus } from '@/lib/googleAuth';
import { CartItem } from '@/types';
import { formatCurrency, generateTransactionCode } from '@/lib/utils';
import { showAlert } from '@/lib/swal';
import Link from 'next/link';
import { KantinAccount } from '@/lib/kantin';
import LoadingSpinner from '@/components/LoadingSpinner';
import Image from 'next/image';

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const kantinId = params.id as string;

  const [cart] = useState<Record<string, CartItem>>(() => {
    const savedCart = storage.cart.get();
    if (Object.keys(savedCart).length === 0) {
      if (typeof window !== 'undefined') {
        router.push('/kantin');
      }
      return {};
    }
    return savedCart;
  });
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [kantin, setKantin] = useState<KantinAccount | null>(null);
  const [isLoadingKantin, setIsLoadingKantin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState(() => {
    if (typeof window === 'undefined') return null;
    return storage.deliveryLocation.get();
  });

  useEffect(() => {
    const loadKantin = async () => {
      if (!kantinId) {
        setIsLoadingKantin(false);
        router.push('/kantin');
        return;
      }

      try {
        const response = await fetch(`/api/kantin/${kantinId}`);
        const result = await response.json();

        if (result.success && result.data) {
          console.log('Kantin data loaded:', result.data);
          console.log('qrisImage:', result.data.qrisImage);
          setKantin(result.data);
          
        } else {
          showAlert.error(result.error || 'Gagal memuat data kantin');
          router.push('/kantin');
        }
      } catch (error) {
        console.error('Error loading kantin:', error);
        showAlert.error('Terjadi kesalahan saat memuat data kantin');
        router.push('/kantin');
      } finally {
        setIsLoadingKantin(false);
      }
    };

    loadKantin();
    
    // Check Google Drive connection status
    const checkGoogleDriveStatus = async () => {
      const connected = await checkAuthStatus();
      setIsGoogleDriveConnected(connected);
    };
    checkGoogleDriveStatus();
  }, [kantinId, router]);

  const subtotal = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryLocation ? 1000 : 0;
  const total = subtotal + deliveryFee;

  const handleRemoveDelivery = async () => {
    const result = await showAlert.confirm('Yakin ingin menghapus layanan pengantaran?', 'Konfirmasi', 'Ya, Hapus', 'Batal');
    if (result.isConfirmed) {
      storage.deliveryLocation.clear();
      setDeliveryLocation(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAlert.error('File harus berupa gambar');
      return;
    }

    // Check Google Drive connection
    const accessToken = getAccessToken();
    if (!accessToken) {
      showAlert.warning('Harap hubungkan ke Google Drive terlebih dahulu');
      return;
    }

    setPaymentProof(file);
    setIsUploading(true);

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // Upload to Google Drive immediately
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accessToken', accessToken);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.success && uploadResult.data) {
        setUploadedFileUrl(uploadResult.data.url);
        showAlert.successToast('Bukti pembayaran berhasil diupload');
      } else {
        console.error('Upload error:', uploadResult.error);
        showAlert.error('Gagal mengupload bukti pembayaran. Silakan coba lagi.');
        setPaymentProof(null);
        setPaymentProofPreview(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      showAlert.error('Gagal mengupload bukti pembayaran. Silakan coba lagi.');
      setPaymentProof(null);
      setPaymentProofPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadedFileUrl) {
      showAlert.warning('Harap upload bukti pembayaran terlebih dahulu');
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionCode = generateTransactionCode();
      const now = new Date();
      const transactionId = `txn-${now.getTime()}`;
      
      // Use delivery location from state

      const transaction = {
        id: transactionId,
        code: transactionCode,
        kantinId,
        kantinName: kantin?.name || 'Kantin',
        customerName: customerName.trim() || undefined,
        items: Object.values(cart),
        total,
        paymentProof: uploadedFileUrl,
        deliveryLocation: deliveryLocation || undefined,
        status: 'pending' as const,
        createdAt: now.toISOString(),
      };

      // Save to localStorage as backup
      storage.transactions.save(transaction);

      // Get kantin spreadsheet URL
      const spreadsheetApiUrl = kantin?.spreadsheetApiUrl;

      // Save to Google Sheets if spreadsheet API URL is available
      if (spreadsheetApiUrl) {
        try {
          // Prepare transaction for Google Sheets (convert arrays/objects to JSON strings)
          const transactionForSheet = {
            ...transaction,
            items: JSON.stringify(transaction.items),
            deliveryLocation: transaction.deliveryLocation ? JSON.stringify(transaction.deliveryLocation) : undefined,
          };
          
          const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              scriptUrl: spreadsheetApiUrl,
              transaction: transactionForSheet,
            }),
          });

          const result = await response.json();
          if (!result.success) {
            console.error('Failed to save to Google Sheets:', result.error);
            // Continue anyway, data is saved in localStorage
          }
        } catch (error) {
          console.error('Error saving to Google Sheets:', error);
          // Continue anyway, data is saved in localStorage
        }
      }

      storage.cart.clear();

      router.push(`/riwayat?code=${transactionCode}&kantinId=${kantinId}`);
    } catch (error) {
      console.error('Error submitting transaction:', error);
      showAlert.error('Terjadi kesalahan saat memproses pesanan. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  if (isLoadingKantin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!kantin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Checkout</h1>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Detail Pesanan</h2>
              
              <div className="mb-3 sm:mb-4">
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Pemesan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masukkan nama Anda"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-unpas-blue text-sm sm:text-base min-h-[44px]"
                />
              </div>
              
              {deliveryLocation && (
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800 mb-1">Lokasi Pengiriman</p>
                      <p className="text-base font-semibold text-gray-800">
                        {deliveryLocation.name} - {deliveryLocation.tableNumber}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Biaya pengantaran: Rp 1.000</p>
                    </div>
                    <button
                      onClick={handleRemoveDelivery}
                      className="flex-shrink-0 text-red-600 hover:text-red-700 p-1"
                      title="Hapus pengantaran"
                      aria-label="Hapus pengantaran"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              {!deliveryLocation && (
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 mb-1">Take Away</p>
                      <p className="text-sm text-green-700">
                        Pesanan akan diambil langsung di lokasi kantin. Scan QR code di meja jika ingin pesanan diantarkan (+Rp 1.000).
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                {Object.values(cart).map((item) => (
                  <div key={item.menuId} className="flex items-center justify-between border-b pb-2 sm:pb-3">
                    <div>
                      <p className="font-medium text-gray-800">{item.menuName}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} x {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold text-unpas-blue">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              {deliveryFee > 0 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm font-medium text-gray-800">{formatCurrency(subtotal)}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-gray-600">Biaya Pengantaran</span>
                  <span className="text-sm font-medium text-gray-800">{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t">
                <span className="text-base sm:text-lg font-semibold text-gray-800">Total</span>
                <span className="text-xl sm:text-2xl font-bold text-unpas-blue">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Pembayaran</h2>
              
              {/* QRIS Payment Image */}
              {kantin.qrisImage ? (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Scan QRIS untuk Pembayaran</h3>
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-xs aspect-square">
                      <Image
                        src={kantin.qrisImage}
                        alt="QRIS Pembayaran"
                        fill
                        className="object-contain rounded-lg"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
                        onError={(e) => {
                          console.error('Error loading QRIS image:', kantin.qrisImage);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3 items-center">
                    <p className="text-sm text-gray-600 text-center flex-1">
                      Scan QR code di atas untuk melakukan pembayaran
                    </p>
                    {kantin.qrisImage && (
                      <button
                        type="button"
                        onClick={() => {
                          // Extract file ID from Google Drive URL
                          const idMatch = kantin.qrisImage?.match(/[\/=]([a-zA-Z0-9_-]{25,})/);
                          if (idMatch) {
                            const fileId = idMatch[1];
                            // Use direct download link
                            const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                            window.open(downloadUrl, '_blank');
                          } else {
                            // Fallback to original URL
                            window.open(kantin.qrisImage, '_blank');
                          }
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-unpas-blue text-white text-sm font-medium rounded-lg hover:bg-unpas-blue/90 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Unduh QRIS
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 text-center">
                    QRIS pembayaran belum tersedia untuk kantin ini
                  </p>
                </div>
              )}

              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Upload Bukti Pembayaran</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Koneksi Google Drive
                  </label>
                  <GoogleDriveConnect 
                    onConnected={() => setIsGoogleDriveConnected(true)}
                    onDisconnected={() => setIsGoogleDriveConnected(false)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Foto Bukti Pembayaran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    id="payment-proof-upload"
                    className="hidden"
                    disabled={isUploading || !isGoogleDriveConnected}
                  />
                  <label
                    htmlFor="payment-proof-upload"
                    className={`relative flex items-center justify-center w-full h-48 border-2 border-dashed rounded-lg transition-colors ${
                      !isGoogleDriveConnected
                        ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                        : isUploading
                        ? 'border-unpas-blue bg-unpas-blue/5 cursor-wait'
                        : uploadedFileUrl || paymentProofPreview
                        ? 'border-green-500 bg-green-50 cursor-pointer'
                        : 'border-gray-300 bg-gray-50 hover:border-unpas-blue hover:bg-unpas-blue/5 cursor-pointer'
                    } ${isUploading || !isGoogleDriveConnected ? 'pointer-events-none' : ''}`}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <LoadingSpinner size="lg" />
                      </div>
                    ) : uploadedFileUrl || paymentProofPreview ? (
                      <div className="absolute inset-0 rounded-lg overflow-hidden">
                        <img
                          src={paymentProofPreview || uploadedFileUrl || ''}
                          alt="Bukti pembayaran"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center px-4">
                        <svg
                          className={`w-12 h-12 ${!isGoogleDriveConnected ? 'text-gray-400' : 'text-gray-500'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {!isGoogleDriveConnected ? (
                          <>
                            <p className="text-sm font-medium text-red-500">Hubungkan Google Drive terlebih dahulu</p>
                            <p className="text-xs text-red-400">Perlu terhubung ke Google Drive untuk mengupload bukti pembayaran</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-500">Klik untuk upload bukti pembayaran</p>
                            <p className="text-xs text-gray-500">File akan langsung diupload ke Google Drive</p>
                          </>
                        )}
                      </div>
                    )}
                  </label>
                  {uploadedFileUrl && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-700 mb-1 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Bukti pembayaran berhasil diupload
                      </p>
                      <a
                        href={uploadedFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:underline"
                      >
                        Lihat di Google Drive →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href={`/kantin/${kantinId}`}
                className="flex-1 bg-gray-200 text-gray-800 text-center px-4 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors min-h-[44px] flex items-center justify-center"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={!uploadedFileUrl || isUploading || isSubmitting}
                className="flex-1 bg-unpas-blue text-white px-4 py-3 rounded-lg font-medium hover:bg-unpas-blue/80 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : (
                  'Konfirmasi Pesanan'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

