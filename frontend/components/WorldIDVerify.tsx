'use client';

import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit';
import { useState } from 'react';
import { useAccount } from 'wagmi';

interface WorldIDVerifyProps {
  onSuccess?: (result: ISuccessResult) => void;
  onError?: (error: Error) => void;
}

export function WorldIDVerify({ onSuccess, onError }: WorldIDVerifyProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const { address } = useAccount();

  const handleVerify = async (result: ISuccessResult) => {
    console.log('handleVerify called with:', result);
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

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      console.log('✅ World ID verification successful and saved to database!');
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return data;
    } catch (error) {
      console.error('❌ World ID verification error:', error);
      if (onError) {
        onError(error as Error);
      }
      throw error;
    } finally {
      setIsVerifying(false);
    }
  };

  const appId = process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID || 'app_staging_0000000000000000000000000000';
  const actionId = process.env.NEXT_PUBLIC_WORLDCOIN_ACTION_ID || 'verify-tenant';

  console.log('World ID Config:', { appId, actionId, address });

  // Check if we're in staging mode
  const isStaging = appId.includes('staging');
  
  // Use Device level - most users don't have Orb verification
  // For production with Orb requirement, change to VerificationLevel.Orb
  const verificationLevel = VerificationLevel.Device;

  return (
    <div className="flex flex-col items-center gap-4">
      {isStaging && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-2 max-w-md">
          <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
            ℹ️ <strong>Development Mode:</strong> Using staging environment. 
            You can use the World ID Simulator or Staging App.
          </p>
        </div>
      )}
      
      <IDKitWidget
        app_id={appId}
        action={actionId}
        signal={address || ''}
        verification_level={verificationLevel}
        handleVerify={handleVerify}
        onSuccess={handleVerify}
        autoClose
        enableTelemetry
      >
        {({ open }: { open: () => void }) => (
          <button
            onClick={() => {
              console.log('Button clicked, opening World ID widget...');
              open();
            }}
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
      
      {isStaging && (
        <div className="text-xs text-gray-400 text-center max-w-md space-y-1">
          <p>🧪 <strong>Testing Options:</strong></p>
          <p>• Click button above - look for "Continue with simulator" link in the popup</p>
          <p>• The simulator link appears at the bottom of the QR code popup</p>
          <p>• Or scan QR with World ID Staging App</p>
          <p>• Staging App: <a href="https://simulator.worldcoin.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">simulator.worldcoin.org</a></p>
        </div>
      )}
    </div>
  );
}
