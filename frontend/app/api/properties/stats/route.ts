// app/api/properties/stats/route.ts
// Property statistics and analytics

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { Property, PropertyType, PropertyStats, PropertyStatus } from '@/types/property';

/**
 * GET /api/properties/stats
 * Get property statistics and analytics
 */
export async function GET(request: NextRequest) {
    try {
        const db = await getDatabase();
        const collection = db.collection<Property>('properties');

        // Aggregate statistics
        const [
            totalProperties,
            availableProperties,
            leasedProperties,
            propertyTypeDistribution,
            locationDistribution,
            averageRentResult,
        ] = await Promise.all([
            // Total properties
            collection.countDocuments({ isActive: true }),

            // Available properties
            collection.countDocuments({ isActive: true, status: PropertyStatus.AVAILABLE }),

            // Leased properties
            collection.countDocuments({ isActive: true, status: PropertyStatus.LEASED }),

            // Property type distribution
            collection
                .aggregate([
                    { $match: { isActive: true } },
                    { $group: { _id: '$metadata.propertyType', count: { $sum: 1 } } },
                ])
                .toArray(),

            // Location distribution (by city)
            collection
                .aggregate([
                    { $match: { isActive: true } },
                    { $group: { _id: '$metadata.address.city', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 },
                ])
                .toArray(),

            // Average rent
            collection
                .aggregate([
                    { $match: { isActive: true, status: PropertyStatus.AVAILABLE } },
                    {
                        $group: {
                            _id: null,
                            avgRent: { $avg: { $toDouble: '$pricing.rentAmount' } },
                        },
                    },
                ])
                .toArray(),
        ]);

        // Format property type distribution
        const typeDistribution: Record<PropertyType, number> = {
            [PropertyType.RESIDENTIAL]: 0,
            [PropertyType.COMMERCIAL]: 0,
            [PropertyType.INDUSTRIAL]: 0,
            [PropertyType.LAND]: 0,
        };

        propertyTypeDistribution.forEach((item: any) => {
            if (item._id in typeDistribution) {
                typeDistribution[item._id as PropertyType] = item.count;
            }
        });

        // Format location distribution
        const locDistribution: Record<string, number> = {};
        locationDistribution.forEach((item: any) => {
            locDistribution[item._id] = item.count;
        });

        // Format average rent
        const averageRent = averageRentResult.length > 0
            ? Math.floor(averageRentResult[0].avgRent).toString()
            : '0';

        const stats: PropertyStats = {
            totalProperties,
            availableProperties,
            leasedProperties,
            totalValue: '0', // Would need to calculate based on property values
            averageRent,
            propertyTypeDistribution: typeDistribution,
            locationDistribution: locDistribution,
        };

        return NextResponse.json({
            success: true,
            data: stats,
        });
    } catch (error: any) {
        console.error('Property stats error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch property statistics', message: error.message },
            { status: 500 }
        );
    }
}
