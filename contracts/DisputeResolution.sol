// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DisputeResolution
 * @notice Handles disputes between landlords and tenants
 * @dev Simple arbitration system for lease disputes
 */
contract DisputeResolution is ReentrancyGuard, Ownable {
    enum DisputeStatus {
        Open,
        UnderReview,
        Resolved,
        Cancelled
    }

    enum DisputeOutcome {
        Pending,
        FavorLandlord,
        FavorTenant,
        Split,
        Dismissed
    }

    struct Dispute {
        uint256 disputeId;
        uint256 leaseId;
        address landlord;
        address tenant;
        address initiator;
        string reason;
        string evidence; // IPFS hash or URL
        DisputeStatus status;
        DisputeOutcome outcome;
        uint256 createdAt;
        uint256 resolvedAt;
        address resolver; // Arbitrator address
        string resolutionNotes;
    }

    uint256 private _disputeIdCounter;
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => uint256[]) public leaseDisputes; // leaseId => disputeIds
    mapping(address => bool) public arbitrators;

    uint256 public constant DISPUTE_FEE = 0.01 ether;

    event DisputeCreated(
        uint256 indexed disputeId,
        uint256 indexed leaseId,
        address indexed initiator,
        string reason
    );

    event DisputeStatusChanged(
        uint256 indexed disputeId,
        DisputeStatus newStatus
    );

    event DisputeResolved(
        uint256 indexed disputeId,
        DisputeOutcome outcome,
        address resolver
    );

    event ArbitratorAdded(address indexed arbitrator);
    event ArbitratorRemoved(address indexed arbitrator);

    modifier onlyArbitrator() {
        require(
            arbitrators[msg.sender] || msg.sender == owner(),
            "Not arbitrator"
        );
        _;
    }

    constructor() Ownable(msg.sender) {
        // Owner is default arbitrator
        arbitrators[msg.sender] = true;
    }

    /**
     * @notice File a dispute for a lease
     * @param leaseId Lease ID
     * @param landlord Landlord address
     * @param tenant Tenant address
     * @param reason Description of the dispute
     * @param evidence IPFS hash or URL with supporting evidence
     * @return disputeId ID of created dispute
     */
    function fileDispute(
        uint256 leaseId,
        address landlord,
        address tenant,
        string memory reason,
        string memory evidence
    ) external payable nonReentrant returns (uint256) {
        require(msg.value >= DISPUTE_FEE, "Insufficient dispute fee");
        require(
            msg.sender == landlord || msg.sender == tenant,
            "Not party to lease"
        );
        require(bytes(reason).length > 0, "Reason required");

        _disputeIdCounter++;
        uint256 newDisputeId = _disputeIdCounter;

        disputes[newDisputeId] = Dispute({
            disputeId: newDisputeId,
            leaseId: leaseId,
            landlord: landlord,
            tenant: tenant,
            initiator: msg.sender,
            reason: reason,
            evidence: evidence,
            status: DisputeStatus.Open,
            outcome: DisputeOutcome.Pending,
            createdAt: block.timestamp,
            resolvedAt: 0,
            resolver: address(0),
            resolutionNotes: ""
        });

        leaseDisputes[leaseId].push(newDisputeId);

        emit DisputeCreated(newDisputeId, leaseId, msg.sender, reason);

        return newDisputeId;
    }

    /**
     * @notice Update dispute status (arbitrator only)
     * @param disputeId Dispute ID
     * @param newStatus New status
     */
    function updateDisputeStatus(
        uint256 disputeId,
        DisputeStatus newStatus
    ) external onlyArbitrator {
        Dispute storage dispute = disputes[disputeId];
        require(dispute.disputeId != 0, "Dispute not found");
        require(dispute.status != DisputeStatus.Resolved, "Already resolved");

        dispute.status = newStatus;

        emit DisputeStatusChanged(disputeId, newStatus);
    }

    /**
     * @notice Resolve a dispute (arbitrator only)
     * @param disputeId Dispute ID
     * @param outcome Resolution outcome
     * @param resolutionNotes Explanation of resolution
     */
    function resolveDispute(
        uint256 disputeId,
        DisputeOutcome outcome,
        string memory resolutionNotes
    ) external onlyArbitrator nonReentrant {
        Dispute storage dispute = disputes[disputeId];
        require(dispute.disputeId != 0, "Dispute not found");
        require(dispute.status != DisputeStatus.Resolved, "Already resolved");
        require(outcome != DisputeOutcome.Pending, "Invalid outcome");

        dispute.status = DisputeStatus.Resolved;
        dispute.outcome = outcome;
        dispute.resolvedAt = block.timestamp;
        dispute.resolver = msg.sender;
        dispute.resolutionNotes = resolutionNotes;

        emit DisputeResolved(disputeId, outcome, msg.sender);
    }

    /**
     * @notice Cancel a dispute (initiator only, before review)
     * @param disputeId Dispute ID
     */
    function cancelDispute(uint256 disputeId) external nonReentrant {
        Dispute storage dispute = disputes[disputeId];
        require(dispute.initiator == msg.sender, "Not initiator");
        require(dispute.status == DisputeStatus.Open, "Cannot cancel");

        dispute.status = DisputeStatus.Cancelled;

        // Refund dispute fee
        (bool success, ) = payable(msg.sender).call{value: DISPUTE_FEE}("");
        require(success, "Refund failed");

        emit DisputeStatusChanged(disputeId, DisputeStatus.Cancelled);
    }

    /**
     * @notice Add an arbitrator
     * @param arbitrator Address to add as arbitrator
     */
    function addArbitrator(address arbitrator) external onlyOwner {
        require(arbitrator != address(0), "Invalid address");
        require(!arbitrators[arbitrator], "Already arbitrator");

        arbitrators[arbitrator] = true;

        emit ArbitratorAdded(arbitrator);
    }

    /**
     * @notice Remove an arbitrator
     * @param arbitrator Address to remove
     */
    function removeArbitrator(address arbitrator) external onlyOwner {
        require(arbitrators[arbitrator], "Not arbitrator");

        arbitrators[arbitrator] = false;

        emit ArbitratorRemoved(arbitrator);
    }

    /**
     * @notice Get all disputes for a lease
     * @param leaseId Lease ID
     * @return Array of dispute IDs
     */
    function getLeaseDisputes(
        uint256 leaseId
    ) external view returns (uint256[] memory) {
        return leaseDisputes[leaseId];
    }

    /**
     * @notice Get dispute details
     * @param disputeId Dispute ID
     * @return Dispute struct
     */
    function getDispute(
        uint256 disputeId
    ) external view returns (Dispute memory) {
        return disputes[disputeId];
    }

    /**
     * @notice Check if address is arbitrator
     * @param account Address to check
     * @return bool Whether address is arbitrator
     */
    function isArbitrator(address account) external view returns (bool) {
        return arbitrators[account];
    }

    /**
     * @notice Withdraw collected dispute fees (owner only)
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
