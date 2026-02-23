// app/api/properties/route.ts
// Property listing and search API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Property, PropertySearchParams, searchParamsSchema, PropertyStatus } from '@/types/property';

/**
 * GET /api/properties
 * Search and filter properties with pagination
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        console.log('Incoming search params:', Object.fromEntries(searchParams.entries()));

        // Parse and validate query parameters
        const params: PropertySearchParams = {
            query: searchParams.get('query') || undefined,
            propertyType: searchParams.get('propertyType') || undefined,
            status: searchParams.get('status') || undefined,
            city: searchParams.get('city') || undefined,
            state: searchParams.get('state') || undefined,
            country: searchParams.get('country') || undefined,
            minRent: searchParams.get('minRent') || undefined,
            maxRent: searchParams.get('maxRent') || undefined,
            minBedrooms: searchParams.get('minBedrooms') ? parseInt(searchParams.get('minBedrooms')!) : undefined,
            maxBedrooms: searchParams.get('maxBedrooms') ? parseInt(searchParams.get('maxBedrooms')!) : undefined,
            minBathrooms: searchParams.get('minBathrooms') ? parseFloat(searchParams.get('minBathrooms')!) : undefined,
            petFriendly: searchParams.get('petFriendly') === 'true' ? true : searchParams.get('petFriendly') === 'false' ? false : undefined,
            furnished: searchParams.get('furnished') === 'true' ? true : searchParams.get('furnished') === 'false' ? false : undefined,
            amenities: (() => {
                const amenitiesParam = searchParams.get('amenities');
                if (!amenitiesParam) return undefined;
                const arr = amenitiesParam.split(',').filter(Boolean);
                return arr.length > 0 ? arr : undefined;
            })(),
            page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
            sortBy: searchParams.get('sortBy') || 'createdAt',
            sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
        };

        // Validate with Zod schema
        console.log('Params before validation:', params);
        const validatedParams = searchParamsSchema.parse(params);
        console.log('Validated params:', validatedParams);

        const db = await getDatabase();
        const collection = db.collection<Property>('properties');

        // Build MongoDB query
        const query: any = {};

        // Text search
        if (validatedParams.query) {
            query.$text = { $search: validatedParams.query };
        }

        // Filters
        if (validatedParams.propertyType) {
            query['metadata.propertyType'] = validatedParams.propertyType;
        }

        if (validatedParams.status) {
            query.status = validatedParams.status;
        }

        if (validatedParams.city) {
            query['metadata.address.city'] = new RegExp(validatedParams.city, 'i');
        }

        if (validatedParams.state) {
            query['metadata.address.state'] = new RegExp(validatedParams.state, 'i');
        }

        if (validatedParams.country) {
            query['metadata.address.country'] = new RegExp(validatedParams.country, 'i');
        }

        // Price range (convert string to number)
        if (validatedParams.minRent || validatedParams.maxRent) {
            query['pricing.rentAmount'] = {};
            if (validatedParams.minRent) {
                query['pricing.rentAmount'].$gte = parseInt(validatedParams.minRent);
            }
            if (validatedParams.maxRent) {
                query['pricing.rentAmount'].$lte = parseInt(validatedParams.maxRent);
            }
        }

        // Bedrooms
        if (validatedParams.minBedrooms !== undefined) {
            query['metadata.features.bedrooms'] = { $gte: validatedParams.minBedrooms };
        }
        if (validatedParams.maxBedrooms !== undefined) {
            query['metadata.features.bedrooms'] = {
                ...query['metadata.features.bedrooms'],
                $lte: validatedParams.maxBedrooms,
            };
        }

        // Bathrooms
        if (validatedParams.minBathrooms !== undefined) {
            query['metadata.features.bathrooms'] = { $gte: validatedParams.minBathrooms };
        }

        // Boolean filters
        if (validatedParams.petFriendly !== undefined) {
            query['metadata.features.petFriendly'] = validatedParams.petFriendly;
        }

        if (validatedParams.furnished !== undefined) {
            query['metadata.features.furnished'] = validatedParams.furnished;
        }

        // Amenities (all must match)
        if (validatedParams.amenities && validatedParams.amenities.length > 0) {
            query['metadata.features.amenities'] = { $all: validatedParams.amenities };
        }

        // Build sort object
        const sortField = validatedParams.sortBy === 'rentAmount'
            ? 'pricing.rentAmount'
            : validatedParams.sortBy === 'squareFeet'
                ? 'metadata.features.squareFeet'
                : validatedParams.sortBy;

        const sort: any = { [sortField]: validatedParams.sortOrder === 'asc' ? 1 : -1 };

        // Calculate pagination
        const skip = (validatedParams.page - 1) * validatedParams.limit;
        console.log('MongoDB query:', JSON.stringify(query));
        console.log('Sort:', sort);

        // Execute query
        const [properties, total] = await Promise.all([
            collection
                .find(query)
                .sort(sort)
                .skip(skip)
                .limit(validatedParams.limit)
                .toArray(),
            collection.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / validatedParams.limit);

        return NextResponse.json({
            success: true,
            data: {
                properties,
                pagination: {
                    page: validatedParams.page,
                    limit: validatedParams.limit,
                    total,
                    totalPages,
                    hasMore: validatedParams.page < totalPages,
                },
            },
        });
    } catch (error: any) {
        console.error('Property search error:', error);
        console.error('Error stack:', error.stack);

        if (error.name === 'ZodError') {
            console.error('Zod validation errors:', JSON.stringify(error.errors, null, 2));
            return NextResponse.json(
                { success: false, error: 'Invalid search parameters', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to search properties', message: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}

/**
 * POST /api/properties
 * Create a new property listing (metadata only, NFT minting done separately)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            tokenId,
            owner,
            metadataURI,
            metadata,
            pricing,
            leaseTerms,
            status = PropertyStatus.AVAILABLE,
        } = body;

        // Validation
        if (!tokenId || !owner || !metadataURI || !metadata || !pricing || !leaseTerms) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) {
            return NextResponse.json(
                { success: false, error: 'Invalid owner address' },
                { status: 400 }
            );
        }

        const db = await getDatabase();
        const collection = db.collection<Property>('properties');

        // Check if property already exists
        const existing = await collection.findOne({ tokenId });
        if (existing) {
            return NextResponse.json(
                { success: false, error: 'Property with this token ID already exists' },
                { status: 409 }
            );
        }

        // Create property document
        const property: Property = {
            tokenId,
            owner,
            metadataURI,
            isActive: true,
            metadata,
            pricing,
            leaseTerms,
            status,
            createdAt: new Date(),
            updatedAt: new Date(),
            views: 0,
            favorites: 0,
        };

        const result = await collection.insertOne(property as any);

        if (!result.insertedId) {
            throw new Error('Failed to insert property');
        }

        return NextResponse.json({
            success: true,
            data: {
                property,
                id: result.insertedId,
            },
        }, { status: 201 });
    } catch (error: any) {
        console.error('Property creation error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create property', message: error.message },
            { status: 500 }
        );
    }
}
