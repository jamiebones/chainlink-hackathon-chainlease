// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PaymentEscrow
 * @notice Manages security deposits and rent payments for ChainLease
 * @dev Holds security deposits in escrow until lease completion
 */
contract PaymentEscrow is ReentrancyGuard, Ownable {
    struct Escrow {
        uint256 leaseId;
        address landlord;
        address tenant;
        uint256 depositAmount;
        uint256 depositedAt;
        bool released;
        bool forfeited; // True if deposit forfeited to landlord
    }

    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => uint256[]) public paymentHistory; // leaseId => timestamps
    mapping(uint256 => uint256) public totalPaid; // leaseId => total amount paid

    uint256 public constant LATE_FEE_PERCENTAGE = 5; // 5% late fee
    uint256 public constant GRACE_PERIOD = 3 days;

    address public leaseAgreementContract;

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
    event FundsWithdrawn(
        uint256 indexed leaseId,
        address indexed landlord,
        uint256 amount
    );

    modifier onlyLeaseContract() {
        require(msg.sender == leaseAgreementContract, "Only lease contract");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set the LeaseAgreement contract address
     * @param _leaseAgreement Address of LeaseAgreement contract
     */
    function setLeaseAgreementContract(
        address _leaseAgreement
    ) external onlyOwner {
        require(_leaseAgreement != address(0), "Invalid address");
        leaseAgreementContract = _leaseAgreement;
    }

    /**
     * @notice Deposit security deposit for a lease
     * @param leaseId Lease ID
     * @param landlord Landlord address
     */
    function depositSecurity(
        uint256 leaseId,
        address landlord
    ) external payable nonReentrant {
        require(msg.value > 0, "Amount must be > 0");
        require(escrows[leaseId].depositAmount == 0, "Already deposited");
        require(landlord != address(0), "Invalid landlord");

        escrows[leaseId] = Escrow({
            leaseId: leaseId,
            landlord: landlord,
            tenant: msg.sender,
            depositAmount: msg.value,
            depositedAt: block.timestamp,
            released: false,
            forfeited: false
        });

        emit DepositReceived(leaseId, msg.sender, msg.value);
    }

    /**
     * @notice Release security deposit to tenant after successful lease completion
     * @param leaseId Lease ID
     */
    function releaseDeposit(uint256 leaseId) external nonReentrant {
        Escrow storage escrow = escrows[leaseId];
        require(!escrow.released, "Already released");
        require(!escrow.forfeited, "Deposit forfeited");
        require(
            msg.sender == escrow.landlord ||
                msg.sender == owner() ||
                msg.sender == leaseAgreementContract,
            "Not authorized"
        );

        escrow.released = true;

        (bool success, ) = payable(escrow.tenant).call{
            value: escrow.depositAmount
        }("");
        require(success, "Transfer failed");

        emit DepositReleased(leaseId, escrow.tenant, escrow.depositAmount);
    }

    /**
     * @notice Forfeit security deposit to landlord (e.g., for damages or unpaid rent)
     * @param leaseId Lease ID
     */
    function forfeitDeposit(
        uint256 leaseId
    ) external nonReentrant onlyLeaseContract {
        Escrow storage escrow = escrows[leaseId];
        require(!escrow.released, "Already released");
        require(!escrow.forfeited, "Already forfeited");

        escrow.forfeited = true;

        (bool success, ) = payable(escrow.landlord).call{
            value: escrow.depositAmount
        }("");
        require(success, "Transfer failed");

        emit DepositForfeited(leaseId, escrow.landlord, escrow.depositAmount);
    }

    /**
     * @notice Pay monthly rent
     * @param leaseId Lease ID
     * @param landlord Landlord address to receive payment
     */
    function payRent(
        uint256 leaseId,
        address landlord
    ) external payable nonReentrant {
        require(msg.value > 0, "Amount must be > 0");
        require(landlord != address(0), "Invalid landlord");

        paymentHistory[leaseId].push(block.timestamp);
        totalPaid[leaseId] += msg.value;

        // Transfer rent directly to landlord
        (bool success, ) = payable(landlord).call{value: msg.value}("");
        require(success, "Transfer failed");

        emit RentPaid(leaseId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Calculate late fee for a payment
     * @param rentAmount Base rent amount
     * @return Late fee amount
     */
    function calculateLateFee(
        uint256 rentAmount
    ) public pure returns (uint256) {
        return (rentAmount * LATE_FEE_PERCENTAGE) / 100;
    }

    /**
     * @notice Check if rent payment is late
     * @param leaseId Lease ID
     * @param dueDate Original due date
     * @return bool Whether payment is late
     */
    function isPaymentLate(
        uint256 leaseId,
        uint256 dueDate
    ) public view returns (bool) {
        uint256[] memory history = paymentHistory[leaseId];
        if (history.length == 0) {
            return block.timestamp > dueDate + GRACE_PERIOD;
        }

        uint256 lastPayment = history[history.length - 1];
        return lastPayment > dueDate + GRACE_PERIOD;
    }

    /**
     * @notice Get payment history for a lease
     * @param leaseId Lease ID
     * @return Array of payment timestamps
     */
    function getPaymentHistory(
        uint256 leaseId
    ) external view returns (uint256[] memory) {
        return paymentHistory[leaseId];
    }

    /**
     * @notice Get total amount paid for a lease
     * @param leaseId Lease ID
     * @return Total amount paid in wei
     */
    function getTotalPaid(uint256 leaseId) external view returns (uint256) {
        return totalPaid[leaseId];
    }

    /**
     * @notice Get escrow details for a lease
     * @param leaseId Lease ID
     * @return Escrow struct with deposit details
     */
    function getEscrow(uint256 leaseId) external view returns (Escrow memory) {
        return escrows[leaseId];
    }

    /**
     * @notice Check if security deposit has been made for a lease
     * @param leaseId Lease ID
     * @return bool Whether deposit exists
     */
    function hasDeposit(uint256 leaseId) external view returns (bool) {
        return escrows[leaseId].depositAmount > 0;
    }
}
