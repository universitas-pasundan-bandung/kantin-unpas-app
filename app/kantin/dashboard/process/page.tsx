'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/auth';
import { showAlert } from '@/lib/swal';
import LoadingSpinner from '@/components/LoadingSpinner';
import Header from '@/components/Header';

function ProcessOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('id');
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processOrder = async () => {
      // Check if transaction ID is provided
      if (!transactionId) {
        setError('ID pesanan tidak ditemukan');
        setIsProcessing(false);
        setTimeout(() => {
          router.push('/kantin/dashboard?tab=pesanan');
        }, 2000);
        return;
      }

      // Check authentication
      const verifiedAuth = await auth.checkAuth();
      
      if (!verifiedAuth || !auth.isKantin()) {
        showAlert.error('Anda harus login terlebih dahulu', 'Akses Ditolak');
        router.push('/login');
        return;
      }

      const token = auth.getToken();

      if (!token) {
        showAlert.error('Token tidak ditemukan. Silakan login kembali.');
        router.push('/login');
        return;
      }

      try {
        // Call API to update transaction status from pending to processing
        const response = await fetch('/api/auth/kantin/update-transaction-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            transactionId,
            status: 'processing',
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Success - redirect to dashboard
          showAlert.successToast('Status pesanan berhasil diubah menjadi Diproses');
          router.push('/kantin/dashboard?tab=pesanan');
        } else {
          // Error from API
          setError(result.error || 'Gagal mengupdate status pesanan');
          setIsProcessing(false);
          setTimeout(() => {
            router.push('/kantin/dashboard?tab=pesanan');
          }, 3000);
        }
      } catch (error) {
        console.error('Error processing order:', error);
        setError('Terjadi kesalahan saat mengupdate status');
        setIsProcessing(false);
        setTimeout(() => {
          router.push('/kantin/dashboard?tab=pesanan');
        }, 3000);
      }
    };

    processOrder();
  }, [transactionId, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isAdmin={true} />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          {isProcessing ? (
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Sedang mengubah status...
              </h2>
              <p className="text-gray-600">
                Mohon tunggu sebentar
              </p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Gagal mengubah status
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">
                Mengalihkan ke dashboard...
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default function ProcessOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </main>
      </div>
    }>
      <ProcessOrderContent />
    </Suspense>
  );
}

