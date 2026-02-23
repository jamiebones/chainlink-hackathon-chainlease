// app/properties/page.tsx
// Properties browsing page with search and filters

'use client';

import { useState, useEffect } from 'react';
import PropertyCard from '@/components/PropertyCard';
import PropertySearch from '@/components/PropertySearch';
import { Property, PropertySearchParams } from '@/types/property';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [searchParams, setSearchParams] = useState<PropertySearchParams>({});

  // Fetch properties
  const fetchProperties = async (params: PropertySearchParams = {}, page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      
      // Add all search params
      Object.entries({ ...params, page: page.toString(), limit: '20' }).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            queryParams.set(key, value.join(','));
          } else {
            queryParams.set(key, String(value));
          }
        }
      });

      const response = await fetch(`/api/properties?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch properties');
      }

      setProperties(data.data.properties);
      setPagination(data.data.pagination);
    } catch (err: any) {
      console.error('Error fetching properties:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProperties();
  }, []);

  // Handle search
  const handleSearch = (params: PropertySearchParams) => {
    setSearchParams(params);
    fetchProperties(params, 1);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    fetchProperties(searchParams, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Explore Properties
          </h1>
          <p className="text-gray-600">
            Find your perfect rental property on the blockchain
          </p>
        </div>

        {/* Search and Filters */}
        <PropertySearch onSearch={handleSearch} loading={loading} />

        {/* Results Count */}
        {!loading && !error && (
          <div className="mb-4 text-sm text-gray-600">
            Found {pagination.total} {pagination.total === 1 ? 'property' : 'properties'}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-600">Loading properties...</p>
            </div>
          </div>
        )}

        {/* Properties Grid */}
        {!loading && !error && properties.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {properties.map((property) => (
                <PropertyCard key={property.tokenId} property={property} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first, last, current, and adjacent pages
                    if (
                      page === 1 ||
                      page === pagination.totalPages ||
                      Math.abs(page - pagination.page) <= 1
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            page === pagination.page
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === pagination.page - 2 ||
                      page === pagination.page + 2
                    ) {
                      return <span key={page} className="px-2 py-2">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasMore}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !error && properties.length === 0 && (
          <div className="text-center py-20">
            <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No properties found
            </h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search filters or browse all available properties
            </p>
            <button
              onClick={() => handleSearch({})}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Properties
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
