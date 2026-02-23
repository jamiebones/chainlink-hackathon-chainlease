// app/dashboard/landlord/page.tsx
// Landlord Dashboard - Manage properties, leases, and applications

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { formatEther } from 'viem';
import PropertyCard from '@/components/PropertyCard';
import { Property } from '@/types/property';

interface LeaseApplication {
  leaseId: string;
  propertyId: string;
  tenant: string;
  rentAmount: string;
  depositAmount: string;
  creditCheckPassed: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

interface DashboardStats {
  totalProperties: number;
  activeLeases: number;
  pendingApplications: number;
  monthlyIncome: string;
  totalRevenue: string;
}

export default function LandlordDashboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [applications, setApplications] = useState<LeaseApplication[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    activeLeases: 0,
    pendingApplications: 0,
    monthlyIncome: '0',
    totalRevenue: '0',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'properties' | 'applications' | 'leases'>('properties');

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

      // Fetch properties owned by landlord
      const propertiesResponse = await fetch(`/api/properties?owner=${address}`);
      const propertiesData = await propertiesResponse.json();

      if (propertiesData.success) {
        setProperties(propertiesData.data.properties);

        // Calculate stats
        const totalProps = propertiesData.data.properties.length;
        const activeLeases = propertiesData.data.properties.filter(
          (p: Property) => p.status === 'leased'
        ).length;

        setStats({
          totalProperties: totalProps,
          activeLeases,
          pendingApplications: 0, // TODO: Fetch from leases
          monthlyIncome: '0', // TODO: Calculate from active leases
          totalRevenue: '0', // TODO: Calculate from payment history
        });
      }

      // TODO: Fetch pending applications
      // const applicationsResponse = await fetch(`/api/leases/applications?landlord=${address}`);

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
            Please connect your wallet to access the landlord dashboard
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Landlord Dashboard</h1>
          <p className="text-gray-600">Manage your properties and rental agreements</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Properties</h3>
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalProperties}</p>
            <p className="text-sm text-gray-500 mt-1">Listed properties</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Active Leases</h3>
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.activeLeases}</p>
            <p className="text-sm text-gray-500 mt-1">Currently rented</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Pending Applications</h3>
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingApplications}</p>
            <p className="text-sm text-gray-500 mt-1">Awaiting review</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Monthly Income</h3>
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.monthlyIncome} ETH</p>
            <p className="text-sm text-gray-500 mt-1">Expected revenue</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('properties')}
                className={`py-4 px-8 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'properties'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Properties ({properties.length})
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`py-4 px-8 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'applications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Applications ({applications.length})
              </button>
              <button
                onClick={() => setActiveTab('leases')}
                className={`py-4 px-8 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'leases'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active Leases ({stats.activeLeases})
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

        {activeTab === 'properties' && (
          <div>
            {properties.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Properties Listed
                </h3>
                <p className="text-gray-600 mb-6">
                  Start earning rental income by listing your first property
                </p>
                <button
                  onClick={() => router.push('/list-property')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  List a Property
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <PropertyCard key={property.tokenId} property={property} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Pending Applications
            </h3>
            <p className="text-gray-600">
              Applications will appear here when tenants apply for your properties
            </p>
          </div>
        )}

        {activeTab === 'leases' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Active Leases
            </h3>
            <p className="text-gray-600">
              Active leases will appear here once tenants move in
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
