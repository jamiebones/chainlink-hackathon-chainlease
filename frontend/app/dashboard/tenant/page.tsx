// app/dashboard/tenant/page.tsx
// Tenant Dashboard - Browse properties, manage leases, and payments

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { formatEther } from 'viem';
import PropertyCard from '@/components/PropertyCard';
import { Property } from '@/types/property';

interface TenantLease {
  leaseId: string;
  propertyId: string;
  property: Property;
  landlord: string;
  rentAmount: string;
  depositAmount: string;
  startDate: number;
  endDate: number;
  nextPaymentDue: number;
  isActive: boolean;
  paymentStatus: 'current' | 'due' | 'overdue';
}

interface DashboardStats {
  activeLeases: number;
  upcomingPayments: number;
  totalSpent: string;
  creditCheckStatus: 'verified' | 'pending' | 'not-started';
}

export default function TenantDashboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [myLeases, setMyLeases] = useState<TenantLease[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeLeases: 0,
    upcomingPayments: 0,
    totalSpent: '0',
    creditCheckStatus: 'not-started',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-leases' | 'payments'>('browse');

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    fetchDashboardData();
  }, [address, isConnected, router]);

  const fetchDashboardData = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch available properties
      const propertiesResponse = await fetch(`/api/properties?status=available&limit=12`);
      const propertiesData = await propertiesResponse.json();

      if (propertiesData.success) {
        setAvailableProperties(propertiesData.data.properties);
      }

      // TODO: Fetch tenant's active leases
      // const leasesResponse = await fetch(`/api/leases?tenant=${address}`);

      // Mock stats for now
      setStats({
        activeLeases: 0,
        upcomingPayments: 0,
        totalSpent: '0',
        creditCheckStatus: 'not-started',
      });

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600">
            Please connect your wallet to access the tenant dashboard
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant Dashboard</h1>
          <p className="text-gray-600">Find your perfect rental and manage your lease</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Active Leases</h3>
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.activeLeases}</p>
            <p className="text-sm text-gray-500 mt-1">Current rentals</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Upcoming Payments</h3>
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.upcomingPayments}</p>
            <p className="text-sm text-gray-500 mt-1">Due soon</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Spent</h3>
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalSpent} ETH</p>
            <p className="text-sm text-gray-500 mt-1">In rent payments</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Credit Status</h3>
              {stats.creditCheckStatus === 'verified' ? (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 capitalize">{stats.creditCheckStatus}</p>
            <p className="text-sm text-gray-500 mt-1">Credit check</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-md p-6 mb-8 text-white">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/properties')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 transition-all text-left"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="font-semibold">Browse Properties</p>
              <p className="text-sm opacity-90">Find your next home</p>
            </button>

            <button
              onClick={() => router.push('/verify')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 transition-all text-left"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="font-semibold">Verify Identity</p>
              <p className="text-sm opacity-90">Complete World ID check</p>
            </button>

            <button
              onClick={() => router.push('/dashboard/payments')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 transition-all text-left"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="font-semibold">Make Payment</p>
              <p className="text-sm opacity-90">Pay rent online</p>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('browse')}
                className={`py-4 px-8 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'browse'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Browse Properties
              </button>
              <button
                onClick={() => setActiveTab('my-leases')}
                className={`py-4 px-8 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'my-leases'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Leases ({myLeases.length})
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-4 px-8 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'payments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Payment History
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {activeTab === 'browse' && (
          <div>
            {availableProperties.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Properties Available
                </h3>
                <p className="text-gray-600">
                  Check back later for new listings
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableProperties.map((property) => (
                  <PropertyCard key={property.tokenId} property={property} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-leases' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Active Leases
            </h3>
            <p className="text-gray-600 mb-6">
              You don't have any active leases yet
            </p>
            <button
              onClick={() => setActiveTab('browse')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Properties
            </button>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Payment History
            </h3>
            <p className="text-gray-600">
              Your payment transactions will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
