// components/CreditCheckForm.tsx
// Comprehensive credit check application form

'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { 
    CreditCheckRequest, 
    EmploymentStatus,
    CreditCheckResponse 
} from '@/types/credit-check';

interface CreditCheckFormProps {
    propertyId: string;
    leaseId?: string;
    rentAmount: number;
    onSuccess?: (result: CreditCheckResponse) => void;
    onCancel?: () => void;
}

export default function CreditCheckForm({
    propertyId,
    leaseId,
    rentAmount,
    onSuccess,
    onCancel,
}: CreditCheckFormProps) {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        // Personal Info
        firstName: '',
        middleName: '',
        lastName: '',
        dateOfBirth: '',
        ssnLast4: '',
        phoneNumber: '',
        email: '',

        // Current Address
        street: '',
        unit: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
        lengthOfResidence: '',

        // Previous Address
        prevStreet: '',
        prevCity: '',
        prevState: '',
        prevZipCode: '',
        prevLengthOfResidence: '',
        hasPreviousAddress: false,

        // Employment
        employmentStatus: EmploymentStatus.FULL_TIME,
        employerName: '',
        jobTitle: '',
        monthlyIncome: '',
        yearsAtJob: '',
        employerPhone: '',

        // Landlord Reference
        landlordName: '',
        landlordPhone: '',
        rentalPeriod: '',
        previousRent: '',
        hasLandlordReference: false,

        // Consent
        agreedToTerms: false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const validateStep = (currentStep: number): boolean => {
        setError(null);

        switch (currentStep) {
            case 1: // Personal Info
                if (!formData.firstName || !formData.lastName) {
                    setError('First and last name are required');
                    return false;
                }
                if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dateOfBirth)) {
                    setError('Date of birth must be in YYYY-MM-DD format');
                    return false;
                }
                if (!/^\d{4}$/.test(formData.ssnLast4)) {
                    setError('SSN last 4 digits must be exactly 4 numbers');
                    return false;
                }
                if (!formData.email || !formData.phoneNumber) {
                    setError('Email and phone number are required');
                    return false;
                }
                break;

            case 2: // Current Address
                if (!formData.street || !formData.city || !formData.state || !formData.zipCode) {
                    setError('All address fields are required');
                    return false;
                }
                if (!formData.lengthOfResidence || parseInt(formData.lengthOfResidence) < 0) {
                    setError('Length of residence is required');
                    return false;
                }
                break;

            case 3: // Employment
                if (!formData.monthlyIncome || parseFloat(formData.monthlyIncome) <= 0) {
                    setError('Valid monthly income is required');
                    return false;
                }
                if (formData.employmentStatus !== EmploymentStatus.UNEMPLOYED) {
                    if (!formData.employerName || !formData.jobTitle) {
                        setError('Employer name and job title are required');
                        return false;
                    }
                }
                break;

            case 4: // Consent
                if (!formData.agreedToTerms) {
                    setError('You must agree to the terms and conditions');
                    return false;
                }
                break;
        }

        return true;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        setError(null);
        setStep(prev => prev - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConnected || !address) {
            setError('Please connect your wallet');
            return;
        }

        if (!validateStep(4)) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Sign consent message
            const consentMessage = `I authorize the credit check for property ${propertyId}`;
            const signature = await signMessageAsync({ message: consentMessage });

            // Build request
            const request: CreditCheckRequest = {
                propertyId,
                leaseId,
                walletAddress: address,
                personalInfo: {
                    firstName: formData.firstName,
                    middleName: formData.middleName || undefined,
                    lastName: formData.lastName,
                    dateOfBirth: formData.dateOfBirth,
                    ssnLast4: formData.ssnLast4,
                    phoneNumber: formData.phoneNumber,
                    email: formData.email,
                },
                currentAddress: {
                    street: formData.street,
                    unit: formData.unit || undefined,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode,
                    country: formData.country,
                    lengthOfResidence: parseInt(formData.lengthOfResidence),
                },
                previousAddress: formData.hasPreviousAddress ? {
                    street: formData.prevStreet,
                    city: formData.prevCity,
                    state: formData.prevState,
                    zipCode: formData.prevZipCode,
                    lengthOfResidence: parseInt(formData.prevLengthOfResidence),
                } : undefined,
                employment: {
                    status: formData.employmentStatus,
                    employerName: formData.employerName || undefined,
                    jobTitle: formData.jobTitle || undefined,
                    monthlyIncome: parseFloat(formData.monthlyIncome),
                    yearsAtJob: formData.yearsAtJob ? parseFloat(formData.yearsAtJob) : undefined,
                    employerPhone: formData.employerPhone || undefined,
                },
                landlordReference: formData.hasLandlordReference ? {
                    name: formData.landlordName,
                    phone: formData.landlordPhone,
                    rentalPeriod: formData.rentalPeriod,
                    monthlyRent: parseFloat(formData.previousRent),
                } : undefined,
                consent: {
                    agreedToTerms: formData.agreedToTerms,
                    signature,
                    timestamp: Date.now(),
                },
            };

            // Submit credit check
            const response = await fetch('/api/credit-check/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Credit check failed');
            }

            console.log('Credit check completed:', data.data);

            // Save to database
            await fetch('/api/data/credit-checks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leaseId,
                    propertyId,
                    tenantAddress: address,
                    creditScore: data.data.creditScore,
                    passed: data.data.passed,
                    verificationId: data.data.verificationId,
                    fullReport: data.data,
                }),
            });

            onSuccess?.(data.data);

        } catch (err: any) {
            console.error('Credit check error:', err);
            setError(err.message || 'Failed to complete credit check');
        } finally {
            setLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Please connect your wallet to continue</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Progress Indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {['Personal', 'Address', 'Employment', 'Review'].map((label, index) => (
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
                            {index < 3 && (
                                <div
                                    className={`h-1 w-20 mx-2 ${
                                        step > index + 1 ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-600">
                    {['Personal Info', 'Address', 'Employment', 'Review & Submit'].map((label) => (
                        <span key={label} className="w-24 text-center">
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Income Requirement Notice */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                    <strong>Income Requirement:</strong> Your monthly income must be at least{' '}
                    <strong>3x</strong> the monthly rent (${rentAmount.toFixed(2)}).
                    Minimum required: <strong>${(rentAmount * 3).toFixed(2)}/month</strong>
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
                {/* Step 1: Personal Information */}
                {step === 1 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Personal Information</h2>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Name *
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Middle Name
                                </label>
                                <input
                                    type="text"
                                    name="middleName"
                                    value={formData.middleName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Name *
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date of Birth * (YYYY-MM-DD)
                                </label>
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    SSN/ID Last 4 Digits *
                                </label>
                                <input
                                    type="text"
                                    name="ssnLast4"
                                    value={formData.ssnLast4}
                                    onChange={handleChange}
                                    maxLength={4}
                                    pattern="\d{4}"
                                    placeholder="1234"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                    placeholder="(555) 123-4567"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 mt-4">
                            * All information is encrypted and used solely for credit verification purposes
                        </p>
                    </div>
                )}

                {/* Step 2: Current Address */}
                {step === 2 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Current Address</h2>

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

                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Unit/Apt
                                </label>
                                <input
                                    type="text"
                                    name="unit"
                                    value={formData.unit}
                                    onChange={handleChange}
                                    placeholder="Apt 4B"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="col-span-3">
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
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    State *
                                </label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    placeholder="CA"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ZIP Code *
                                </label>
                                <input
                                    type="text"
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleChange}
                                    placeholder="94102"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Months Here *
                                </label>
                                <input
                                    type="number"
                                    name="lengthOfResidence"
                                    value={formData.lengthOfResidence}
                                    onChange={handleChange}
                                    min="0"
                                    placeholder="12"
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Country *
                            </label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Employment */}
                {step === 3 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Employment Information</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Employment Status *
                            </label>
                            <select
                                name="employmentStatus"
                                value={formData.employmentStatus}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={EmploymentStatus.FULL_TIME}>Full-Time</option>
                                <option value={EmploymentStatus.PART_TIME}>Part-Time</option>
                                <option value={EmploymentStatus.SELF_EMPLOYED}>Self-Employed</option>
                                <option value={EmploymentStatus.CONTRACT}>Contract/Freelance</option>
                                <option value={EmploymentStatus.UNEMPLOYED}>Unemployed</option>
                                <option value={EmploymentStatus.RETIRED}>Retired</option>
                                <option value={EmploymentStatus.STUDENT}>Student</option>
                            </select>
                        </div>

                        {formData.employmentStatus !== EmploymentStatus.UNEMPLOYED && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Employer Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="employerName"
                                            value={formData.employerName}
                                            onChange={handleChange}
                                            placeholder="Company Inc."
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Job Title *
                                        </label>
                                        <input
                                            type="text"
                                            name="jobTitle"
                                            value={formData.jobTitle}
                                            onChange={handleChange}
                                            placeholder="Software Engineer"
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Years at Job
                                        </label>
                                        <input
                                            type="number"
                                            name="yearsAtJob"
                                            value={formData.yearsAtJob}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.5"
                                            placeholder="2.5"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Employer Phone
                                        </label>
                                        <input
                                            type="tel"
                                            name="employerPhone"
                                            value={formData.employerPhone}
                                            onChange={handleChange}
                                            placeholder="(555) 987-6543"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Monthly Income (before taxes) *
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-3 text-gray-500 text-lg">$</span>
                                <input
                                    type="number"
                                    name="monthlyIncome"
                                    value={formData.monthlyIncome}
                                    onChange={handleChange}
                                    min="0"
                                    step="100"
                                    placeholder="5000"
                                    required
                                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            {formData.monthlyIncome && parseFloat(formData.monthlyIncome) < rentAmount * 3 && (
                                <p className="mt-2 text-sm text-red-600">
                                    ⚠️ Your income is below the required 3x monthly rent
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Review & Consent */}
                {step === 4 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Review & Consent</h2>

                        {/* Summary */}
                        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Personal Information</h3>
                                <p className="text-gray-700">
                                    {formData.firstName} {formData.middleName} {formData.lastName}
                                </p>
                                <p className="text-gray-600 text-sm">
                                    DOB: {formData.dateOfBirth} | SSN: ***-**-{formData.ssnLast4}
                                </p>
                                <p className="text-gray-600 text-sm">
                                    {formData.email} | {formData.phoneNumber}
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Current Address</h3>
                                <p className="text-gray-700">
                                    {formData.street} {formData.unit && `#${formData.unit}`}
                                </p>
                                <p className="text-gray-600 text-sm">
                                    {formData.city}, {formData.state} {formData.zipCode}
                                </p>
                                <p className="text-gray-600 text-sm">
                                    Living here for {formData.lengthOfResidence} months
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Employment</h3>
                                <p className="text-gray-700">
                                    {formData.jobTitle || 'N/A'} at {formData.employerName || 'N/A'}
                                </p>
                                <p className="text-gray-600 text-sm">
                                    Status: {formData.employmentStatus.replace('_', ' ')}
                                </p>
                                <p className="text-gray-600 text-sm">
                                    Monthly Income: ${parseFloat(formData.monthlyIncome).toLocaleString()}
                                </p>
                                {formData.monthlyIncome && (
                                    <p className={`text-sm font-semibold mt-1 ${
                                        parseFloat(formData.monthlyIncome) >= rentAmount * 3
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                    }`}>
                                        {parseFloat(formData.monthlyIncome) >= rentAmount * 3
                                            ? '✓ Meets income requirement'
                                            : '✗ Below income requirement'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="border border-gray-300 rounded-lg p-6 bg-white">
                            <h3 className="font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
                            <div className="text-sm text-gray-700 space-y-2 max-h-48 overflow-y-auto">
                                <p>
                                    By submitting this application, I authorize the landlord and/or their agent to:
                                </p>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>Verify the information I have provided</li>
                                    <li>Obtain consumer credit reports from credit bureaus</li>
                                    <li>Contact current and previous employers</li>
                                    <li>Contact current and previous landlords</li>
                                    <li>Use the information for rental screening purposes</li>
                                </ul>
                                <p className="mt-3">
                                    I certify that all information provided is true and accurate. I understand that
                                    false information may result in denial or termination of the tenancy.
                                </p>
                                <p className="text-xs text-gray-500 mt-3">
                                    This authorization is provided in accordance with the Fair Credit Reporting Act
                                    (FCRA). Your information is encrypted and will be stored securely on the blockchain.
                                </p>
                            </div>
                        </div>

                        <label className="flex items-start">
                            <input
                                type="checkbox"
                                name="agreedToTerms"
                                checked={formData.agreedToTerms}
                                onChange={handleChange}
                                required
                                className="mt-1 mr-3 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                                I have read and agree to the terms and conditions above, and I authorize the credit
                                check for this rental application *
                            </span>
                        </label>
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

                    {step === 1 && onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading}
                            className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    )}

                    {step < 4 ? (
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
                            disabled={loading || !formData.agreedToTerms}
                            className="ml-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center"
                        >
                            {loading ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5 mr-2"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>📋 Submit Credit Check</>
                            )}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
