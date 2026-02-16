// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPaymentEscrow
 * @notice Interface for PaymentEscrow contract
 */
interface IPaymentEscrow {
    struct Escrow {
        uint256 leaseId;
        address landlord;
        address tenant;
        uint256 depositAmount;
        uint256 depositedAt;
        bool released;
        bool forfeited;
    }

    event DepositReceived(
        uint256 indexed leaseId,
        address indexed tenant,
        uint256 amount
    );

    event DepositReleased(
        uint256 indexed leaseId,
        address indexed tenant,
        uint256 amount
    );

    event DepositForfeited(
        uint256 indexed leaseId,
        address indexed landlord,
        uint256 amount
    );

    event RentPaid(
        uint256 indexed leaseId,
        address indexed tenant,
        uint256 amount,
        uint256 timestamp
    );

    function depositSecurity(
        uint256 leaseId,
        address landlord
    ) external payable;

    function releaseDeposit(uint256 leaseId) external;

    function forfeitDeposit(uint256 leaseId) external;

    function payRent(uint256 leaseId, address landlord) external payable;

    function calculateLateFee(
        uint256 rentAmount
    ) external pure returns (uint256);

    function isPaymentLate(
        uint256 leaseId,
        uint256 dueDate
    ) external view returns (bool);

    function getPaymentHistory(
        uint256 leaseId
    ) external view returns (uint256[] memory);

    function getTotalPaid(uint256 leaseId) external view returns (uint256);

    function getEscrow(uint256 leaseId) external view returns (Escrow memory);

    function hasDeposit(uint256 leaseId) external view returns (bool);
}
