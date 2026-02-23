// app/list-property/page.tsx
// Create new property listing page

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { parseEther } from 'viem';
import { PropertyType, LeaseTermUnit, createPropertySchema } from '@/types/property';
import { usePropertyContract } from '@/hooks/usePropertyContract';

export default function ListPropertyPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { mintProperty } = usePropertyContract();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    description: '',
    propertyType: PropertyType.RESIDENTIAL,
    
    // Address
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    
    // Features
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    yearBuilt: '',
    parking: '',
    furnished: false,
    petFriendly: false,
    amenities: [] as string[],
    
    // Pricing (in ETH, will convert to Wei)
    rentAmount: '',
    depositAmount: '',
    currency: 'ETH',
    paymentTokenAddress: '0x0000000000000000000000000000000000000000', // ETH
    
    // Lease Terms
    minLeaseTerm: '',
    maxLeaseTerm: '',
    termUnit: LeaseTermUnit.MONTHS,
    latePaymentFee: '',
    gracePeriodDays: '3',
    renewalOptions: true,
    earlyTerminationAllowed: false,
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [amenityInput, setAmenityInput] = useState('');

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + images.length > 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    setImages(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Add amenity
const addAmenity = () => {
    if (amenityInput.trim() && !formData.amenities.includes(amenityInput.trim())) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenityInput.trim()],
      }));
      setAmenityInput('');
    }
  };

  // Remove amenity
  const removeAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(a => a !== amenity),
    }));
  };

  // Validate step
  const validateStep = (currentStep: number): boolean => {
    setError(null);

    switch (currentStep) {
      case 1:
        if (!formData.name || formData.name.length < 3) {
          setError('Property name must be at least 3 characters');
          return false;
        }
        if (!formData.description || formData.description.length < 10) {
          setError('Description must be at least 10 characters');
          return false;
        }
        if (!formData.propertyType) {
          setError('Property type is required');
          return false;
        }
        break;
        
      case 2:
        if (!formData.street || !formData.city || !formData.state || !formData.country || !formData.postalCode) {
          setError('All address fields are required');
          return false;
        }
        break;
        
      case 3:
        // Features are mostly optional
        break;
        
      case 4:
        if (images.length === 0) {
          setError('At least one property image is required');
          return false;
        }
        break;
        
      case 5:
        if (!formData.rentAmount || parseFloat(formData.rentAmount) <= 0) {
          setError('Valid rent amount is required');
          return false;
        }
        if (!formData.depositAmount || parseFloat(formData.depositAmount) <= 0) {
          setError('Valid deposit amount is required');
          return false;
        }
        if (!formData.minLeaseTerm || parseInt(formData.minLeaseTerm) <= 0) {
          setError('Valid minimum lease term is required');
          return false;
        }
        if (!formData.maxLeaseTerm || parseInt(formData.maxLeaseTerm) <= 0) {
          setError('Valid maximum lease term is required');
          return false;
        }
        if (parseInt(formData.maxLeaseTerm) < parseInt(formData.minLeaseTerm)) {
          setError('Maximum lease term must be greater than minimum');
          return false;
        }
        break;
    }

    return true;
  };

  // Next step
  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  // Previous step
  const prevStep = () => {
    setError(null);
    setStep(prev => prev - 1);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    if (!validateStep(5)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare metadata
      const metadata = {
        name: formData.name,
        description: formData.description,
        propertyType: formData.propertyType,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          postalCode: formData.postalCode,
        },
        features: {
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : undefined,
          squareFeet: formData.squareFeet ? parseInt(formData.squareFeet) : undefined,
          yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
          parking: formData.parking ? parseInt(formData.parking) : undefined,
          furnished: formData.furnished,
          petFriendly: formData.petFriendly,
          amenities: formData.amenities,
        },
        images: images.map((_, index) => ({
          description: '',
          isPrimary: index === 0,
        })),
      };

      // Validate with Zod
      createPropertySchema.parse({
        ...metadata,
        pricing: {
          rentAmount: parseEther(formData.rentAmount).toString(),
          depositAmount: parseEther(formData.depositAmount).toString(),
          currency: formData.currency,
          paymentTokenAddress: formData.paymentTokenAddress,
        },
        leaseTerms: {
          minLeaseTerm: parseInt(formData.minLeaseTerm),
          maxLeaseTerm: parseInt(formData.maxLeaseTerm),
          termUnit: formData.termUnit,
          latePaymentFee: parseEther(formData.latePaymentFee || '0').toString(),
          gracePeriodDays: parseInt(formData.gracePeriodDays),
          renewalOptions: formData.renewalOptions,
          earlyTerminationAllowed: formData.earlyTerminationAllowed,
        },
      });

      // Prepare form data for upload
      const uploadFormData = new FormData();
      uploadFormData.append('metadata', JSON.stringify(metadata));
      uploadFormData.append('owner', address);
      images.forEach(image => {
        uploadFormData.append('images', image);
      });

      // Upload to IPFS and get metadata URI
      const mintResponse = await fetch('/api/properties/mint', {
        method: 'POST',
        body: uploadFormData,
      });

      const mintData = await mintResponse.json();

      if (!mintData.success) {
        throw new Error(mintData.error || 'Failed to prepare property for listing');
      }

      console.log('✅ Metadata uploaded to IPFS:', mintData.data.metadataURI);

      // Mint NFT on blockchain using the custom hook
      console.log('🔄 Minting PropertyNFT on blockchain...');
      
      const mintResult = await mintProperty(
        mintData.data.metadataURI,
        mintData.data.propertyAddress
      );

      const tokenId = mintResult.tokenId.toString();
      console.log('✅ PropertyNFT minted successfully! Token ID:', tokenId);

      // Save to database
      const propertyData = {
        tokenId,
        owner: address,
        metadataURI: mintData.data.metadataURI,
        metadata: mintData.data.metadata,
        pricing: {
          rentAmount: parseEther(formData.rentAmount).toString(),
          depositAmount: parseEther(formData.depositAmount).toString(),
          currency: formData.currency,
          paymentTokenAddress: formData.paymentTokenAddress,
        },
        leaseTerms: {
          minLeaseTerm: parseInt(formData.minLeaseTerm),
          maxLeaseTerm: parseInt(formData.maxLeaseTerm),
          termUnit: formData.termUnit,
          latePaymentFee: parseEther(formData.latePaymentFee || '0').toString(),
          gracePeriodDays: parseInt(formData.gracePeriodDays),
          renewalOptions: formData.renewalOptions,
          earlyTerminationAllowed: formData.earlyTerminationAllowed,
        },
        status: 'available',
      };

      const saveResponse = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyData),
      });

      const saveData = await saveResponse.json();

      if (!saveData.success) {
        throw new Error(saveData.error || 'Failed to save property');
      }

      // Success! Redirect to property page
      router.push(`/properties/${tokenId}`);
    } catch (err: any) {
      console.error('Property listing error:', err);
      setError(err.message || 'Failed to list property');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Wallet Connection Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to list a property
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            List Your Property
          </h1>
          <p className="text-gray-600">
            Create a blockchain-verified property listing
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {['Basic Info', 'Address', 'Features', 'Images', 'Pricing & Terms'].map((label, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step > index + 1
                      ? 'bg-green-500 text-white'
                      : step === index + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step > index + 1 ? '✓' : index + 1}
                </div>
                {index < 4 && (
                  <div className={`h-1 w-20 mx-2 ${step > index + 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            {['Basic Info', 'Address', 'Features', 'Images', 'Pricing'].map((label) => (
              <span key={label} className="w-24 text-center">{label}</span>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Luxury Downtown Apartment"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your property, its features, and what makes it unique..."
                  rows={6}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type *
                </label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={PropertyType.RESIDENTIAL}>Residential</option>
                  <option value={PropertyType.COMMERCIAL}>Commercial</option>
                  <option value={PropertyType.INDUSTRIAL}>Industrial</option>
                  <option value={PropertyType.LAND}>Land</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Address</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  placeholder="123 Main Street"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="San Francisco"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="California"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="United States"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="94102"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Features */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Features</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleChange}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Square Feet
                  </label>
                  <input
                    type="number"
                    name="squareFeet"
                    value={formData.squareFeet}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year Built
                  </label>
                  <input
                    type="number"
                    name="yearBuilt"
                    value={formData.yearBuilt}
                    onChange={handleChange}
                    min="1800"
                    max={new Date().getFullYear() + 5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parking Spots
                </label>
                <input
                  type="number"
                  name="parking"
                  value={formData.parking}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="furnished"
                    checked={formData.furnished}
                    onChange={handleChange}
                    className="mr-2 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Furnished</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="petFriendly"
                    checked={formData.petFriendly}
                    onChange={handleChange}
                    className="mr-2 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Pet Friendly</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amenities
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={amenityInput}
                    onChange={(e) => setAmenityInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                    placeholder="e.g., Pool, Gym, Parking"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addAmenity}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center"
                    >
                      {amenity}
                      <button
                        type="button"
                        onClick={() => removeAmenity(amenity)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Images */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Images</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Images * (Max 10, first image will be primary)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      {index === 0 && (
                        <span className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Pricing & Terms */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Pricing & Lease Terms</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rent (ETH) *
                  </label>
                  <input
                    type="number"
                    name="rentAmount"
                    value={formData.rentAmount}
                    onChange={handleChange}
                    step="0.001"
                    min="0"
                    required
                    placeholder="0.5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Security Deposit (ETH) *
                  </label>
                  <input
                    type="number"
                    name="depositAmount"
                    value={formData.depositAmount}
                    onChange={handleChange}
                    step="0.001"
                    min="0"
                    required
                    placeholder="1.0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Lease Term *
                  </label>
                  <input
                    type="number"
                    name="minLeaseTerm"
                    value={formData.minLeaseTerm}
                    onChange={handleChange}
                    min="1"
                    required
                    placeholder="6"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Lease Term *
                  </label>
                  <input
                    type="number"
                    name="maxLeaseTerm"
                    value={formData.maxLeaseTerm}
                    onChange={handleChange}
                    min="1"
                    required
                    placeholder="12"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Term Unit *
                  </label>
                  <select
                    name="termUnit"
                    value={formData.termUnit}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={LeaseTermUnit.MONTHS}>Months</option>
                    <option value={LeaseTermUnit.YEARS}>Years</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Late Payment Fee (ETH)
                  </label>
                  <input
                    type="number"
                    name="latePaymentFee"
                    value={formData.latePaymentFee}
                    onChange={handleChange}
                    step="0.001"
                    min="0"
                    placeholder="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    name="gracePeriodDays"
                    value={formData.gracePeriodDays}
                    onChange={handleChange}
                    min="0"
                    max="30"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="renewalOptions"
                    checked={formData.renewalOptions}
                    onChange={handleChange}
                    className="mr-2 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Allow Renewal</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="earlyTerminationAllowed"
                    checked={formData.earlyTerminationAllowed}
                    onChange={handleChange}
                    className="mr-2 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Allow Early Termination</span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={loading}
                className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="ml-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Listing...
                  </>
                ) : (
                  <>
                    🚀 List Property
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
