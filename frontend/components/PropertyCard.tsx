// components/PropertyCard.tsx
// Property card component for grid/list views

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Property, PropertyType } from '@/types/property';
import { formatEther } from 'viem';

interface PropertyCardProps {
  property: Property;
  compact?: boolean;
}

export default function PropertyCard({ property, compact = false }: PropertyCardProps) {
  const { tokenId, metadata, pricing, status } = property;
  const primaryImage = metadata.images.find(img => img.isPrimary) || metadata.images[0];

  // Format rent amount
  const rentInEth = formatEther(BigInt(pricing.rentAmount));
  const depositInEth = formatEther(BigInt(pricing.depositAmount));

  // Status badge
  const statusColors = {
    available: 'bg-green-100 text-green-800',
    leased: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    unavailable: 'bg-gray-100 text-gray-800',
  };

  // Property type badge
  const typeColors: Record<PropertyType, string> = {
    residential: 'bg-purple-100 text-purple-800',
    commercial: 'bg-orange-100 text-orange-800',
    industrial: 'bg-gray-100 text-gray-800',
    land: 'bg-green-100 text-green-800',
  };

  return (
    <Link href={`/properties/${tokenId}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer">
        {/* Image */}
        <div className="relative h-48 w-full bg-gray-200">
          {primaryImage?.url ? (
            <Image
              src={primaryImage.url}
              alt={metadata.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
              <svg className="w-20 h-20 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          
          {/* Status badge */}
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>

          {/* Property type badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${typeColors[metadata.propertyType]}`}>
              {metadata.propertyType.charAt(0).toUpperCase() + metadata.propertyType.slice(1)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
            {metadata.name}
          </h3>

          {/* Location */}
          <p className="text-sm text-gray-600 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {metadata.address.city}, {metadata.address.state}
          </p>

          {/* Features */}
          {!compact && metadata.features && (
            <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
              {metadata.features.bedrooms !== undefined && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <span>{metadata.features.bedrooms} beds</span>
                </div>
              )}
              {metadata.features.bathrooms !== undefined && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-4 4 4V6z" clipRule="evenodd" />
                  </svg>
                  <span>{metadata.features.bathrooms} baths</span>
                </div>
              )}
              {metadata.features.squareFeet && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span>{metadata.features.squareFeet.toLocaleString()} sqft</span>
                </div>
              )}
            </div>
          )}

          {/* Amenities */}
          {!compact && metadata.features.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {metadata.features.amenities.slice(0, 3).map((amenity, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {amenity}
                </span>
              ))}
              {metadata.features.amenities.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  +{metadata.features.amenities.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Pricing */}
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">Monthly Rent</p>
                <p className="text-xl font-bold text-gray-900">
                  {parseFloat(rentInEth).toFixed(4)} {pricing.currency}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Deposit</p>
                <p className="text-sm font-semibold text-gray-700">
                  {parseFloat(depositInEth).toFixed(4)} {pricing.currency}
                </p>
              </div>
            </div>
          </div>

          {/* Additional info */}
          {!compact && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-gray-500">
              <div className="flex items-center gap-3">
                {metadata.features.petFriendly && (
                  <span className="flex items-center">
                    🐾 Pet Friendly
                  </span>
                )}
                {metadata.features.furnished && (
                  <span className="flex items-center">
                    🛋️ Furnished
                  </span>
                )}
              </div>
              <span>{property.views} views</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
