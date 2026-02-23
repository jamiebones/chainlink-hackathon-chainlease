// app/dashboard/payments/page.tsx
// Payment Dashboard - Make rent payments and view transaction history

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { formatEther, parseEther } from 'viem';
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { PAYMENT_ESCROW_ADDRESS, PAYMENT_ESCROW_ABI, LEASE_AGREEMENT_ADDRESS, LEASE_AGREEMENT_ABI } from '@/lib/contracts';

interface Payment {
  amount: bigint;
  timestamp: bigint;
  isLate: boolean;
}

interface LeaseInfo {
  leaseId: string;
  propertyId: string;
  propertyAddress: string;
  landlord: string;
  rentAmount: bigint;
  nextPaymentDue: number;
  isOverdue: boolean;
  lateFee: bigint;
}

export default function PaymentDashboardPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [activeLeases, setActiveLeases] = useState<LeaseInfo[]>([]);
  const [selectedLease, setSelectedLease] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  const { data: hash, writeContract, isPending: isWritePending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    fetchPaymentData();
  }, [address, isConnected, router]);

  useEffect(() => {
    if (isConfirmed) {
      setTransactionStatus('success');
      setPaymentAmount('');
      setSelectedLease(null);
      // Refresh payment data
      setTimeout(() => {
        fetchPaymentData();
        setTransactionStatus('idle');
      }, 2000);
    }
  }, [isConfirmed]);

  const fetchPaymentData = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      // TODO: Fetch tenant's active leases from backend
      // const response = await fetch(`/api/leases?tenant=${address}&status=active`);
      // const data = await response.json();

      // Mock data for demonstration
      setActiveLeases([]);
      setPaymentHistory([]);

    } catch (err: any) {
      console.error('Error fetching payment data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = async () => {
    if (!selectedLease || !paymentAmount) {
      setError('Please select a lease and enter a payment amount');
      return;
    }

    try {
      setTransactionStatus('pending');
      setError(null);

      const lease = activeLeases.find((l) => l.leaseId === selectedLease);
      if (!lease) {
        throw new Error('Lease not found');
      }

      const amount = parseEther(paymentAmount);

      writeContract({
        address: PAYMENT_ESCROW_ADDRESS,
        abi: PAYMENT_ESCROW_ABI,
        functionName: 'makePayment',
        args: [BigInt(selectedLease)],
        value: amount,
      });
    } catch (err: any) {
      console.error('Error making payment:', err);
      setError(err.message);
      setTransactionStatus('error');
    }
  };

  const calculateDaysUntilPayment = (nextPaymentDue: number): number => {
    const now = Math.floor(Date.now() / 1000);
    const daysRemaining = Math.ceil((nextPaymentDue - now) / 86400);
    return daysRemaining;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600">
            Please connect your wallet to access the payment dashboard
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
          <p className="text-gray-600">Loading payment dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Dashboard</h1>
          <p className="text-gray-600">Make rent payments and manage your transactions</p>
        </div>

        {/* Success/Error Messages */}
        {transactionStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Payment successful! Transaction confirmed.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Make Payment Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Make Rent Payment
            </h2>

            {activeLeases.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                <p className="text-gray-600 mb-4">You don't have any active leases</p>
                <button
                  onClick={() => router.push('/properties')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Properties
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Lease
                  </label>
                  <select
                    value={selectedLease || ''}
                    onChange={(e) => {
                      setSelectedLease(e.target.value);
                      const lease = activeLeases.find((l) => l.leaseId === e.target.value);
                      if (lease) {
                        setPaymentAmount(formatEther(lease.rentAmount));
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a lease...</option>
                    {activeLeases.map((lease) => (
                      <option key={lease.leaseId} value={lease.leaseId}>
                        {lease.propertyAddress} - {formatEther(lease.rentAmount)} ETH/month
                      </option>
                    ))}
                  </select>
                </div>

                {selectedLease && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">Payment Details</h3>
                      {(() => {
                        const lease = activeLeases.find((l) => l.leaseId === selectedLease);
                        if (!lease) return null;

                        const daysUntil = calculateDaysUntilPayment(lease.nextPaymentDue);
                        const isOverdue = daysUntil < 0;

                        return (
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-blue-700">Monthly Rent:</span>
                              <span className="font-semibold text-blue-900">
                                {formatEther(lease.rentAmount)} ETH
                              </span>
                            </div>
                            {lease.lateFee > BigInt(0) && (
                              <div className="flex justify-between text-red-600">
                                <span>Late Fee:</span>
                                <span className="font-semibold">
                                  {formatEther(lease.lateFee)} ETH
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-blue-200">
                              <span className="text-blue-700">Payment Status:</span>
                              <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                                {isOverdue ? `Overdue by ${Math.abs(daysUntil)} days` : `Due in ${daysUntil} days`}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Amount (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum payment: {selectedLease && formatEther(activeLeases.find((l) => l.leaseId === selectedLease)?.rentAmount || BigInt(0))} ETH
                      </p>
                    </div>

                    <button
                      onClick={handleMakePayment}
                      disabled={isWritePending || isConfirming || !paymentAmount}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isWritePending || isConfirming ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          {isWritePending ? 'Confirm in Wallet...' : 'Processing...'}
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Make Payment
                        </>
                      )}
                    </button>

                    {hash && (
                      <div className="text-xs text-gray-600 text-center">
                        Transaction Hash:{' '}
                        <a
                          href={`https://sepolia.etherscan.io/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {hash.slice(0, 10)}...{hash.slice(-8)}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Payment Statistics */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Payment Statistics
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm text-green-700">Total Paid</p>
                    <p className="text-2xl font-bold text-green-900">0 ETH</p>
                  </div>
                  <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-blue-700">On-Time Payments</p>
                    <p className="text-2xl font-bold text-blue-900">0 / 0</p>
                  </div>
                  <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div>
                    <p className="text-sm text-purple-700">Average Payment</p>
                    <p className="text-2xl font-bold text-purple-900">0 ETH</p>
                  </div>
                  <svg className="w-10 h-10 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-md p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Payment Tips</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Pay rent on time to avoid late fees
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Set up reminders for payment due dates
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Keep gas fees for transactions ready
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Transaction receipts are stored on-chain
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Payment History
          </h2>

          {paymentHistory.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-600">No payment history yet</p>
              <p className="text-sm text-gray-500 mt-1">Your completed transactions will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(Number(payment.timestamp) * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {formatEther(payment.amount)} ETH
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {payment.isLate ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            Late
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            On Time
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button className="text-blue-600 hover:underline">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
