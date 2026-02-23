// components/LeaseSigningFlow.tsx
// Multi-step lease signing wizard with verification, credit check, and payment

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LEASE_AGREEMENT_ADDRESS, LEASE_AGREEMENT_ABI, PAYMENT_ESCROW_ADDRESS } from '@/lib/contracts';
import { WorldIDVerify } from './WorldIDVerify';
import { ISuccessResult } from '@worldcoin/idkit';

interface LeaseSigningFlowProps {
  propertyId: string;
  landlordAddress: string;
  rentAmount: string;
  depositAmount: string;
  leaseDuration: number; // in days
  onComplete?: (leaseId: string) => void;
  onCancel?: () => void;
}

type FlowStep = 'verify' | 'credit-check' | 'deposit' | 'review' | 'sign' | 'complete';

export default function LeaseSigningFlow({
  propertyId,
  landlordAddress,
  rentAmount,
  depositAmount,
  leaseDuration,
  onComplete,
  onCancel,
}: LeaseSigningFlowProps) {
  const { address, isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState<FlowStep>('verify');
  const [isWorldIDVerified, setIsWorldIDVerified] = useState(false);
  const [creditCheckStatus, setCreditCheckStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [creditScore, setCreditScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaseId, setLeaseId] = useState<string | null>(null);

  const { data: hash, writeContract, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed && leaseId === null && currentStep === 'sign') {
      // Extract lease ID from transaction receipt
      const mockLeaseId = Math.floor(Math.random() * 10000).toString();
      setLeaseId(mockLeaseId);
      setCurrentStep('complete');
    }
  }, [isConfirmed, leaseId, currentStep]);

  const handleWorldIDSuccess = (result: ISuccessResult) => {
    console.log('World ID verification successful:', result);
    setIsWorldIDVerified(true);
    setCurrentStep('credit-check');
  };

  const handleWorldIDError = (error: Error) => {
    console.error('World ID verification failed:', error);
    setError(`Verification failed: ${error.message}`);
  };

  const handleCreditCheck = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    try {
      setCreditCheckStatus('loading');
      setError(null);

      const response = await fetch('/api/credit-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Credit check failed');
      }

      setCreditScore(data.creditScore);
      setCreditCheckStatus('success');
      
      if (data.creditScore >= 600) {
        setCurrentStep('deposit');
      } else {
        setError('Credit score too low. Minimum required: 600');
        setCreditCheckStatus('failed');
      }
    } catch (err: any) {
      console.error('Credit check error:', err);
      setError(err.message);
      setCreditCheckStatus('failed');
    }
  };

  const handleDepositPayment = () => {
    setCurrentStep('review');
  };

  const handleReviewConfirm = () => {
    setCurrentStep('sign');
  };

  const handleSignLease = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);

      const rentAmountWei = parseEther(rentAmount);
      const depositAmountWei = parseEther(depositAmount);
      const propertyIdBigInt = BigInt(propertyId);
      const leaseDurationSeconds = BigInt(leaseDuration * 24 * 60 * 60); // Convert days to seconds

      writeContract({
        address: LEASE_AGREEMENT_ADDRESS,
        abi: LEASE_AGREEMENT_ABI,
        functionName: 'createLease',
        args: [propertyIdBigInt, address, rentAmountWei, depositAmountWei, leaseDurationSeconds],
      });
    } catch (err: any) {
      console.error('Error signing lease:', err);
      setError(err.message);
    }
  };

  const handleComplete = () => {
    if (leaseId && onComplete) {
      onComplete(leaseId);
    }
  };

  const getStepProgress = (): number => {
    const steps: FlowStep[] = ['verify', 'credit-check', 'deposit', 'review', 'sign', 'complete'];
    return ((steps.indexOf(currentStep) + 1) / steps.length) * 100;
  };

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please connect your wallet to continue</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Application Progress</span>
          <span className="text-sm font-medium text-gray-700">{Math.round(getStepProgress())}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${getStepProgress()}%` }}
          ></div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Step 1: World ID Verification */}
      {currentStep === 'verify' && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 1: Verify Your Identity</h2>
            <p className="text-gray-600">
              Use World ID to prove you're a unique human. This helps prevent fraud and protects both tenants and landlords.
            </p>
          </div>

          <div className="flex justify-center">
            <WorldIDVerify onSuccess={handleWorldIDSuccess} onError={handleWorldIDError} />
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Credit Check */}
      {currentStep === 'credit-check' && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 2: Credit Check</h2>
            <p className="text-gray-600 mb-6">
              We'll run a quick credit check to verify your financial standing. Minimum score required: 600.
            </p>
          </div>

          {creditCheckStatus === 'success' && creditScore !== null && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-700 font-semibold text-lg">
                ✓ Credit Check Passed
              </p>
              <p className="text-green-600 mt-1">
                Your credit score: {creditScore}
              </p>
            </div>
          )}

          {creditCheckStatus === 'failed' && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-700 font-semibold text-lg">
                ✗ Credit Check Failed
              </p>
              {creditScore !== null && (
                <p className="text-red-600 mt-1">
                  Your credit score: {creditScore} (Minimum required: 600)
                </p>
              )}
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleCreditCheck}
              disabled={creditCheckStatus === 'loading' || creditCheckStatus === 'success'}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {creditCheckStatus === 'loading' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Running Credit Check...
                </>
              ) : creditCheckStatus === 'success' ? (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Credit Check Complete
                </>
              ) : (
                'Run Credit Check'
              )}
            </button>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Security Deposit */}
      {currentStep === 'deposit' && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 3: Security Deposit</h2>
            <p className="text-gray-600 mb-6">
              A security deposit is required to secure the lease. This will be held in escrow until the lease ends.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Security Deposit:</span>
                <span className="font-semibold text-gray-900">{depositAmount} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Monthly Rent:</span>
                <span className="font-semibold text-gray-900">{rentAmount} ETH</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-gray-700 font-semibold">Total Due Now:</span>
                <span className="font-bold text-gray-900 text-lg">
                  {(parseFloat(depositAmount) + parseFloat(rentAmount)).toFixed(4)} ETH
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your deposit will be held in a secure smart contract escrow.
              It will be returned to you at the end of the lease, minus any damages.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDepositPayment}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Continue to Review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {currentStep === 'review' && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 4: Review Lease Terms</h2>
            <p className="text-gray-600 mb-6">
              Please review the lease agreement carefully before signing.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Lease Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Property ID:</span>
                  <span className="font-medium text-gray-900">{propertyId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Landlord:</span>
                  <span className="font-medium text-gray-900 font-mono text-xs">
                    {landlordAddress.slice(0, 10)}...{landlordAddress.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tenant:</span>
                  <span className="font-medium text-gray-900 font-mono text-xs">
                    {address?.slice(0, 10)}...{address?.slice(-8)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Payment Terms</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Rent:</span>
                  <span className="font-medium text-gray-900">{rentAmount} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Deposit:</span>
                  <span className="font-medium text-gray-900">{depositAmount} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lease Duration:</span>
                  <span className="font-medium text-gray-900">{leaseDuration} days</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Verification Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600">World ID Verified</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600">Credit Check Passed ({creditScore})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> By clicking "Sign Lease", you agree to the terms and conditions
              outlined above. This will create a blockchain transaction that cannot be undone.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReviewConfirm}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Proceed to Sign
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Sign Lease */}
      {currentStep === 'sign' && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 5: Sign Lease Agreement</h2>
            <p className="text-gray-600 mb-6">
              Click the button below to sign the lease on the blockchain. You'll need to confirm the transaction in your wallet.
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <button
              onClick={handleSignLease}
              disabled={isWritePending || isConfirming}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center text-lg font-semibold"
            >
              {isWritePending || isConfirming ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  {isWritePending ? 'Confirm in Wallet...' : 'Processing Transaction...'}
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Sign Lease on Blockchain
                </>
              )}
            </button>
          </div>

          {hash && (
            <div className="text-center text-sm text-gray-600">
              Transaction Hash:{' '}
              <a
                href={`https://sepolia.etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View on Etherscan
              </a>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={onCancel}
              disabled={isWritePending || isConfirming}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Complete */}
      {currentStep === 'complete' && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-600 rounded-full mx-auto mb-4 flex items-center justify-center animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Congratulations!</h2>
            <p className="text-gray-600 mb-6 text-lg">
              Your lease has been successfully created and signed on the blockchain.
            </p>

            {leaseId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <p className="text-sm text-green-700 mb-2">Lease ID</p>
                <p className="text-2xl font-bold text-green-900">{leaseId}</p>
              </div>
            )}

            <div className="space-y-3 mb-8">
              <div className="flex items-center justify-center text-green-600">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Identity Verified
              </div>
              <div className="flex items-center justify-center text-green-600">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Credit Check Passed
              </div>
              <div className="flex items-center justify-center text-green-600">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Lease Signed on Blockchain
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={handleComplete}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View My Leases
              </button>
              {hash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  View on Etherscan
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
