// app/my-leases/page.tsx
// User's leases dashboard - both as landlord and tenant

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { formatEther, parseEther } from 'viem';
import { Property } from '@/types/property';

interface Lease {
  leaseId: string;
  propertyId: string;
  property: Property;
  role: 'landlord' | 'tenant';
  tenant: string;
  landlord: string;
  rentAmount: string;
  depositAmount: string;
  startDate: number;
  endDate: number;
  isActive: boolean;
  lastPaymentDate?: number;
  nextPaymentDue?: number;
}

export default function MyLeasesPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord'>('tenant');

  useEffect(() => {
    const fetchLeases = async () => {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch properties where user is landlord
        const landlordResponse = await fetch(`/api/properties?owner=${address}`);
        const landlordData = await landlordResponse.json();

        // Fetch properties where user is tenant (would need to add this endpoint)
        // For now, we'll just show landlord properties
        
        // Mock lease data - in production, this would come from blockchain
        const mockLeases: Lease[] = landlordData.success ? landlordData.data
          .filter((p: Property) => p.status === 'leased' && p.currentLeaseId)
          .map((p: Property) => ({
            leaseId: p.currentLeaseId || '1',
            propertyId: p.tokenId || '',
            property: p,
            role: 'landlord',
            tenant: '0x0000000000000000000000000000000000000001',
            landlord: address,
            rentAmount: p.pricing.rentAmount,
            depositAmount: p.pricing.depositAmount,
            startDate: Date.now() / 1000,
            endDate: (Date.now() / 1000) + (365 * 24 * 60 * 60),
            isActive: true,
            nextPaymentDue: (Date.now() / 1000) + (30 * 24 * 60 * 60),
          })) : [];

        setLeases(mockLeases);
      } catch (err: any) {
        console.error('Error fetching leases:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeases();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Wallet Not Connected</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to view your leases</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your leases...</p>
        </div>
      </div>
    );
  }

  const landlordLeases = leases.filter(l => l.role === 'landlord');
  const tenantLeases = leases.filter(l => l.role === 'tenant');
  const displayLeases = activeTab === 'landlord' ? landlordLeases : tenantLeases;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Leases</h1>
          <p className="text-gray-600">Manage your properties and rental agreements</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('tenant')}
                className={`py-4 px-8 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'tenant'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                As Tenant ({tenantLeases.length})
              </button>
              <button
                onClick={() => setActiveTab('landlord')}
                className={`py-4 px-8 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'landlord'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                As Landlord ({landlordLeases.length})
              </button>
            </nav>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 mb-1">Active Leases</p>
              <p className="text-2xl font-bold text-blue-900">
                {displayLeases.filter(l => l.isActive).length}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 mb-1">Total Properties</p>
              <p className="text-2xl font-bold text-green-900">
                {displayLeases.length}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 mb-1">Monthly {activeTab === 'landlord' ? 'Income' : 'Expenses'}</p>
              <p className="text-2xl font-bold text-purple-900">
                {displayLeases
                  .filter(l => l.isActive)
                  .reduce((sum, l) => sum + parseFloat(formatEther(BigInt(l.rentAmount))), 0)
                  .toFixed(4)} ETH
              </p>
            </div>
          </div>
        </div>

        {/* Leases List */}
        {displayLeases.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {activeTab === 'landlord' ? 'Properties' : 'Leases'} Yet
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'landlord' 
                ? "You haven't listed any properties yet"
                : "You don't have any active leases"
              }
            </p>
            <button
              onClick={() => router.push(activeTab === 'landlord' ? '/list-property' : '/properties')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {activeTab === 'landlord' ? 'List a Property' : 'Browse Properties'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {displayLeases.map((lease) => (
              <LeaseCard
                key={lease.leaseId}
                lease={lease}
                role={activeTab}
                onPayRent={(leaseId) => console.log('Pay rent:', leaseId)}
                onViewProperty={(propertyId) => router.push(`/properties/${propertyId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Lease Card Component
function LeaseCard({ 
  lease, 
  role, 
  onPayRent, 
  onViewProperty 
}: { 
  lease: Lease; 
  role: 'tenant' | 'landlord';
  onPayRent: (leaseId: string) => void;
  onViewProperty: (propertyId: string) => void;
}) {
  const rentInEth = formatEther(BigInt(lease.rentAmount));
  const depositInEth = formatEther(BigInt(lease.depositAmount));
  
  const startDate = new Date(lease.startDate * 1000);
  const endDate = new Date(lease.endDate * 1000);
  const nextPaymentDate = lease.nextPaymentDue ? new Date(lease.nextPaymentDue * 1000) : null;
  
  const daysUntilPayment = nextPaymentDate 
    ? Math.ceil((nextPaymentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const isPaymentDue = daysUntilPayment <= 7;
  const isOverdue = daysUntilPayment < 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Property Image */}
        <div className="w-full md:w-48 h-48 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
          {lease.property.metadata.images[0] ? (
            <img
              src={lease.property.metadata.images[0].url}
              alt={lease.property.metadata.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
              <svg className="w-16 h-16 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Lease Details */}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {lease.property.metadata.name}
              </h3>
              <p className="text-sm text-gray-600">
                {lease.property.metadata.address.street}, {lease.property.metadata.address.city}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                lease.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {lease.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                {role === 'landlord' ? 'Landlord' : 'Tenant'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Monthly Rent</p>
              <p className="font-semibold text-gray-900">
                {parseFloat(rentInEth).toFixed(4)} ETH
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Security Deposit</p>
              <p className="font-semibold text-gray-900">
                {parseFloat(depositInEth).toFixed(4)} ETH
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Lease Start</p>
              <p className="font-semibold text-gray-900">
                {startDate.toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Lease End</p>
              <p className="font-semibold text-gray-900">
                {endDate.toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Payment Status */}
          {role === 'tenant' && nextPaymentDate && (
            <div className={`rounded-lg p-4 mb-4 ${
              isOverdue ? 'bg-red-50 border border-red-200' :
              isPaymentDue ? 'bg-yellow-50 border border-yellow-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-sm font-semibold ${
                    isOverdue ? 'text-red-900' :
                    isPaymentDue ? 'text-yellow-900' :
                    'text-blue-900'
                  }`}>
                    {isOverdue ? '⚠️ Payment Overdue' :
                     isPaymentDue ? '⏰ Payment Due Soon' :
                     '✓ Payment Up to Date'}
                  </p>
                  <p className={`text-xs ${
                    isOverdue ? 'text-red-700' :
                    isPaymentDue ? 'text-yellow-700' :
                    'text-blue-700'
                  }`}>
                    Next payment: {nextPaymentDate.toLocaleDateString()} ({daysUntilPayment} days)
                  </p>
                </div>
                <button
                  onClick={() => onPayRent(lease.leaseId)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    isOverdue ? 'bg-red-600 hover:bg-red-700 text-white' :
                    isPaymentDue ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                    'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Pay Rent
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => onViewProperty(lease.propertyId)}
              className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
            >
              View Property
            </button>
            <button
              onClick={() => {}}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Lease Details
            </button>
            {role === 'landlord' && (
              <button
                onClick={() => {}}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Payment History
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
