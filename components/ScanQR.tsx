'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { storage } from '@/lib/storage';
import { DeliveryLocation } from '@/types';
import { showAlert } from '@/lib/swal';

// Mock data untuk lokasi QR code di kampus
const QR_LOCATIONS = [
  { id: 'lokasi-1', name: 'Gedung A', tableNumber: 'Meja 1' },
  { id: 'lokasi-2', name: 'Gedung A', tableNumber: 'Meja 2' },
  { id: 'lokasi-3', name: 'Gedung A', tableNumber: 'Meja 3' },
  { id: 'lokasi-4', name: 'Gedung B', tableNumber: 'Meja 1' },
  { id: 'lokasi-5', name: 'Gedung B', tableNumber: 'Meja 2' },
  { id: 'lokasi-6', name: 'Gedung C', tableNumber: 'Meja 1' },
  { id: 'lokasi-7', name: 'Gedung C', tableNumber: 'Meja 2' },
  { id: 'lokasi-8', name: 'Ruang Dosen', tableNumber: 'Meja 1' },
  { id: 'lokasi-9', name: 'Ruang Dosen', tableNumber: 'Meja 2' },
  { id: 'lokasi-10', name: 'Perpustakaan', tableNumber: 'Meja 1' },
];

export default function ScanQR() {
  const searchParams = useSearchParams();
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(() => {
    if (typeof window === 'undefined') return null;
    return storage.deliveryLocation.get();
  });
  const [isScanning, setIsScanning] = useState(false);

  // Handle query params "meja=" from URL
  useEffect(() => {
    const mejaParam = searchParams.get('meja');
    if (mejaParam) {
      // Parse meja parameter (format: "Gedung A - Meja 1" or similar)
      const parts = mejaParam.split(' - ');
      let name = 'Lokasi';
      let tableNumber = mejaParam;
      
      if (parts.length >= 2) {
        name = parts[0];
        tableNumber = parts.slice(1).join(' - ');
      } else {
        // Try to extract name and table from single string
        const match = mejaParam.match(/(.+?)\s+(Meja\s+\d+)/i);
        if (match) {
          name = match[1];
          tableNumber = match[2];
        } else {
          tableNumber = mejaParam;
        }
      }

      const location: DeliveryLocation = {
        name: name.trim(),
        tableNumber: tableNumber.trim(),
        scannedAt: new Date().toISOString(),
      };
      
      storage.deliveryLocation.save(location);
      setDeliveryLocation(location);
      
      // Remove query param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('meja');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const handleScan = () => {
    setIsScanning(true);
    
    // Simulasi scan QR code - random lokasi
    setTimeout(() => {
      const randomLocation = QR_LOCATIONS[Math.floor(Math.random() * QR_LOCATIONS.length)];
      const location: DeliveryLocation = {
        name: randomLocation.name,
        tableNumber: randomLocation.tableNumber,
        scannedAt: new Date().toISOString(),
      };
      
      storage.deliveryLocation.save(location);
      setDeliveryLocation(location);
      setIsScanning(false);
      
      showAlert.success(`Lokasi pengiriman berhasil di-set!\n${location.name} - ${location.tableNumber}`);
    }, 1500);
  };

  const handleClearLocation = async () => {
    const result = await showAlert.confirm('Yakin ingin menghapus lokasi pengiriman?', 'Konfirmasi', 'Ya, Hapus', 'Batal');
    if (result.isConfirmed) {
      storage.deliveryLocation.clear();
      setDeliveryLocation(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Scan QR Code Lokasi</h2>
      <p className="text-sm sm:text-base text-gray-600 mb-4">
        Scan QR code di meja dosen atau meja mahasiswa untuk menentukan lokasi pengiriman pesanan Anda.
      </p>
      
      <div className="bg-unpas-blue/10 border-2 border-dashed border-unpas-blue rounded-lg p-4 sm:p-8 mb-4 flex flex-col items-center justify-center min-h-[250px] sm:min-h-[300px]">
        {isScanning ? (
          <div className="text-center">
            <div className="w-20 h-20 border-4 border-unpas-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-unpas-blue font-medium">Memindai QR Code...</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-unpas-blue/20 rounded-lg mb-4 flex items-center justify-center mx-auto">
              <svg
                className="w-16 h-16 sm:w-20 sm:h-20 text-unpas-blue"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">Arahkan kamera ke QR Code di wilayah kampus Unpas</p>
            {/* <button
              onClick={handleScan}
              className="bg-unpas-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-unpas-blue/90 transition-colors text-sm sm:text-base min-h-[44px]"
            >
              Mulai Scan
            </button> */}
          </div>
        )}
      </div>

      {deliveryLocation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm font-medium text-green-800">Lokasi Pengiriman</p>
              </div>
              <p className="text-lg font-bold text-gray-800">{deliveryLocation.name}</p>
              <p className="text-sm text-gray-600">{deliveryLocation.tableNumber}</p>
              <p className="text-xs text-gray-500 mt-2">
                Di-scan: {new Date(deliveryLocation.scannedAt).toLocaleString('id-ID')}
              </p>
            </div>
            <button
              onClick={handleClearLocation}
              className="text-red-600 hover:text-red-700 text-sm underline"
            >
              Hapus
            </button>
          </div>
        </div>
      )}

      {!deliveryLocation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-yellow-800">
              Belum ada lokasi pengiriman. Silakan scan QR code untuk menentukan lokasi pengiriman pesanan Anda.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
