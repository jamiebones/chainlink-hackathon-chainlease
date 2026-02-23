
import {
    HTTPSendRequester, ok,
} from "@chainlink/cre-sdk";
import type { Config, CreditCheckResponse, LeaseData } from "./types";

/**
 * Performs credit check via external API service
 * @param sendRequester - HTTPSendRequester instance for sending requests
 * @param config - Workflow configuration
 * @param dataToSend - Lease data including tenant address
 * @returns Credit check response with score and approval status
 */

export function fetchCreditCheck(sendRequester: HTTPSendRequester,
    config: Config,
    dataToSend: LeaseData
): CreditCheckResponse {

    // Build query parameters for GET request (simplified for simulation)
    const queryParams = new URLSearchParams({
        tenantAddress: dataToSend.tenantAddress,
    });

    const req = {
        url: `${config.creditCheckApi.endpoint}?${queryParams.toString()}`,
        method: "GET" as const,
        headers: {
            "Authorization": `Bearer ${config.creditCheckApi.apiKey}`,
            "Content-Type": "application/json",
        },
    }

    try {
        const resp = sendRequester.sendRequest(req).result();
        if (!ok(resp)) {
            throw new Error(`HTTP request failed with status: ${resp.statusCode}`)
        }
        const bodyText = new TextDecoder().decode(resp.body);
        const data = JSON.parse(bodyText) as CreditCheckResponse;

        return {
            ...data,
            statusCode: resp.statusCode,
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
            leaseId: dataToSend.leaseId.toString(),
            tenantAddress: dataToSend.tenantAddress,
            creditScore: 0,
            passed: false,
            riskLevel: "high",
            verificationId: "error",
            statusCode: 500,
        };
    }

}