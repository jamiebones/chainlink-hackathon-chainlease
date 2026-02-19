
import {
    HTTPSendRequester, ok,
} from "@chainlink/cre-sdk";
import type { Config, CreditCheckResponse, LeaseData } from "./types";

/**
 * Performs credit check via external API service
 * @param sendRequester - HTTPSendRequester instance for sending requests
 * @param dataToSend - Lease data including tenant address
 * @returns Credit check response with score and approval status
 */

export function fetchCreditCheck(sendRequester: HTTPSendRequester,
    config: Config,
    dataToSend: LeaseData
): CreditCheckResponse {

    const bodyBytes = new TextEncoder().encode(JSON.stringify(dataToSend))
    const body = Buffer.from(bodyBytes).toString("base64");

    const req = {
        url: config.creditCheckApi.endpoint,
        method: "POST" as const,
        body,
        headers: {
            "Content-Type": "application/json",
        },
        cacheSettings: {
            readFromCache: true, // Enable reading from cache
            maxAgeMs: 60000, // Accept cached responses up to 60 seconds old
        },
    }

    try {
        const resp = sendRequester.sendRequest(req as any).result();
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