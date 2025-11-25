'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { auth } from '@/lib/auth';
import { kantinStorage, KantinAccount, OperatingHours } from '@/lib/kantin';
import { saveKantinToSuperAdminSheet, updateKantinInSuperAdminSheet, getKantinsFromSuperAdminSheet, deleteKantinFromSuperAdminSheet } from '@/lib/googleScript';
import KantinFormModal from '@/components/KantinFormModal';
import { showAlert } from '@/lib/swal';
import { LuTrash2 } from 'react-icons/lu';
import { TbEdit } from 'react-icons/tb';
import { TableSkeleton } from '@/components/SkeletonLoader';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [authData] = useState(auth.getAuth());
  const [kantins, setKantins] = useState<KantinAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingKantin, setEditingKantin] = useState<KantinAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadKantins = async () => {
    setIsLoading(true);
    // Load from localStorage first (for quick display)
    const allKantins = kantinStorage.getAll();
    // Sort by createdAt descending (newest first)
    const sortedKantins = [...allKantins].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
    setKantins(sortedKantins);
    setIsLoading(false);

    // Then try to load from Google Sheets
    try {
      const response = await getKantinsFromSuperAdminSheet();
      if (response.success && response.data?.data) {
        const kantinsFromSheet = response.data.data as KantinAccount[];
        
        // Replace all data in localStorage with fresh data from API
        kantinStorage.replaceAll(kantinsFromSheet);
        
        // Sort and update state with fresh data from API
        const sortedUpdatedKantins = [...kantinsFromSheet].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        setKantins(sortedUpdatedKantins);
      }
    } catch (error) {
      console.error('Error loading kantins from sheet:', error);
      // Continue with localStorage data
    }
  };

  const resetForm = () => {
    setEditingKantin(null);
  };

  useEffect(() => {
    if (!authData || !auth.isSuperAdmin()) {
      router.push('/login');
      return;
    }

    loadKantins();
  }, [authData, router]);

  const handleSubmitKantin = async (data: {
    name: string;
    description: string;
    email: string;
    password: string;
    spreadsheetApiUrl: string;
    spreadsheetUrl: string;
    whatsapp: string;
    coverImage: string;
    qrisImage: string;
    isOpen: boolean;
    operatingHours: OperatingHours[];
  }) => {
    setIsSubmitting(true);
    try {
      if (editingKantin) {
      // Update existing kantin
      const updatedKantin: KantinAccount = {
        ...editingKantin,
        name: data.name,
        description: data.description,
        password: data.password,
        spreadsheetApiUrl: data.spreadsheetApiUrl,
        spreadsheetUrl: data.spreadsheetUrl,
        email: data.email,
        whatsapp: data.whatsapp,
        coverImage: data.coverImage,
        qrisImage: data.qrisImage,
        isOpen: data.isOpen,
        operatingHours: data.operatingHours,
      };

      // Save to localStorage first
      kantinStorage.save(updatedKantin);
      // Sort by createdAt descending (newest first)
      const allKantins = kantinStorage.getAll();
      const sortedKantins = [...allKantins].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      setKantins(sortedKantins);

      // Update to Google Sheets
      try {
        const response = await updateKantinInSuperAdminSheet(editingKantin.id, updatedKantin);
        if (!response.success) {
          console.error('Failed to update in Google Sheets:', response.error);
          showAlert.warning('Akun kantin berhasil diupdate di lokal, tapi gagal mengupdate di Google Sheets. Silakan coba lagi.');
        } else {
          resetForm();
          setShowAddForm(false);
          showAlert.success('Akun kantin berhasil diupdate!');
        }
      } catch (error) {
        console.error('Error updating in Google Sheets:', error);
        showAlert.warning('Akun kantin berhasil diupdate di lokal, tapi gagal mengupdate di Google Sheets. Silakan coba lagi.');
      }
      } else {
      // Create new kantin
      const newKantin: KantinAccount = {
        id: `kantin-${Date.now()}`,
        name: data.name,
        description: data.description,
        ownerId: `owner-${Date.now()}`,
        password: data.password,
        spreadsheetApiUrl: data.spreadsheetApiUrl,
        spreadsheetUrl: data.spreadsheetUrl,
        email: data.email,
        whatsapp: data.whatsapp,
        coverImage: data.coverImage,
        qrisImage: data.qrisImage,
        isOpen: data.isOpen,
        operatingHours: data.operatingHours,
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage first (for quick feedback)
      kantinStorage.save(newKantin);
      // Sort by createdAt descending (newest first)
      const allKantins = kantinStorage.getAll();
      const sortedKantins = [...allKantins].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      setKantins(sortedKantins);

      // Save to Google Sheets
      try {
        const response = await saveKantinToSuperAdminSheet(newKantin);
        if (!response.success) {
          console.error('Failed to save to Google Sheets:', response.error);
          showAlert.warning('Akun kantin berhasil dibuat di lokal, tapi gagal menyimpan ke Google Sheets. Silakan coba lagi.');
        } else {
          resetForm();
          setShowAddForm(false);
          showAlert.success('Akun kantin berhasil dibuat!');
        }
      } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        showAlert.warning('Akun kantin berhasil dibuat di lokal, tapi gagal menyimpan ke Google Sheets. Silakan coba lagi.');
      }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditKantin = (kantin: KantinAccount) => {
    setEditingKantin(kantin);
    setShowAddForm(true);
  };

  const handleDeleteKantin = async (id: string) => {
    const result = await showAlert.confirm('Yakin ingin menghapus akun kantin ini?', 'Konfirmasi Hapus', 'Ya, Hapus', 'Batal');
    if (!result.isConfirmed) return;
    
    kantinStorage.delete(id);
    // Sort by createdAt descending (newest first)
    const allKantins = kantinStorage.getAll();
    const sortedKantins = [...allKantins].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
    setKantins(sortedKantins);
    showAlert.success('Akun kantin berhasil dihapus!');

    // Hit delete API in the background (non-blocking)
    deleteKantinFromSuperAdminSheet(id).then((response) => {
      console.log('Response from delete API:', response);
      if (response.success === false) {
        console.error('Failed to delete kantin from Google Sheets:', response.error);
        showAlert.warning('Akun kantin sudah dihapus secara lokal, tetapi gagal menghapus dari Google Sheets. Silakan coba lagi nanti.');
      }
    }).catch((error) => {
      console.error('Error deleting kantin from Google Sheets:', error);
      showAlert.warning('Akun kantin sudah dihapus secara lokal, tetapi gagal menghapus dari Google Sheets. Silakan coba lagi nanti.');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isAdmin={true} />
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">Super Admin Dashboard</h1>
          <p className="text-gray-600">Kelola akun kantin</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Daftar Kantin</h2>
            <button
              onClick={() => {
                if (showAddForm) {
                  resetForm();
                }
                setShowAddForm(!showAddForm);
              }}
              className="bg-unpas-gold text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium hover:bg-unpas-gold/90 transition-colors cursor-pointer"
            >
              + Buat Akun Kantin
            </button>
          </div>

          <KantinFormModal
            isOpen={showAddForm}
            editingKantin={editingKantin}
            onClose={() => {
              resetForm();
              setShowAddForm(false);
            }}
            onSubmit={handleSubmitKantin}
            isSubmitting={isSubmitting}
          />

          {isLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : kantins.length === 0 ? (
            <p className="text-gray-500 text-center py-4 sm:py-8">Belum ada akun kantin</p>
          ) : (
            <div className="relative overflow-x-auto bg-white shadow-sm rounded-lg border border-gray-200 -mx-3 sm:mx-0">
              <table className="w-full text-xs sm:text-sm text-left text-gray-700">
                <thead className="text-sm text-gray-700 bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-medium">
                      Nama Kantin
                    </th>
                    <th scope="col" className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-medium">
                      Deskripsi
                    </th>
                    <th scope="col" className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-medium">
                      Email
                    </th>
                    <th scope="col" className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-medium">
                      Spreadsheet
                    </th>
                    <th scope="col" className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-medium">
                      Tanggal Dibuat
                    </th>
                    <th scope="col" className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-medium">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {kantins.map((kantin, index) => (
                    <tr
                      key={kantin.id}
                      className={`bg-white border-b border-gray-200 hover:bg-gray-50 ${
                        index === kantins.length - 1 ? '' : 'border-b'
                      }`}
                    >
                      <th scope="row" className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-medium text-gray-900 whitespace-nowrap">
                        {kantin.name}
                      </th>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-gray-600 max-w-xs">
                        <div className="truncate" title={kantin.description || '-'}>
                          {kantin.description || '-'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-gray-600">
                        {kantin.email || '-'}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                        {kantin.spreadsheetUrl ? (
                          <a
                            href={kantin.spreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-unpas-blue hover:underline text-xs max-w-xs block truncate"
                            title={kantin.spreadsheetApiUrl}
                          >
                            {kantin.spreadsheetUrl.length > 40
                              ? `${kantin.spreadsheetUrl.substring(0, 40)}...`
                              : kantin.spreadsheetUrl}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-gray-600">
                        {new Date(kantin.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="flex items-center px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 gap-2 sm:gap-3">
                        <button
                          onClick={() => handleEditKantin(kantin)}
                          className="p-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <TbEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteKantin(kantin.id)}
                          className="p-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <LuTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

