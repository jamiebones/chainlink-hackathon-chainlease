// app/properties/[tokenId]/page.tsx
// Property detail page with blockchain data

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatEther } from 'viem';
import { Property } from '@/types/property';
import { usePropertyContract, usePropertyOwner, usePropertyTokenURI } from '@/hooks/usePropertyContract';

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const tokenId = params?.tokenId as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Read on-chain data
  const tokenIdBigInt = tokenId ? BigInt(tokenId) : undefined;
  const { data: onChainOwner, isLoading: ownerLoading } = usePropertyOwner(tokenIdBigInt);
  const { data: onChainTokenURI, isLoading: uriLoading } = usePropertyTokenURI(tokenIdBigInt);

  // Fetch property data from database
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/properties/${tokenId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch property');
        }

        setProperty(data.data);
      } catch (err: any) {
        console.error('Error fetching property:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (tokenId) {
      fetchProperty();
    }
  }, [tokenId]);

  if (loading || ownerLoading || uriLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'This property does not exist'}</p>
          <button
            onClick={() => router.push('/properties')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Properties
          </button>
        </div>
      </div>
    );
  }

  const isOwner = address && onChainOwner && address.toLowerCase() === (onChainOwner as string).toLowerCase();
  const rentInEth = formatEther(BigInt(property.pricing.rentAmount));
  const depositInEth = formatEther(BigInt(property.pricing.depositAmount));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/properties')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Properties
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative h-96 w-full bg-gray-200 rounded-lg overflow-hidden">
              {property.metadata.images[activeImageIndex] ? (
                <Image
                  src={property.metadata.images[activeImageIndex].url}
                  alt={property.metadata.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                  <svg className="w-24 h-24 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {property.metadata.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {property.metadata.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative h-24 rounded-lg overflow-hidden ${
                      activeImageIndex === index ? 'ring-2 ring-blue-600' : ''
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Blockchain Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Blockchain Verified
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Token ID:</span>
                  <span className="ml-2 font-mono text-gray-900">{tokenId}</span>
                </div>
                <div>
                  <span className="text-gray-600">Owner:</span>
                  <span className="ml-2 font-mono text-gray-900 text-xs">
                    {onChainOwner ? `${(onChainOwner as string).slice(0, 6)}...${(onChainOwner as string).slice(-4)}` : 'N/A'}
                  </span>
                </div>
                {onChainTokenURI && (
                  <div>
                    <span className="text-gray-600">Metadata:</span>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${(onChainTokenURI as string).replace('ipfs://', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 hover:underline text-xs"
                    >
                      View on IPFS
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
                  {property.metadata.propertyType.charAt(0).toUpperCase() + property.metadata.propertyType.slice(1)}
                </span>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  property.status === 'available' ? 'bg-green-100 text-green-800' :
                  property.status === 'leased' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                </span>
                {isOwner && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                    You Own This
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {property.metadata.name}
              </h1>
              <p className="text-gray-600 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {property.metadata.address.street}, {property.metadata.address.city}, {property.metadata.address.state} {property.metadata.address.postalCode}
              </p>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pricing</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Monthly Rent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {parseFloat(rentInEth).toFixed(4)} {property.pricing.currency}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm mb-1">Security Deposit</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {parseFloat(depositInEth).toFixed(4)} {property.pricing.currency}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{property.metadata.description}</p>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Features</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {property.metadata.features.bedrooms !== undefined && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span>{property.metadata.features.bedrooms} Bedrooms</span>
                  </div>
                )}
                {property.metadata.features.bathrooms !== undefined && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-4 4 4V6z" clipRule="evenodd" />
                    </svg>
                    <span>{property.metadata.features.bathrooms} Bathrooms</span>
                  </div>
                )}
                {property.metadata.features.squareFeet && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <span>{property.metadata.features.squareFeet.toLocaleString()} sqft</span>
                  </div>
                )}
                {property.metadata.features.parking !== undefined && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                    </svg>
                    <span>{property.metadata.features.parking} Parking</span>
                  </div>
                )}
              </div>

              {property.metadata.features.amenities.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.metadata.features.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-4">
                {property.metadata.features.furnished && (
                  <span className="flex items-center text-sm text-gray-700">
                    ✅ Furnished
                  </span>
                )}
                {property.metadata.features.petFriendly && (
                  <span className="flex items-center text-sm text-gray-700">
                    🐾 Pet Friendly
                  </span>
                )}
              </div>
            </div>

            {/* Lease Terms */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Lease Terms</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Lease Duration:</span>
                  <span className="font-semibold">
                    {property.leaseTerms.minLeaseTerm} - {property.leaseTerms.maxLeaseTerm} {property.leaseTerms.termUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Grace Period:</span>
                  <span className="font-semibold">{property.leaseTerms.gracePeriodDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Renewal Options:</span>
                  <span className="font-semibold">{property.leaseTerms.renewalOptions ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Early Termination:</span>
                  <span className="font-semibold">{property.leaseTerms.earlyTerminationAllowed ? 'Allowed' : 'Not Allowed'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isOwner && property.status === 'available' && (
              <button
                onClick={() => router.push(`/properties/${tokenId}/lease`)}
                disabled={!isConnected}
                className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isConnected ? 'Apply for Lease' : 'Connect Wallet to Apply'}
              </button>
            )}

            {isOwner && (
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/properties/${tokenId}/edit`)}
                  className="flex-1 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Edit Property
                </button>
                <button
                  onClick={() => {}}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Manage Leases
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
