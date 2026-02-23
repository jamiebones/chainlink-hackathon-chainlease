// components/CreditCheckResult.tsx
// Display comprehensive credit check results

'use client';

import { CreditCheckResponse, CreditRiskLevel } from '@/types/credit-check';

interface CreditCheckResultProps {
    result: CreditCheckResponse;
    onClose?: () => void;
    showActions?: boolean;
    onAccept?: () => void;
    onReject?: () => void;
}

export default function CreditCheckResult({
    result,
    onClose,
    showActions = false,
    onAccept,
    onReject,
}: CreditCheckResultProps) {
    const getRiskLevelColor = (riskLevel: CreditRiskLevel) => {
        switch (riskLevel) {
            case CreditRiskLevel.EXCELLENT:
                return 'text-green-700 bg-green-50 border-green-200';
            case CreditRiskLevel.GOOD:
                return 'text-blue-700 bg-blue-50 border-blue-200';
            case CreditRiskLevel.FAIR:
                return 'text-yellow-700 bg-yellow-50 border-yellow-200';
            case CreditRiskLevel.POOR:
                return 'text-red-700 bg-red-50 border-red-200';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 740) return 'text-green-600';
        if (score >= 670) return 'text-blue-600';
        if (score >= 580) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getProgressColor = (score: number) => {
        if (score >= 740) return 'bg-green-500';
        if (score >= 670) return 'bg-blue-500';
        if (score >= 580) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            Credit Check Results
                        </h2>
                        <p className="text-gray-600">
                            Verification ID: <code className="text-xs">{result.verificationId}</code>
                        </p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </button>
                    )}
                </div>

                {/* Overall Status */}
                <div
                    className={`p-6 rounded-lg border-2 mb-6 ${
                        result.passed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3
                                className={`text-2xl font-bold mb-2 ${
                                    result.passed ? 'text-green-800' : 'text-red-800'
                                }`}
                            >
                                {result.passed ? '✓ Approved' : '✗ Not Approved'}
                            </h3>
                            <p className={result.passed ? 'text-green-700' : 'text-red-700'}>
                                {result.passed
                                    ? 'Applicant meets all credit requirements'
                                    : 'Applicant does not meet all requirements'}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-600 mb-1">Confidence</div>
                            <div className="text-3xl font-bold text-gray-900">
                                {result.recommendation.confidence}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Credit Score Display */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">Credit Score</div>
                        <div className={`text-5xl font-bold mb-4 ${getScoreColor(result.creditScore)}`}>
                            {result.creditScore}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                            <div
                                className={`h-3 rounded-full ${getProgressColor(result.creditScore)}`}
                                style={{ width: `${(result.creditScore / 850) * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>300</span>
                            <span>850</span>
                        </div>
                    </div>

                    <div className="text-center p-6 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">Risk Level</div>
                        <div
                            className={`inline-block px-6 py-3 rounded-lg border-2 font-bold text-xl mt-4 ${getRiskLevelColor(
                                result.riskLevel
                            )}`}
                        >
                            {result.riskLevel}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Report */}
            {result.report && (
                <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Detailed Report</h3>

                    {/* Payment History */}
                    {result.report.paymentHistory && (
                        <div className="mb-6 pb-6 border-b">
                            <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                💳 Payment History
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-green-700">
                                        {result.report.paymentHistory.onTimePayments}%
                                    </div>
                                    <div className="text-sm text-gray-600">On-Time Payments</div>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-700">
                                        {result.report.paymentHistory.latePayments}
                                    </div>
                                    <div className="text-sm text-gray-600">Late Payments</div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-red-700">
                                        {result.report.paymentHistory.missedPayments}
                                    </div>
                                    <div className="text-sm text-gray-600">Missed Payments</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Debt Analysis */}
                    {result.report.debt && (
                        <div className="mb-6 pb-6 border-b">
                            <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                📊 Debt Analysis
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Total Debt:</span>
                                    <span className="font-semibold text-gray-900">
                                        ${result.report.debt.totalDebt.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Debt-to-Income Ratio:</span>
                                    <span
                                        className={`font-semibold ${
                                            result.report.debt.debtToIncomeRatio <= 36
                                                ? 'text-green-600'
                                                : result.report.debt.debtToIncomeRatio <= 43
                                                ? 'text-yellow-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {result.report.debt.debtToIncomeRatio}%
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Available Credit:</span>
                                    <span className="font-semibold text-gray-900">
                                        ${result.report.debt.availableCredit.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Public Records */}
                    {result.report.publicRecords && (
                        <div className="mb-6 pb-6 border-b">
                            <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                ⚖️ Public Records
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-gray-700">Bankruptcies:</span>
                                    <span className="font-semibold">
                                        {result.report.publicRecords.bankruptcies}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-gray-700">Foreclosures:</span>
                                    <span className="font-semibold">
                                        {result.report.publicRecords.foreclosures}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-gray-700">Evictions:</span>
                                    <span className="font-semibold text-red-600">
                                        {result.report.publicRecords.evictions}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <span className="text-gray-700">Collections:</span>
                                    <span className="font-semibold">
                                        {result.report.publicRecords.collections}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rental History */}
                    {result.report.rentalHistory && (
                        <div className="mb-6 pb-6 border-b">
                            <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                🏠 Rental History
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Total Rentals:</span>
                                    <span className="font-semibold text-gray-900">
                                        {result.report.rentalHistory.totalRentals}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Evictions:</span>
                                    <span
                                        className={`font-semibold ${
                                            result.report.rentalHistory.evictions === 0
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {result.report.rentalHistory.evictions}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Late Payments:</span>
                                    <span className="font-semibold text-gray-900">
                                        {result.report.rentalHistory.latePayments}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Income Verification */}
                    {result.report.incomeVerification && (
                        <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                💼 Income Verification
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Monthly Income:</span>
                                    <span className="font-semibold text-gray-900">
                                        ${result.report.incomeVerification.monthlyIncome.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Employment Status:</span>
                                    <span className="font-semibold text-gray-900">
                                        {result.report.incomeVerification.employmentStatus}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Income Stability:</span>
                                    <span
                                        className={`font-semibold ${
                                            result.report.incomeVerification.incomeStability === 'Stable'
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {result.report.incomeVerification.incomeStability}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Meets 3x Rent Requirement:</span>
                                    <span
                                        className={`font-semibold ${
                                            result.report.incomeVerification.meetsRequirement
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {result.report.incomeVerification.meetsRequirement
                                            ? 'Yes'
                                            : 'No'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Recommendations */}
            {result.recommendation && (
                <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                        Recommendations & Conditions
                    </h3>

                    {result.recommendation.suggestedDeposit && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="font-semibold text-blue-900 mb-2">
                                Suggested Security Deposit
                            </div>
                            <div className="text-blue-800">
                                {result.recommendation.suggestedDeposit}x monthly rent
                            </div>
                        </div>
                    )}

                    {result.recommendation.conditions && result.recommendation.conditions.length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-semibold text-gray-800 mb-3">Conditions:</h4>
                            <ul className="space-y-2">
                                {result.recommendation.conditions.map((condition: string, index: number) => (
                                    <li
                                        key={index}
                                        className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                                    >
                                        <span className="text-yellow-600 mr-2">⚠️</span>
                                        <span className="text-gray-800">{condition}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {result.recommendation.reasoning && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-2">Analysis:</h4>
                            <p className="text-gray-700">{result.recommendation.reasoning}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            {showActions && (onAccept || onReject) && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Landlord Decision
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Based on the credit report above, would you like to approve or reject this
                        application?
                    </p>
                    <div className="flex gap-4">
                        {onAccept && (
                            <button
                                onClick={onAccept}
                                className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                            >
                                ✓ Approve Application
                            </button>
                        )}
                        {onReject && (
                            <button
                                onClick={onReject}
                                className="flex-1 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                            >
                                ✗ Reject Application
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Timestamp */}
            <div className="text-center text-sm text-gray-500 mt-6">
                Report generated on {new Date(result.timestamp).toLocaleString()}
            </div>
        </div>
    );
}
