// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ILeaseAgreement
 * @notice Interface for LeaseAgreement contract
 */
interface ILeaseAgreement {
    enum LeaseState {
        Draft,
        PendingApproval,
        Active,
        Completed,
        Terminated,
        Disputed
    }

    struct Lease {
        uint256 leaseId;
        uint256 propertyId;
        address landlord;
        address tenant;
        uint256 monthlyRent;
        uint256 securityDeposit;
        uint256 startDate;
        uint256 endDate;
        uint256 duration;
        LeaseState state;
        bytes32 worldIdNullifierHash;
        bool creditCheckPassed;
        uint256 lastPaymentDate;
        uint256 createdAt;
    }

    event LeaseCreated(
        uint256 indexed leaseId,
        uint256 indexed propertyId,
        address indexed tenant,
        address landlord,
        uint256 monthlyRent
    );

    event LeaseStateChanged(uint256 indexed leaseId, LeaseState newState);

    event CreditCheckCompleted(
        uint256 indexed leaseId,
        bool passed,
        string verificationId
    );

    event RentPaymentReceived(
        uint256 indexed leaseId,
        address indexed tenant,
        uint256 amount,
        uint256 timestamp
    );

    event SecurityDepositPaid(
        uint256 indexed leaseId,
        address indexed tenant,
        uint256 amount
    );

    function createLease(
        uint256 propertyId,
        uint256 monthlyRent,
        uint256 securityDeposit,
        uint256 duration,
        bytes32 worldIdNullifierHash
    ) external returns (uint256);

    function updateCreditCheckStatus(
        uint256 leaseId,
        bool passed,
        string memory verificationId
    ) external;

    function depositSecurityDeposit(uint256 leaseId) external payable;

    function activateLease(uint256 leaseId) external;

    function payRent(uint256 leaseId) external payable;

    function completeLease(uint256 leaseId) external;

    function terminateLease(uint256 leaseId) external;

    function getLease(uint256 leaseId) external view returns (Lease memory);

    function getTenantLeases(
        address tenant
    ) external view returns (uint256[] memory);

    function getLandlordLeases(
        address landlord
    ) external view returns (uint256[] memory);
}
