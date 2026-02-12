// credit-check.ts
// External credit check API integration

import { HTTPClient, type NodeRuntime } from "@chainlink/cre-sdk";
import type { Config, CreditCheckResponse } from "./types";

/**
 * Performs credit check via external API service
 * 
 * This function runs in node mode to fetch credit data with consensus.
 * Uses HTTPClient to call external credit bureau API.
 * 
 * @param nodeRuntime - CRE node runtime with config
 * @param leaseId - Lease ID from the smart contract
 * @param tenantAddress - Ethereum address of the tenant
 * @returns Credit check response with score and approval status
 */
export function fetchCreditCheck(
    nodeRuntime: NodeRuntime<Config>,
    leaseId: string,
    tenantAddress: string
): CreditCheckResponse {
    const { creditCheckApi } = nodeRuntime.config;
    const httpClient = new HTTPClient();

    try {
        // Prepare request payload
        const requestBody = JSON.stringify({
            leaseId,
            tenantAddress,
            timestamp: Date.now(),
        });

        // Build HTTP request
        const req = {
            url: creditCheckApi.endpoint,
            method: "POST" as const,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${creditCheckApi.apiKey}`,
                "X-Workflow-Id": "chainlease-credit-check",
            },
            body: requestBody,
        };

        // Send request using HTTPClient
        const response = httpClient.sendRequest(nodeRuntime, req).result();

        // Decode response body
        const bodyText = new TextDecoder().decode(response.body);
        const data = JSON.parse(bodyText) as CreditCheckResponse;

        return {
            ...data,
            statusCode: response.statusCode,
        };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        // Return failed credit check result
        return {
            leaseId,
            tenantAddress,
            creditScore: 0,
            passed: false,
            riskLevel: "high",
            verificationId: "error",
            timestamp: Date.now(),
            statusCode: 500,
        };
    }
}

/**
 * Determines if tenant passes minimum credit requirements
 * 
 * @param creditScore - Numerical credit score (typically 300-850)
 * @param riskLevel - Risk assessment level
 * @returns True if tenant meets minimum requirements
 */
export function evaluateCreditEligibility(
    creditScore: number,
    riskLevel: string
): boolean {
    // Example thresholds (configurable per property/landlord):
    const MIN_CREDIT_SCORE = 620;
    const ACCEPTABLE_RISK_LEVELS = ["low", "medium"];

    return (
        creditScore >= MIN_CREDIT_SCORE &&
        ACCEPTABLE_RISK_LEVELS.includes(riskLevel)
    );
}
