// types/property.ts
// Comprehensive property type definitions with validation

import { z } from 'zod';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum PropertyType {
    RESIDENTIAL = 'residential',
    COMMERCIAL = 'commercial',
    INDUSTRIAL = 'industrial',
    LAND = 'land',
}

export enum PropertyStatus {
    AVAILABLE = 'available',
    LEASED = 'leased',
    PENDING = 'pending',
    UNAVAILABLE = 'unavailable',
}

export enum LeaseTermUnit {
    MONTHS = 'months',
    YEARS = 'years',
}

// ============================================================================
// LOCATION & ADDRESS
// ============================================================================

export interface PropertyAddress {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

export const addressSchema = z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State/Province is required'),
    country: z.string().min(1, 'Country is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    coordinates: z
        .object({
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
        })
        .optional(),
});

// ============================================================================
// PROPERTY FEATURES & AMENITIES
// ============================================================================

export interface PropertyFeatures {
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    squareMeters?: number;
    yearBuilt?: number;
    parking?: number;
    furnished: boolean;
    petFriendly: boolean;
    amenities: string[];
}

export const featuresSchema = z.object({
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().min(0).optional(),
    squareFeet: z.number().positive().optional(),
    squareMeters: z.number().positive().optional(),
    yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 5).optional(),
    parking: z.number().int().min(0).optional(),
    furnished: z.boolean().default(false),
    petFriendly: z.boolean().default(false),
    amenities: z.array(z.string()).default([]),
});

// ============================================================================
// PRICING & FINANCIAL
// ============================================================================

export interface PropertyPricing {
    rentAmount: string; // Wei as string for precision
    depositAmount: string; // Wei as string
    currency: string; // e.g., "USDC", "ETH"
    paymentTokenAddress: string; // ERC20 token address
}

export const pricingSchema = z.object({
    rentAmount: z.string().regex(/^\d+$/, 'Invalid rent amount'),
    depositAmount: z.string().regex(/^\d+$/, 'Invalid deposit amount'),
    currency: z.string().min(1, 'Currency is required'),
    paymentTokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token address'),
});

// ============================================================================
// LEASE TERMS
// ============================================================================

export interface LeaseTerms {
    minLeaseTerm: number;
    maxLeaseTerm: number;
    termUnit: LeaseTermUnit;
    latePaymentFee: string; // Wei as string
    gracePeriodDays: number;
    renewalOptions: boolean;
    earlyTerminationAllowed: boolean;
}

export const leaseTermsSchema = z.object({
    minLeaseTerm: z.number().int().positive('Minimum lease term must be positive'),
    maxLeaseTerm: z.number().int().positive('Maximum lease term must be positive'),
    termUnit: z.nativeEnum(LeaseTermUnit),
    latePaymentFee: z.string().regex(/^\d+$/, 'Invalid late payment fee'),
    gracePeriodDays: z.number().int().min(0).max(30),
    renewalOptions: z.boolean().default(true),
    earlyTerminationAllowed: z.boolean().default(false),
}).refine(data => data.maxLeaseTerm >= data.minLeaseTerm, {
    message: 'Maximum lease term must be greater than or equal to minimum',
    path: ['maxLeaseTerm'],
});

// ============================================================================
// PROPERTY IMAGES
// ============================================================================

export interface PropertyImage {
    cid: string; // IPFS CID
    url: string; // Gateway URL
    description?: string;
    isPrimary: boolean;
}

export const imageSchema = z.object({
    cid: z.string().min(1, 'Image CID is required'),
    url: z.string().url('Invalid image URL'),
    description: z.string().optional(),
    isPrimary: z.boolean().default(false),
});

// ============================================================================
// IPFS METADATA (stored on IPFS)
// ============================================================================

export interface PropertyMetadata {
    name: string;
    description: string;
    propertyType: PropertyType;
    address: PropertyAddress;
    features: PropertyFeatures;
    images: PropertyImage[];
    documents?: {
        cid: string;
        name: string;
        type: string;
    }[];
    externalLink?: string;
}

