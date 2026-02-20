'use client';

import { WorldIDVerify } from '@/components/WorldIDVerify';
import { ISuccessResult } from '@worldcoin/idkit';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSuccess = async (result: ISuccessResult) => {
    console.log('World ID verification successful!', result);
    setIsVerified(true);
    setError(null);

    // Optionally link verification to user account
    if (address) {
      try {
        await fetch('/api/users/link-world-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: address,
            nullifier_hash: result.nullifier_hash,
          }),
        });
      } catch (err) {
        console.error('Failed to link World ID to account:', err);
      }
    }

    // Redirect after successful verification
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  const handleError = (error: Error) => {
    console.error('World ID verification failed:', error);
    setError(error.message);
    setIsVerified(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center pt-16 px-4">
      <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Verify Your Identity
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              ChainLease uses World ID to ensure one person, one account.
              This helps prevent fraud and maintain trust in our platform.
            </p>
          </div>

          {!isConnected && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
              <p className="text-yellow-800 dark:text-yellow-200 text-center">
                ⚠️ Please connect your wallet first to continue
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
            {isVerified ? (
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold mb-2 text-green-600 dark:text-green-400">
                  Verification Successful!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Redirecting you to the platform...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <WorldIDVerify
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
                
                {error && (
                  <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 w-full">
                    <p className="text-red-800 dark:text-red-200 text-center">
                      ❌ {error}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="font-semibold mb-3">Why World ID?</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>✓ Proof of personhood without revealing personal information</li>
              <li>✓ Prevents duplicate accounts and fraud</li>
              <li>✓ No KYC required - privacy preserved</li>
              <li>✓ One verification per person, forever</li>
            </ul>
          </div>
        </div>
      </main>
  );
}
