// app/leases/[leaseId]/page.tsx
// Individual lease details page with full lease information and actions

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { useReadContract } from 'wagmi';
import { LEASE_AGREEMENT_ADDRESS, LEASE_AGREEMENT_ABI } from '@/lib/contracts';

enum LeaseState {
  Draft = 0,
  PendingApproval = 1,
  Active = 2,
  Completed = 3,
  Terminated = 4,
  Disputed = 5,
}

interface LeaseDetails {
  propertyId: bigint;
  landlord: string;
  tenant: string;
  rentAmount: bigint;
  depositAmount: bigint;
  startDate: bigint;
  endDate: bigint;
  status: LeaseState;
}

export default function LeaseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const leaseId = params.leaseId as string;

  const [lease, setLease] = useState<LeaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'payments' | 'documents' | 'actions'>('details');

  // Read lease details from smart contract
  const { data: leaseData, isError, refetch } = useReadContract({
    address: LEASE_AGREEMENT_ADDRESS,
    abi: LEASE_AGREEMENT_ABI,
    functionName: 'getLeaseDetails',
    args: [BigInt(leaseId)],
  });

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }

    if (leaseData) {
      const [propertyId, landlord, tenant, rentAmount, depositAmount, startDate, endDate, status] = leaseData as [
        bigint,
        string,
        string,
        bigint,
        bigint,
        bigint,
        bigint,
        number
      ];

      setLease({
        propertyId,
        landlord,
        tenant,
        rentAmount,
        depositAmount,
        startDate,
        endDate,
        status,
      });
      setLoading(false);
    }

    if (isError) {
      setError('Failed to load lease details');
      setLoading(false);
    }
  }, [leaseData, isError, isConnected, router]);

  const getStatusColor = (status: LeaseState): string => {
    switch (status) {
      case LeaseState.Draft:
        return 'bg-gray-100 text-gray-800';
      case LeaseState.PendingApproval:
        return 'bg-yellow-100 text-yellow-800';
      case LeaseState.Active:
        return 'bg-green-100 text-green-800';
      case LeaseState.Completed:
        return 'bg-blue-100 text-blue-800';
      case LeaseState.Terminated:
        return 'bg-red-100 text-red-800';
      case LeaseState.Disputed:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: LeaseState): string => {
    switch (status) {
      case LeaseState.Draft:
        return 'Draft';
      case LeaseState.PendingApproval:
        return 'Pending Approval';
      case LeaseState.Active:
        return 'Active';
      case LeaseState.Completed:
        return 'Completed';
      case LeaseState.Terminated:
        return 'Terminated';
      case LeaseState.Disputed:
        return 'Disputed';
      default:
        return 'Unknown';
    }
  };

  const calculateDaysRemaining = (): number => {
    if (!lease) return 0;
    const now = Math.floor(Date.now() / 1000);
    const endTimestamp = Number(lease.endDate);
    const daysRemaining = Math.ceil((endTimestamp - now) / 86400);
    return Math.max(0, daysRemaining);
  };

  const calculateProgress = (): number => {
    if (!lease) return 0;
    const now = Math.floor(Date.now() / 1000);
    const start = Number(lease.startDate);
    const end = Number(lease.endDate);
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const isLandlord = address && lease && address.toLowerCase() === lease.landlord.toLowerCase();
  const isTenant = address && lease && address.toLowerCase() === lease.tenant.toLowerCase();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to view lease details</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lease details...</p>
        </div>
      </div>
    );
  }

  if (error || !lease) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Lease Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested lease could not be found'}</p>
          <button
            onClick={() => router.push('/my-leases')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View My Leases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Lease #{leaseId}</h1>
              <p className="text-gray-600">Property ID: {lease.propertyId.toString()}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(lease.status)}`}>
              {getStatusLabel(lease.status)}
            </span>
          </div>
        </div>

        {/* Role Badge */}
        {(isLandlord || isTenant) && (
          <div className="mb-6">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isLandlord ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              You are the {isLandlord ? 'Landlord' : 'Tenant'}
            </span>
          </div>
        )}

        {/* Lease Progress (Active Leases Only) */}
        {lease.status === LeaseState.Active && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Lease Progress</h3>
                <p className="text-sm text-gray-600">{calculateDaysRemaining()} days remaining</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{Math.round(calculateProgress())}%</p>
                <p className="text-sm text-gray-600">Complete</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-8 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Lease Details
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
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-8 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Documents
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`py-4 px-8 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'actions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Actions
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Parties */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Parties
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Landlord</p>
                  <p className="font-mono text-sm text-gray-900 break-all">{lease.landlord}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tenant</p>
                  <p className="font-mono text-sm text-gray-900 break-all">{lease.tenant}</p>
                </div>
              </div>
            </div>

            {/* Financial Terms */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Financial Terms
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600">Monthly Rent</span>
                  <span className="font-semibold text-gray-900 text-lg">{formatEther(lease.rentAmount)} ETH</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600">Security Deposit</span>
                  <span className="font-semibold text-gray-900 text-lg">{formatEther(lease.depositAmount)} ETH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Value</span>
                  <span className="font-bold text-gray-900 text-xl">
                    {formatEther(lease.rentAmount + lease.depositAmount)} ETH
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Lease Timeline
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Start Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(Number(lease.startDate) * 1000).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">End Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(Number(lease.endDate) * 1000).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="font-semibold text-gray-900">
                    {Math.ceil(Number(lease.endDate - lease.startDate) / 86400)} days
                  </p>
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Property Information
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Property ID</p>
                  <p className="font-semibold text-gray-900">{lease.propertyId.toString()}</p>
                </div>
                <button
                  onClick={() => router.push(`/properties/${lease.propertyId.toString()}`)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Property Details
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment History</h3>
            <p className="text-gray-600 mb-6">Payment records for this lease will appear here</p>
            {isTenant && (
              <button
                onClick={() => router.push('/dashboard/payments')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Make a Payment
              </button>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Lease Documents</h3>
            <p className="text-gray-600">Lease agreements and related documents will be stored here</p>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Actions</h3>
            
            {lease.status === LeaseState.Active && (
              <div className="space-y-3">
                {isTenant && (
                  <button
                    onClick={() => router.push('/dashboard/payments')}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Make Rent Payment
                  </button>
                )}
                
                {(isLandlord || isTenant) && (
                  <>
                    <button
                      className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center"
                      disabled
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      File Dispute
                    </button>

                    <button
                      className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                      disabled
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Terminate Lease
                    </button>
                  </>
                )}
              </div>
            )}

            {lease.status !== LeaseState.Active && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600">No actions available for {getStatusLabel(lease.status).toLowerCase()} leases</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
