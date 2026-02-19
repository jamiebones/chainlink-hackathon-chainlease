// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ReceiverTemplate} from "./interfaces/ReceiverTemplate.sol";
import "./PropertyNFT.sol";

/**
 * @title LeaseAgreement
 * @notice Manages lease lifecycle and state transitions
 * @dev Integrates with PropertyNFT, World ID verification, and Chainlink CRE workflows
 * @dev Inherits from ReceiverTemplate to accept credit check results from CRE workflows
 */
contract LeaseAgreement is ReentrancyGuard, ReceiverTemplate {
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
        uint256 duration; // in days
        LeaseState state;
        bytes32 worldIdNullifierHash; // Prevents same tenant applying twice
        bool creditCheckPassed;
        string verificationId; // External credit check verification ID for audit trail
        uint256 lastPaymentDate;
        uint256 createdAt;
    }

    uint256 private _leaseIdCounter;
    mapping(uint256 => Lease) public leases;
    mapping(address => uint256[]) public tenantLeases;
    mapping(address => uint256[]) public landlordLeases;
    mapping(bytes32 => bool) public usedNullifiers; // World ID nullifier tracking
    mapping(uint256 => mapping(uint256 => bool))
        public propertyTenantApplications; // propertyId => tenantAddress hash => applied

    PropertyNFT public propertyNFT;
    address public paymentEscrow;
    address public worldIdVerifier;

    event LeaseCreated(
        uint256 indexed leaseId,
        uint256 indexed propertyId,
        address indexed tenant,
        uint256 monthlyRent
    );

    event LeaseStateChanged(
        uint256 indexed leaseId,
        LeaseState oldState,
        LeaseState newState
    );

    event CreditCheckCompleted(
        uint256 indexed leaseId,
        uint256 indexed propertyId,
        bool passed,
        string verificationId
    );

    event LeaseActivated(
        uint256 indexed leaseId,
        address indexed tenant,
        address indexed landlord,
        uint256 propertyId,
        uint256 startDate,
        uint256 endDate,
        uint256 monthlyRent
    );

    /// @notice Constructor initializes the contract with PropertyNFT and Forwarder addresses
    /// @param _propertyNFT Address of the PropertyNFT contract
    /// @param _forwarderAddress Address of the Chainlink Forwarder contract for CRE workflows
    constructor(
        address _propertyNFT,
        address _forwarderAddress
    ) ReceiverTemplate(_forwarderAddress) {
        require(_propertyNFT != address(0), "Invalid PropertyNFT address");
        propertyNFT = PropertyNFT(_propertyNFT);
    }

    /**
     * @notice Set PaymentEscrow contract address
     * @param _paymentEscrow PaymentEscrow contract address
     */
    function setPaymentEscrow(address _paymentEscrow) external onlyOwner {
        require(_paymentEscrow != address(0), "Invalid address");
        paymentEscrow = _paymentEscrow;
    }

    /**
     * @notice Set WorldIDVerifier contract address
     * @param _worldIdVerifier WorldIDVerifier contract address
     */
    function setWorldIdVerifier(address _worldIdVerifier) external onlyOwner {
        require(_worldIdVerifier != address(0), "Invalid address");
        worldIdVerifier = _worldIdVerifier;
    }

    /**
     * @notice Create a new lease application
     * @param propertyId Property NFT ID
     * @param duration Lease duration in days
     * @param worldIdNullifierHash World ID nullifier to prevent double-application
     * @return leaseId New lease ID
     */
    function createLease(
        uint256 propertyId,
        uint256 duration,
        bytes32 worldIdNullifierHash
    ) public nonReentrant returns (uint256) {
        require(worldIdNullifierHash != bytes32(0), "Invalid nullifier");
        require(
            !usedNullifiers[worldIdNullifierHash],
            "Already applied with this identity"
        );
        require(duration >= 30 && duration <= 3650, "Duration: 30-3650 days");

        // Verify property exists and is listed
        address landlord = propertyNFT.ownerOf(propertyId);
        require(landlord != address(0), "Property does not exist");

        PropertyNFT.PropertyMetadata memory property = propertyNFT
            .getPropertyMetadata(propertyId);
        require(property.isListed, "Property not listed");
        require(landlord != msg.sender, "Cannot lease own property");

        // Check if tenant already applied for this property
        uint256 tenantHash = uint256(keccak256(abi.encodePacked(msg.sender)));
        require(
            !propertyTenantApplications[propertyId][tenantHash],
            "Already applied for this property"
        );

        _leaseIdCounter++;
        uint256 newLeaseId = _leaseIdCounter;

        leases[newLeaseId] = Lease({
            leaseId: newLeaseId,
            propertyId: propertyId,
            landlord: landlord,
            tenant: msg.sender,
            monthlyRent: property.monthlyRent,
            securityDeposit: property.monthlyRent * 2, // Default: 2 months rent
            startDate: 0,
            endDate: 0,
            duration: duration,
            state: LeaseState.Draft,
            worldIdNullifierHash: worldIdNullifierHash,
            creditCheckPassed: false,
            verificationId: "",
            lastPaymentDate: 0,
            createdAt: block.timestamp
        });

        usedNullifiers[worldIdNullifierHash] = true;
        propertyTenantApplications[propertyId][tenantHash] = true;
        tenantLeases[msg.sender].push(newLeaseId);
        landlordLeases[landlord].push(newLeaseId);

        emit LeaseCreated(
            newLeaseId,
            propertyId,
            msg.sender,
            property.monthlyRent
        );
        return newLeaseId;
    }

    /**
     * @notice Internal hook to process credit check reports from ReceiverTemplate
     * @dev Decodes ABI-encoded data and updates credit check status
     * @param report ABI-encoded data containing (uint256 leaseId, bool passed, string verificationId)
     */
    function _processReport(bytes calldata report) internal override {
        // Decode the report data
        (uint256 leaseId, bool passed, string memory verificationId) = abi
            .decode(report, (uint256, bool, string));

        // Process the credit check result
        _updateCreditCheckStatus(leaseId, passed, verificationId);
    }

    /**
     * @notice Internal function to update credit check status
     * @param leaseId Lease ID
     * @param passed Whether credit check passed
     * @param verificationId External verification ID for audit trail
     */
    function _updateCreditCheckStatus(
        uint256 leaseId,
        bool passed,
        string memory verificationId
    ) internal {
        Lease storage lease = leases[leaseId];
        require(lease.leaseId != 0, "Lease does not exist");
        require(lease.state == LeaseState.Draft, "Invalid state");

        lease.creditCheckPassed = passed;
        lease.verificationId = verificationId;

        if (passed) {
            lease.state = LeaseState.PendingApproval;
            emit LeaseStateChanged(
                leaseId,
                LeaseState.Draft,
                LeaseState.PendingApproval
            );
        }

        emit CreditCheckCompleted(
            leaseId,
            lease.propertyId,
            passed,
            verificationId
        );
    }

    /**
     * @notice Manual override for credit check status (owner only)
     * @dev For emergency use or testing purposes
     * @param leaseId Lease ID
     * @param passed Whether credit check passed
     * @param verificationId Verification ID for audit trail
     */
    function manualCreditCheckOverride(
        uint256 leaseId,
        bool passed,
        string memory verificationId
    ) external onlyOwner {
        _updateCreditCheckStatus(leaseId, passed, verificationId);
    }

    /**
     * @notice Activate lease after credit check and deposit
     * @param leaseId Lease ID
     */
    function activateLease(uint256 leaseId) public nonReentrant {
        Lease storage lease = leases[leaseId];
        require(lease.state == LeaseState.PendingApproval, "Invalid state");
        require(lease.creditCheckPassed, "Credit check not passed");
        require(msg.sender == lease.landlord, "Only landlord can activate");

        // TODO: Verify deposit received from PaymentEscrow

        lease.state = LeaseState.Active;
        lease.startDate = block.timestamp;
        lease.endDate = block.timestamp + (lease.duration * 1 days);
        lease.lastPaymentDate = block.timestamp;

        emit LeaseStateChanged(
            leaseId,
            LeaseState.PendingApproval,
            LeaseState.Active
        );
        emit LeaseActivated(
            leaseId,
            lease.tenant,
            lease.landlord,
            lease.propertyId,
            lease.startDate,
            lease.endDate,
            lease.monthlyRent
        );
    }

    /**
     * @notice Record rent payment (called by PaymentEscrow or CRE workflow)
     * @param leaseId Lease ID
     */
    function recordPayment(uint256 leaseId) public {
        require(
            msg.sender == paymentEscrow || msg.sender == owner(),
            "Not authorized"
        );
        Lease storage lease = leases[leaseId];
        require(lease.state == LeaseState.Active, "Lease not active");

        lease.lastPaymentDate = block.timestamp;
    }

    /**
     * @notice Complete lease
     * @param leaseId Lease ID
     */
    function completeLease(uint256 leaseId) public nonReentrant {
        Lease storage lease = leases[leaseId];
        require(lease.state == LeaseState.Active, "Lease not active");
        require(
            msg.sender == lease.landlord || msg.sender == lease.tenant,
            "Not authorized"
        );
        require(block.timestamp >= lease.endDate, "Lease term not ended");

        lease.state = LeaseState.Completed;
        emit LeaseStateChanged(
            leaseId,
            LeaseState.Active,
            LeaseState.Completed
        );
    }

    /**
     * @notice Terminate lease early
     * @param leaseId Lease ID
     */
    function terminateLease(uint256 leaseId) public nonReentrant {
        Lease storage lease = leases[leaseId];
        require(lease.state == LeaseState.Active, "Lease not active");
        require(msg.sender == lease.landlord, "Only landlord can terminate");

        lease.state = LeaseState.Terminated;
        emit LeaseStateChanged(
            leaseId,
            LeaseState.Active,
            LeaseState.Terminated
        );
    }

    /**
     * @notice Get lease details
     * @param leaseId Lease ID
     * @return Lease struct
     */
    function getLease(uint256 leaseId) public view returns (Lease memory) {
        return leases[leaseId];
    }

    /**
     * @notice Get all leases for a tenant
     * @param tenant Tenant address
     * @return Array of lease IDs
     */
    function getTenantLeases(
        address tenant
    ) public view returns (uint256[] memory) {
        return tenantLeases[tenant];
    }

    /**
     * @notice Get all leases for a landlord
     * @param landlord Landlord address
     * @return Array of lease IDs
     */
    function getLandlordLeases(
        address landlord
    ) public view returns (uint256[] memory) {
        return landlordLeases[landlord];
    }

    /**
     * @notice Check if lease is overdue for payment
     * @param leaseId Lease ID
     * @return True if overdue
     */
    function isPaymentOverdue(uint256 leaseId) public view returns (bool) {
        Lease memory lease = leases[leaseId];
        if (lease.state != LeaseState.Active) return false;

        uint256 daysSincePayment = (block.timestamp - lease.lastPaymentDate) /
            1 days;
        return daysSincePayment >= 30;
    }

    /**
     * @notice Get total number of leases
     * @return Total count
     */
    function totalLeases() public view returns (uint256) {
        return _leaseIdCounter;
    }

    /**
     * @notice Get all active leases
     * @dev Used by CRE rent collection workflow to fetch leases requiring payment
     * @return Array of active lease IDs
     */
    function getActiveLeases() public view returns (uint256[] memory) {
        // Count active leases first
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= _leaseIdCounter; i++) {
            if (leases[i].state == LeaseState.Active) {
                activeCount++;
            }
        }

        // Create array of active lease IDs
        uint256[] memory activeLeaseIds = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= _leaseIdCounter; i++) {
            if (leases[i].state == LeaseState.Active) {
                activeLeaseIds[index] = i;
                index++;
            }
        }

        return activeLeaseIds;
    }
}
