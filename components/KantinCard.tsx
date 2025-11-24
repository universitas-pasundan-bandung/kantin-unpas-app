'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { KantinAccount } from '@/lib/kantin';

interface KantinCardProps {
  kantin: KantinAccount;
}

export default function KantinCard({ kantin }: KantinCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    console.error('Error loading cover image for kantin:', kantin.name, kantin.coverImage);
    setImageError(true);
  };

  return (
    <Link
      href={`/kantin/${kantin.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
    >
      <div className="h-48 bg-gradient-to-br from-unpas-blue/20 to-unpas-gold/20 flex items-center justify-center overflow-hidden relative">
        {kantin.coverImage && !imageError ? (
          <Image 
            src={kantin.coverImage} 
            alt={kantin.name} 
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={handleImageError}
            onLoad={() => {
              console.log('Cover image loaded successfully for kantin:', kantin.name);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-20 h-20 text-unpas-blue/50"
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
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-800">{kantin.name}</h3>
          {kantin.isOpen !== false && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              Buka
            </span>
          )}
          {kantin.isOpen === false && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              Tutup
            </span>
          )}
        </div>
        {kantin.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{kantin.description}</p>
        )}
        <div className="flex items-center gap-2 text-sm text-unpas-blue">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span>Lihat Menu</span>
        </div>
      </div>
    </Link>
  );
}

