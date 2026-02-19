// lib/wagmi.ts
// Wagmi and RainbowKit configuration

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, mainnet } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'ChainLease',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [sepolia, mainnet],
    ssr: true,
});
