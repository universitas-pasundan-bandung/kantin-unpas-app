'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function KantinLoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'kantin' | 'superadmin'>('kantin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleKantinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Harap isi email dan password');
      setIsLoading(false);
      return;
    }

    try {
      // Hit API route (server-side, password tidak terlihat di network browser)
      const response = await fetch('/api/auth/kantin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Gagal login. Silakan coba lagi.');
        setIsLoading(false);
        return;
      }

      const kantin = result.data;
      const token = result.token;

      if (!token) {
        setError('Token tidak diterima dari server');
        setIsLoading(false);
        return;
      }

      auth.loginKantin({
        kantinId: kantin.id,
        kantinName: kantin.name,
        ownerId: kantin.ownerId,
        role: 'kantin',
        ...kantin, // Include all other fields from API
      }, token);

      router.push('/kantin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError('Terjadi kesalahan saat login. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username || !password) {
      setError('Harap isi semua field');
      setIsLoading(false);
      return;
    }

    try {
      // Hit API route (server-side, password tidak terlihat di network browser)
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Username atau password salah');
        setIsLoading(false);
        return;
      }

      auth.loginSuperAdmin({
        role: 'superadmin',
        username: result.data.username,
      });
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError('Terjadi kesalahan saat login. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Login</h1>
            <p className="text-sm sm:text-base text-gray-600 text-center mb-6">Masuk sebagai Kantin atau Super Admin</p>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setLoginType('kantin')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors min-h-[44px] text-sm sm:text-base ${
                  loginType === 'kantin'
                    ? 'bg-unpas-blue text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Kantin
              </button>
              <button
                onClick={() => setLoginType('superadmin')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors min-h-[44px] text-sm sm:text-base ${
                  loginType === 'superadmin'
                    ? 'bg-unpas-blue text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Super Admin
              </button>
            </div>

            {loginType === 'kantin' ? (
              <form onSubmit={handleKantinLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-unpas-blue text-sm sm:text-base min-h-[44px]"
                    placeholder="kantin@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-unpas-blue text-sm sm:text-base min-h-[44px]"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-unpas-blue text-white px-4 py-3 rounded-lg font-medium hover:bg-unpas-blue/90 transition-colors min-h-[44px] text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" className="text-white" />
                  ) : (
                    'Masuk sebagai Kantin'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSuperAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-unpas-blue text-sm sm:text-base min-h-[44px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-unpas-blue text-sm sm:text-base min-h-[44px]"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-unpas-gold text-white px-4 py-3 rounded-lg font-medium hover:bg-unpas-gold/90 transition-colors min-h-[44px] text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" className="text-white" />
                  ) : (
                    'Masuk sebagai Super Admin'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

