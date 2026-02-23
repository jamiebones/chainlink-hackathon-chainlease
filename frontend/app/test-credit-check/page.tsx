// app/test-credit-check/page.tsx
// Test page for credit check form and result display

'use client';

import { useState } from 'react';
import CreditCheckForm from '@/components/CreditCheckForm';
import CreditCheckResult from '@/components/CreditCheckResult';
import { CreditCheckResponse } from '@/types/credit-check';

export default function TestCreditCheckPage() {
    const [result, setResult] = useState<CreditCheckResponse | null>(null);
    const [showForm, setShowForm] = useState(true);

    // Mock property details
    const mockPropertyId = 'test-property-123';
    const mockRentAmount = 2500;

    const handleCreditCheckSuccess = (checkResult: CreditCheckResponse) => {
        console.log('Credit check completed:', checkResult);
        setResult(checkResult);
        setShowForm(false);
    };

    const handleReset = () => {
        setResult(null);
        setShowForm(true);
    };

    const handleAccept = () => {
        alert('Application ACCEPTED! In production, this would activate the lease.');
        console.log('Landlord accepted application for verification:', result?.verificationId);
    };

    const handleReject = () => {
        alert('Application REJECTED! In production, this would notify the tenant.');
        console.log('Landlord rejected application for verification:', result?.verificationId);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Credit Check System Test
                    </h1>
                    <p className="text-lg text-gray-600">
                        Complete the form below to test the credit verification process
                    </p>

                    {/* Test Info */}
                    <div className="mt-6 inline-block bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
                        <h3 className="font-semibold text-blue-900 mb-3">Test Property Details</h3>
                        <div className="space-y-2 text-sm text-blue-800">
                            <p>
                                <strong>Property ID:</strong> {mockPropertyId}
                            </p>
                            <p>
                                <strong>Monthly Rent:</strong> ${mockRentAmount.toLocaleString()}
                            </p>
                            <p>
                                <strong>Required Income:</strong> $
                                {(mockRentAmount * 3).toLocaleString()} (3x rent)
                            </p>
                        </div>
                    </div>

                    {/* Tips */}
                    {showForm && (
                        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-left max-w-2xl mx-auto">
                            <h3 className="font-semibold text-yellow-900 mb-3">💡 Testing Tips</h3>
                            <ul className="space-y-2 text-sm text-yellow-800">
                                <li>
                                    • <strong>High Score Test:</strong> Set monthly income to $10,000+
                                    and employment status to Full-Time for excellent rating
                                </li>
                                <li>
                                    • <strong>Low Score Test:</strong> Set monthly income to $5,000
                                    and employment status to Unemployed for poor rating
                                </li>
                                <li>
                                    • <strong>Borderline Test:</strong> Set income to exactly $7,500
                                    (3x rent) to see fair rating
                                </li>
                                <li>
                                    • Different employment statuses, income levels, and job tenure
                                    affect the final credit score
                                </li>
                                <li>
                                    • The system calculates scores based on employment stability,
                                    income-to-rent ratio, and other factors
                                </li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Form or Result */}
                {showForm && !result ? (
                    <div className="mt-8">
                        <CreditCheckForm
                            propertyId={mockPropertyId}
                            rentAmount={mockRentAmount}
                            onSuccess={handleCreditCheckSuccess}
                            onCancel={() => alert('Form cancelled')}
                        />
                    </div>
                ) : result ? (
                    <div className="mt-8">
                        <CreditCheckResult
                            result={result}
                            showActions={true}
                            onAccept={handleAccept}
                            onReject={handleReject}
                        />

                        {/* Reset Button */}
                        <div className="text-center mt-8">
                            <button
                                onClick={handleReset}
                                className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                ← Test Again with Different Data
                            </button>
                        </div>
                    </div>
                ) : null}

                {/* API Testing Section */}
                <div className="mt-12 bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        API Testing Guide
                    </h2>

                    <div className="space-y-6 text-sm">
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2">
                                1. Credit Verification API
                            </h3>
                            <div className="bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto">
                                <code className="text-xs">
                                    POST /api/credit-check/verify
                                    <br />
                                    <br />
                                    {'{'} <br />
                                    &nbsp;&nbsp;"propertyId": "property-123", <br />
                                    &nbsp;&nbsp;"walletAddress": "0x123...", <br />
                                    &nbsp;&nbsp;"personalInfo": {'{'} ... {'}'}, <br />
                                    &nbsp;&nbsp;"employment": {'{'} "monthlyIncome": 8000 {'}'}
                                    <br />
                                    {'}'}
                                </code>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2">
                                2. Save Credit Check Result
                            </h3>
                            <div className="bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto">
                                <code className="text-xs">
                                    POST /api/data/credit-checks
                                    <br />
                                    <br />
                                    {'{'} <br />
                                    &nbsp;&nbsp;"propertyId": "property-123", <br />
                                    &nbsp;&nbsp;"tenantAddress": "0x123...", <br />
                                    &nbsp;&nbsp;"creditScore": 720, <br />
                                    &nbsp;&nbsp;"passed": true, <br />
                                    &nbsp;&nbsp;"verificationId": "cred-verify-..." <br />
                                    {'}'}
                                </code>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2">
                                3. Retrieve Credit Checks
                            </h3>
                            <div className="bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto">
                                <code className="text-xs">
                                    GET /api/data/credit-checks?propertyId=property-123
                                    <br />
                                    GET /api/data/credit-checks?tenantAddress=0x123...
                                    <br />
                                    GET /api/data/credit-checks?verificationId=cred-verify-...
                                </code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature Overview */}
                <div className="mt-12 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        ✨ Credit Check System Features
                    </h2>

                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2">
                                📊 Comprehensive Scoring
                            </h3>
                            <ul className="space-y-1 text-gray-700">
                                <li>• Employment status evaluation</li>
                                <li>• Income-to-rent ratio analysis</li>
                                <li>• Debt-to-income calculations</li>
                                <li>• Payment history assessment</li>
                                <li>• Public records check</li>
                                <li>• Rental history verification</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2">
                                🔒 Security & Privacy
                            </h3>
                            <ul className="space-y-1 text-gray-700">
                                <li>• Wallet signature for consent</li>
                                <li>• SSN last 4 digits only</li>
                                <li>• Encrypted data storage</li>
                                <li>• Blockchain verification</li>
                                <li>• FCRA compliance ready</li>
                                <li>• Secure report generation</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2">
                                📝 Detailed Reporting
                            </h3>
                            <ul className="space-y-1 text-gray-700">
                                <li>• Credit score (300-850)</li>
                                <li>• Risk level classification</li>
                                <li>• Confidence percentage</li>
                                <li>• Approval/denial reasoning</li>
                                <li>• Conditional requirements</li>
                                <li>• Deposit recommendations</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-800 mb-2">
                                🎯 Smart Decisions
                            </h3>
                            <ul className="space-y-1 text-gray-700">
                                <li>• Automatic pass/fail determination</li>
                                <li>• DTI ratio validation (≤43%)</li>
                                <li>• 3x income requirement check</li>
                                <li>• Eviction history screening</li>
                                <li>• Bankruptcy detection</li>
                                <li>• Employment stability analysis</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
