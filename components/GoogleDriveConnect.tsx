'use client';

import { useState, useEffect } from 'react';
import { initiateGoogleAuth, checkAuthStatus, disconnectGoogle, getAccessToken } from '@/lib/googleAuth';
import { showAlert } from '@/lib/swal';

interface GoogleDriveConnectProps {
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export default function GoogleDriveConnect({ onConnected, onDisconnected }: GoogleDriveConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    const connected = await checkAuthStatus();
    setIsConnected(connected);
    setIsChecking(false);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await initiateGoogleAuth();
      await checkConnection();
      if (onConnected) onConnected();
    } catch (error) {
      console.error('Connection error:', error);
      showAlert.error('Gagal menghubungkan ke Google Drive. Pastikan popup tidak diblokir.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const result = await showAlert.confirm('Yakin ingin memutuskan koneksi ke Google Drive?', 'Konfirmasi', 'Ya, Putuskan', 'Batal');
    if (!result.isConfirmed) return;
    
    try {
      await disconnectGoogle();
      setIsConnected(false);
      if (onDisconnected) onDisconnected();
    } catch (error) {
      console.error('Disconnect error:', error);
      showAlert.error('Gagal memutuskan koneksi.');
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-4 h-4 border-2 border-unpas-blue border-t-transparent rounded-full animate-spin"></div>
        Memeriksa koneksi...
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-green-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Terhubung ke Google Drive</span>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-xs text-red-600 hover:text-red-700 underline cursor-pointer"
        >
          Putuskan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-unpas-blue border-t-transparent rounded-full animate-spin"></div>
            Menghubungkan...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Hubungkan ke Google Drive
          </>
        )}
      </button>
      <p className="text-xs text-red-500">
        Perlu terhubung ke Google Drive untuk mengupload bukti pembayaran
      </p>
    </div>
  );
}

