import Header from '@/components/Header';
import ScanQR from '@/components/ScanQR';
import Link from 'next/link';
import { FiPackage } from "react-icons/fi";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Selamat Datang di E-Kantin UNPAS
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              Powered by <a href="https://kodingkeliling.com" target="_blank" rel="noopener noreferrer" className="text-unpas-blue hover:text-unpas-blue/80 hover:underline">Koding Keliling</a>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 md:order-2">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Cara Pesan</h2>
              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-unpas-blue text-white rounded-full flex items-center justify-center font-bold">
                    <FiPackage />
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Metode Pengambilan</h3>
                    <p className="text-sm text-gray-600">Take Away: Ambil langsung di lokasi kantin</p>
                    <p className="text-sm text-gray-600">Delivery: Scan QR code di meja untuk pesanan diantarkan (+Rp 1.000)</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-unpas-blue text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Pilih Kantin</h3>
                    <p className="text-sm text-gray-600">Pilih kantin yang ingin kamu kunjungi</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-unpas-blue text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Pilih Menu</h3>
                    <p className="text-sm text-gray-600">Tambahkan menu ke keranjang</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-unpas-blue text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Upload Bukti Bayar</h3>
                    <p className="text-sm text-gray-600">Upload bukti pembayaran kamu</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-unpas-blue text-white rounded-full flex items-center justify-center font-bold">
                    4
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-800">Dapatkan Kode Transaksi</h3>
                    <p className="text-sm text-gray-600">Cek progress pesananmu dengan kode transaksi</p>
                  </div>
                </li>
              </ol>
            </div>
            <div className="md:order-1">
              <ScanQR />
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/kantin"
              className="inline-block bg-unpas-blue text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-unpas-blue/90 transition-colors shadow-md"
            >
              Lihat Daftar Kantin →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
