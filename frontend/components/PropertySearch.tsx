// components/PropertySearch.tsx
// Property search and filter component

'use client';

import { useState } from 'react';
import { PropertyType, PropertySearchParams } from '@/types/property';

interface PropertySearchProps {
  onSearch: (params: PropertySearchParams) => void;
  loading?: boolean;
}

export default function PropertySearch({ onSearch, loading = false }: PropertySearchProps) {
  const [query, setQuery] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType | ''>('');
  const [city, setCity] = useState('');
  const [minBedrooms, setMinBedrooms] = useState('');
  const [maxBedrooms, setMaxBedrooms] = useState('');
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [petFriendly, setPetFriendly] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params: PropertySearchParams = {
      query: query || undefined,
      propertyType: propertyType || undefined,
      city: city || undefined,
      minBedrooms: minBedrooms ? parseInt(minBedrooms) : undefined,
      maxBedrooms: maxBedrooms ? parseInt(maxBedrooms) : undefined,
      minRent: minRent || undefined,
      maxRent: maxRent || undefined,
      petFriendly: petFriendly || undefined,
      furnished: furnished || undefined,
    };

    onSearch(params);
  };

  const handleReset = () => {
    setQuery('');
    setPropertyType('');
    setCity('');
    setMinBedrooms('');
    setMaxBedrooms('');
    setMinRent('');
    setMaxRent('');
    setPetFriendly(false);
    setFurnished(false);
    onSearch({});
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <form onSubmit={handleSearch}>
        {/* Main search bar */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search properties..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Searching...
              </div>
            ) : (
              'Search'
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value={PropertyType.RESIDENTIAL}>Residential</option>
                  <option value={PropertyType.COMMERCIAL}>Commercial</option>
                  <option value={PropertyType.INDUSTRIAL}>Industrial</option>
                  <option value={PropertyType.LAND}>Land</option>
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  placeholder="Enter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bedrooms
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minBedrooms}
                    onChange={(e) => setMinBedrooms(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxBedrooms}
                    onChange={(e) => setMaxBedrooms(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rent Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Rent (Wei)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Min"
                    value={minRent}
                    onChange={(e) => setMinRent(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Max"
                    value={maxRent}
                    onChange={(e) => setMaxRent(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Boolean Filters */}
              <div className="flex items-end gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={petFriendly}
                    onChange={(e) => setPetFriendly(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Pet Friendly</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={furnished}
                    onChange={(e) => setFurnished(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Furnished</span>
                </label>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Reset Filters
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
