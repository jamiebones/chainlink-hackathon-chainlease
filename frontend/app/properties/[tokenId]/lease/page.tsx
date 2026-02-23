// app/properties/[tokenId]/lease/page.tsx
// Lease application and creation page

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useParams, useRouter } from 'next/navigation';
import { parseEther } from 'viem';
import { Property } from '@/types/property';
import { usePropertyContract, usePropertyOwner } from '@/hooks/usePropertyContract';

export default function LeaseApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const tokenId = params?.tokenId as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [leaseDuration, setLeaseDuration] = useState(12); // months
  const [tenantAddress, setTenantAddress] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Contract hooks
  const { createLease, isLoading: contractLoading, error: contractError } = usePropertyContract();
  const tokenIdBigInt = tokenId ? BigInt(tokenId) : undefined;
  const { data: onChainOwner } = usePropertyOwner(tokenIdBigInt);

  const isOwner = address && onChainOwner && address.toLowerCase() === (onChainOwner as string).toLowerCase();

  // Fetch property data
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

  // Set tenant address to connected wallet by default
  useEffect(() => {
    if (address && !isOwner) {
      setTenantAddress(address);
    }
  }, [address, isOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!property || !address || !isConnected) {
      alert('Please connect your wallet to continue');
      return;
    }

    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    if (leaseDuration < property.leaseTerms.minLeaseTerm || leaseDuration > property.leaseTerms.maxLeaseTerm) {
      alert(`Lease duration must be between ${property.leaseTerms.minLeaseTerm} and ${property.leaseTerms.maxLeaseTerm} months`);
      return;
    }

    if (!tenantAddress || !/^0x[a-fA-F0-9]{40}$/.test(tenantAddress)) {
      alert('Please provide a valid tenant address');
      return;
    }

    try {
      setSubmitting(true);

      // Create lease on-chain
      console.log('Creating lease on blockchain...');
      const leaseResult = await createLease(
        BigInt(tokenId),
        tenantAddress as `0x${string}`,
        BigInt(property.pricing.rentAmount),
        BigInt(property.pricing.depositAmount),
        BigInt(leaseDuration)
      );

      console.log('Lease created:', leaseResult);

      // Update property status in database
      console.log('Updating property status...');
      const updateResponse = await fetch(`/api/properties/${tokenId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'leased',
          currentLeaseId: leaseResult.leaseId.toString(),
        }),
      });

      const updateData = await updateResponse.json();

      if (!updateData.success) {
        console.error('Failed to update property status:', updateData.error);
        // Don't throw - lease was created successfully on-chain
      }

      // Success
      alert('Lease created successfully! The lease agreement is now on-chain.');
      router.push(`/my-leases`);

    } catch (err: any) {
      console.error('Error creating lease:', err);
      alert(`Failed to create lease: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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

  if (property.status !== 'available') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Not Available</h2>
          <p className="text-gray-600 mb-6">This property is currently {property.status}</p>
          <button
            onClick={() => router.push(`/properties/${tokenId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Property
          </button>
        </div>
      </div>
    );
  }

  const rentInEth = parseFloat((BigInt(property.pricing.rentAmount) / BigInt(1e18)).toString());
  const depositInEth = parseFloat((BigInt(property.pricing.depositAmount) / BigInt(1e18)).toString());
  const totalDue = depositInEth + rentInEth;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/properties/${tokenId}`)}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Property
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isOwner ? 'Create Lease Agreement' : 'Apply for Lease'}
          </h1>
          <p className="text-gray-600 mb-8">
            {property.metadata.name}
          </p>

          {/* Property Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-blue-900 mb-4">Lease Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Monthly Rent</p>
                <p className="text-xl font-bold text-gray-900">
                  {rentInEth.toFixed(4)} {property.pricing.currency}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Security Deposit</p>
                <p className="text-xl font-bold text-gray-900">
                  {depositInEth.toFixed(4)} {property.pricing.currency}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Allowed Duration</p>
                <p className="font-semibold text-gray-900">
                  {property.leaseTerms.minLeaseTerm} - {property.leaseTerms.maxLeaseTerm} months
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Grace Period</p>
                <p className="font-semibold text-gray-900">
                  {property.leaseTerms.gracePeriodDays} days
                </p>
              </div>
            </div>
          </div>

          {/* Lease Application Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tenant Address (editable for owner) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tenant Wallet Address
              </label>
              <input
                type="text"
                value={tenantAddress}
                onChange={(e) => setTenantAddress(e.target.value)}
                placeholder="0x..."
                disabled={!isOwner}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                required
              />
              {!isOwner && (
                <p className="mt-1 text-xs text-gray-500">
                  This is your connected wallet address
                </p>
              )}
            </div>

            {/* Lease Duration */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lease Duration (months)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={property.leaseTerms.minLeaseTerm}
                  max={property.leaseTerms.maxLeaseTerm}
                  value={leaseDuration}
                  onChange={(e) => setLeaseDuration(parseInt(e.target.value))}
                  className="flex-1"
                />
                <div className="w-20 px-4 py-2 border border-gray-300 rounded-lg text-center font-semibold">
                  {leaseDuration}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Move the slider to select lease duration
              </p>
            </div>

            {/* Total Due */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Payment Summary</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">First Month Rent:</span>
                  <span className="font-semibold">{rentInEth.toFixed(4)} {property.pricing.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Deposit:</span>
                  <span className="font-semibold">{depositInEth.toFixed(4)} {property.pricing.currency}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">Total Due:</span>
                    <span className="text-xl font-bold text-gray-900">
                      {totalDue.toFixed(4)} {property.pricing.currency}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                ℹ️ Payment will be held in escrow and released according to the lease terms
              </p>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-900 mb-3">Important Notice</h3>
              <ul className="space-y-2 text-sm text-yellow-800 mb-4">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>This lease agreement will be recorded on the blockchain and is legally binding</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Rent payments must be made on time to avoid late fees</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Security deposit will be returned at the end of the lease minus any damages</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Early termination may result in penalties unless explicitly allowed</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>You will need to approve the transaction in your wallet</span>
                </li>
              </ul>

              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 mr-3"
                />
                <span className="text-sm text-gray-700">
                  I have read and agree to the lease terms and conditions, and I understand that this creates a legally binding agreement on the blockchain
                </span>
              </label>
            </div>

            {/* Error Display */}
            {contractError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{contractError}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isConnected || submitting || contractLoading || !agreedToTerms}
              className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {!isConnected ? 'Connect Wallet to Continue' :
               submitting || contractLoading ? 'Creating Lease...' :
               isOwner ? 'Create Lease Agreement' :
               'Submit Application & Create Lease'}
            </button>

            {(submitting || contractLoading) && (
              <div className="text-center text-sm text-gray-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Processing transaction... Please confirm in your wallet</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
