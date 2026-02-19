'use client';

import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit';
import { useState } from 'react';

interface WorldIDVerifyProps {
  onSuccess?: (result: ISuccessResult) => void;
  onError?: (error: Error) => void;
}

export function WorldIDVerify({ onSuccess, onError }: WorldIDVerifyProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (result: ISuccessResult) => {
    setIsVerifying(true);
    try {
      // Send verification to backend
      const response = await fetch('/api/verify-world-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merkle_root: result.merkle_root,
          nullifier_hash: result.nullifier_hash,
          proof: result.proof,
          verification_level: result.verification_level,
        }),
      });

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const data = await response.json();
      console.log('World ID verification successful:', data);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('World ID verification error:', error);
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleError = (error: Error) => {
    console.error('World ID widget error:', error);
    if (onError) {
      onError(error);
    }
  };

  const appId = process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID || 'app_staging_0000000000000000000000000000';
  const actionId = process.env.NEXT_PUBLIC_WORLDCOIN_ACTION_ID || 'verify-tenant';

  return (
    <div className="flex flex-col items-center gap-4">
      <IDKitWidget
        app_id={appId}
        action={actionId}
        verification_level={VerificationLevel.Orb}
        handleVerify={handleVerify}
        onSuccess={handleVerify}
        onError={handleError}
      >
        {({ open }: any) => (
          <button
            onClick={open}
            disabled={isVerifying}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isVerifying ? (
              <>
                <span className="animate-spin">⏳</span>
                Verifying...
              </>
            ) : (
              <>
                <span>🌍</span>
                Verify with World ID
              </>
            )}
          </button>
        )}
      </IDKitWidget>
      
      <p className="text-sm text-gray-500 text-center max-w-md">
        Verify your identity with World ID to access ChainLease. 
        This ensures one person, one account.
      </p>
    </div>
  );
}
