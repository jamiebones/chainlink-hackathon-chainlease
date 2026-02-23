// lib/ipfs.ts
// Production-ready IPFS service using Pinata

import axios from 'axios';

interface PinataConfig {
    apiKey: string;
    secretKey: string;
    jwt: string;
}

interface IPFSUploadResponse {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
}

interface PropertyImage {
    file: File;
    description?: string;
}

class IPFSService {
    private config: PinataConfig;
    private baseURL = 'https://api.pinata.cloud';

    constructor() {
        this.config = {
            apiKey: process.env.PINATA_API_KEY || '',
            secretKey: process.env.PINATA_SECRET_KEY || '',
            jwt: process.env.PINATA_JWT || '',
        };

        if (!this.config.jwt && (!this.config.apiKey || !this.config.secretKey)) {
            console.warn('IPFS: Pinata credentials not configured');
        }
    }

    /**
     * Upload a single file to IPFS via Pinata
     */
    async uploadFile(file: File | Buffer, filename: string): Promise<string> {
        try {
            const formData = new FormData();

            if (file instanceof File) {
                formData.append('file', file);
            } else {
                // Convert Buffer to Blob properly
                const blob = new Blob([new Uint8Array(file)]);
                formData.append('file', blob, filename);
            }

            const metadata = JSON.stringify({
                name: filename,
            });
            formData.append('pinataMetadata', metadata);

            const response = await axios.post<IPFSUploadResponse>(
                `${this.baseURL}/pinning/pinFileToIPFS`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${this.config.jwt}`,
                    },
                    maxBodyLength: Infinity,
                }
            );

            return response.data.IpfsHash;
        } catch (error) {
            console.error('IPFS file upload failed:', error);
            throw new Error('Failed to upload file to IPFS');
        }
    }

    /**
     * Upload JSON metadata to IPFS
     */
    async uploadJSON(data: object, name: string): Promise<string> {
        try {
            const response = await axios.post<IPFSUploadResponse>(
                `${this.baseURL}/pinning/pinJSONToIPFS`,
                {
                    pinataContent: data,
                    pinataMetadata: {
                        name,
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.config.jwt}`,
                    },
                }
            );

            return response.data.IpfsHash;
        } catch (error) {
            console.error('IPFS JSON upload failed:', error);
            throw new Error('Failed to upload JSON to IPFS');
        }
    }

    /**
     * Upload multiple property images and return their CIDs
     */
    async uploadPropertyImages(images: PropertyImage[]): Promise<string[]> {
        const uploadPromises = images.map(async (img, index) => {
            const filename = `property-${Date.now()}-${index}.${img.file.name.split('.').pop()}`;
            return this.uploadFile(img.file, filename);
        });

        return Promise.all(uploadPromises);
    }

    /**
     * Unpin content from IPFS (cleanup)
     */
    async unpinFile(cid: string): Promise<void> {
        try {
            await axios.delete(`${this.baseURL}/pinning/unpin/${cid}`, {
                headers: {
                    Authorization: `Bearer ${this.config.jwt}`,
                },
            });
        } catch (error) {
            console.error('IPFS unpin failed:', error);
            throw new Error('Failed to unpin file from IPFS');
        }
    }

    /**
     * Get IPFS gateway URL for a CID
     */
    getGatewayURL(cid: string): string {
        return `https://gateway.pinata.cloud/ipfs/${cid}`;
    }

    /**
     * Convert ipfs:// URI to HTTP gateway URL
     */
    resolveIPFS(uri: string): string {
        if (uri.startsWith('ipfs://')) {
            const cid = uri.replace('ipfs://', '');
            return this.getGatewayURL(cid);
        }
        return uri;
    }

    /**
     * Fetch JSON metadata from IPFS
     */
    async fetchMetadata<T = any>(cid: string): Promise<T> {
        try {
            const url = this.getGatewayURL(cid);
            const response = await axios.get<T>(url);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch IPFS metadata:', error);
            throw new Error('Failed to fetch metadata from IPFS');
        }
    }
}

// Singleton instance
export const ipfsService = new IPFSService();

// Server-side only instance with credentials
export function getIPFSService(): IPFSService {
    if (typeof window !== 'undefined') {
        throw new Error('IPFSService should only be used on the server');
    }
    return ipfsService;
}