export const metadataSchema = z.object({
    name: z.string().min(3, 'Property name must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    propertyType: z.nativeEnum(PropertyType),
    address: addressSchema,
    features: featuresSchema,
    images: z.array(imageSchema).min(1, 'At least one image is required'),
    documents: z.array(
        z.object({
            cid: z.string(),
            name: z.string(),
            type: z.string(),
        })
    ).optional(),
    externalLink: z.string().url().optional(),
});

// ============================================================================
// ON-CHAIN PROPERTY (minimal data stored on blockchain)
// ============================================================================

export interface OnChainProperty {
    tokenId: bigint;
    owner: `0x${string}`;
    metadataURI: string; // IPFS URI (ipfs://...)
    isActive: boolean;
}

// ============================================================================
// COMPLETE PROPERTY (aggregated from all sources)
// ============================================================================

export interface Property {
    // On-chain data
    tokenId: string;
    owner: string;
    metadataURI: string;
    isActive: boolean;

    // IPFS metadata
    metadata: PropertyMetadata;

    // Off-chain data (MongoDB)
    pricing: PropertyPricing;
    leaseTerms: LeaseTerms;
    status: PropertyStatus;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;

    // Analytics
    views: number;
    favorites: number;

    // Current lease info (if applicable)
    currentLeaseId?: string;
    currentTenant?: string;
    leaseEndDate?: Date;
}

// ============================================================================
// CREATE PROPERTY INPUT
// ============================================================================

export interface CreatePropertyInput {
    name: string;
    description: string;
    propertyType: PropertyType;
    address: PropertyAddress;
    features: PropertyFeatures;
    pricing: PropertyPricing;
    leaseTerms: LeaseTerms;
    images: File[];
    documents?: File[];
}

export const createPropertySchema = z.object({
    name: z.string().min(3, 'Property name must be at least 3 characters').max(100),
    description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
    propertyType: z.nativeEnum(PropertyType),
    address: addressSchema,
    features: featuresSchema,
    pricing: pricingSchema,
    leaseTerms: leaseTermsSchema,
});

// ============================================================================
// SEARCH & FILTER
// ============================================================================

export interface PropertySearchParams {
    query?: string;
    propertyType?: PropertyType;
    status?: PropertyStatus;
    city?: string;
    state?: string;
    country?: string;
    minRent?: string;
    maxRent?: string;
    minBedrooms?: number;
    maxBedrooms?: number;
    minBathrooms?: number;
    petFriendly?: boolean;
    furnished?: boolean;
    amenities?: string[];
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'rentAmount' | 'views' | 'squareFeet';
    sortOrder?: 'asc' | 'desc';
}

export const searchParamsSchema = z.object({
    query: z.string().optional(),
    propertyType: z.nativeEnum(PropertyType).optional(),
    status: z.nativeEnum(PropertyStatus).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    minRent: z.string().regex(/^\d+$/).optional(),
    maxRent: z.string().regex(/^\d+$/).optional(),
    minBedrooms: z.number().int().min(0).optional(),
    maxBedrooms: z.number().int().min(0).optional(),
    minBathrooms: z.number().min(0).optional(),
    petFriendly: z.boolean().optional(),
    furnished: z.boolean().optional(),
    amenities: z.array(z.string()).optional(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    sortBy: z.enum(['createdAt', 'rentAmount', 'views', 'squareFeet']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// PROPERTY STATISTICS
// ============================================================================

export interface PropertyStats {
    totalProperties: number;
    availableProperties: number;
    leasedProperties: number;
    totalValue: string;
    averageRent: string;
    propertyTypeDistribution: Record<PropertyType, number>;
    locationDistribution: Record<string, number>;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isValidAddress(address: string): address is `0x${string}` {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidTokenId(tokenId: string | number | bigint): boolean {
    try {
        BigInt(tokenId);
        return true;
    } catch {
        return false;
    }
}
