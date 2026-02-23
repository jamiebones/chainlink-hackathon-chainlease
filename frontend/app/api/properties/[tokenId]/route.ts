// app/api/properties/[tokenId]/route.ts
// Individual property operations

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Property, PropertyStatus } from '@/types/property';

/**
 * GET /api/properties/[tokenId]
 * Fetch a single property by token ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { tokenId: string } }
) {
    try {
        const { tokenId } = params;

        if (!tokenId) {
            return NextResponse.json(
                { success: false, error: 'Token ID is required' },
                { status: 400 }
            );
        }

        const db = await getDatabase();
        const collection = db.collection<Property>('properties');

        const property = await collection.findOne({ tokenId });

        if (!property) {
            return NextResponse.json(
                { success: false, error: 'Property not found' },
                { status: 404 }
            );
        }

        // Increment view count
        await collection.updateOne(
            { tokenId },
            { $inc: { views: 1 } }
        );

        return NextResponse.json({
            success: true,
            data: property,
        });
    } catch (error: any) {
        console.error('Property fetch error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch property', message: error.message },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/properties/[tokenId]
 * Update property details (metadata not changed)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { tokenId: string } }
) {
    try {
        const { tokenId } = params;
        const body = await request.json();

        if (!tokenId) {
            return NextResponse.json(
                { success: false, error: 'Token ID is required' },
                { status: 400 }
            );
        }

        const { owner, pricing, leaseTerms, status } = body;

        // Validate owner if provided
        if (owner && !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
            return NextResponse.json(
                { success: false, error: 'Invalid owner address' },
                { status: 400 }
            );
        }

        const db = await getDatabase();
        const collection = db.collection<Property>('properties');

        // Check if property exists
        const existing = await collection.findOne({ tokenId });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Property not found' },
                { status: 404 }
            );
        }

        // Build update object
        const updates: any = {
            updatedAt: new Date(),
        };

        if (owner) updates.owner = owner;
        if (pricing) updates.pricing = pricing;
        if (leaseTerms) updates.leaseTerms = leaseTerms;
        if (status) updates.status = status;

        const result = await collection.updateOne(
            { tokenId },
            { $set: updates }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'No changes made' },
                { status: 400 }
            );
        }

        // Fetch updated property
        const updatedProperty = await collection.findOne({ tokenId });

        return NextResponse.json({
            success: true,
            data: updatedProperty,
        });
    } catch (error: any) {
        console.error('Property update error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update property', message: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/properties/[tokenId]
 * Mark property as inactive (soft delete)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { tokenId: string } }
) {
    try {
        const { tokenId } = params;

        if (!tokenId) {
            return NextResponse.json(
                { success: false, error: 'Token ID is required' },
                { status: 400 }
            );
        }

        const db = await getDatabase();
        const collection = db.collection<Property>('properties');

        // Check if property exists
        const existing = await collection.findOne({ tokenId });
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Property not found' },
                { status: 404 }
            );
        }

        // Soft delete - mark as inactive
        const result = await collection.updateOne(
            { tokenId },
            {
                $set: {
                    isActive: false,
                    status: PropertyStatus.UNAVAILABLE,
                    updatedAt: new Date(),
                },
            }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json(
                { success: false, error: 'Failed to delete property' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Property marked as inactive',
        });
    } catch (error: any) {
        console.error('Property delete error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete property', message: error.message },
            { status: 500 }
        );
    }
}
