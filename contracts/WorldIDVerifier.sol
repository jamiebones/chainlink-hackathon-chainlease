// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title WorldIDVerifier
 * @notice Verifies World ID proofs for tenant identity without revealing PII
 * @dev Integrates with World ID Protocol for Sybil-resistant identity verification
 */
contract WorldIDVerifier {
    /// @notice Interface to World ID Router contract
    /// @dev This will be set to the actual World ID contract address on deployment
    address public worldIdRouter;

    /// @notice App ID from World ID Developer Portal
    string public appId;

    /// @notice Action ID for this specific use case (e.g., "apply-for-lease")
    string public actionId;

    /// @notice Mapping of verified nullifier hashes to prevent reuse
    mapping(bytes32 => bool) public verifiedNullifiers;

    /// @notice Mapping of addresses to their verified nullifier hash
    mapping(address => bytes32) public userNullifiers;

    event ProofVerified(
        address indexed user,
        bytes32 indexed nullifierHash,
        uint256 timestamp
    );

    event ProofRevoked(bytes32 indexed nullifierHash, address indexed user);

    /**
     * @notice Constructor
     * @param _worldIdRouter Address of World ID Router contract
     * @param _appId Application ID from World ID Developer Portal
     * @param _actionId Action identifier for this verification type
     */
    constructor(
        address _worldIdRouter,
        string memory _appId,
        string memory _actionId
    ) {
        require(_worldIdRouter != address(0), "Invalid router address");
        worldIdRouter = _worldIdRouter;
        appId = _appId;
        actionId = _actionId;
    }

    /**
     * @notice Verify a World ID proof
     * @dev In production, this calls the actual World ID contract with root and proof params
     * @param user Address of the user being verified
     * @param nullifierHash Unique identifier for this user+action combination
     */
    function verifyProof(
        address user,
        uint256 /* root */,
        bytes32 nullifierHash,
        uint256[8] calldata /* proof */
    ) external {
        require(user != address(0), "Invalid user address");
        require(!verifiedNullifiers[nullifierHash], "Nullifier already used");
        require(nullifierHash != bytes32(0), "Invalid nullifier");

        // TODO: Integrate with actual World ID contract when available
        // For now, this is a simplified version for testing
        // In production, uncomment and use:
        /*
        IWorldID(worldIdRouter).verifyProof(
            root,
            groupId, // 1 for Orb, 0 for Phone
            abi.encodePacked(user).hashToField(),
            nullifierHash,
            abi.encodePacked(appId).hashToField(),
            abi.encodePacked(actionId).hashToField(),
            proof
        );
        */

        // Mark nullifier as used
        verifiedNullifiers[nullifierHash] = true;
        userNullifiers[user] = nullifierHash;

        emit ProofVerified(user, nullifierHash, block.timestamp);
    }

    /**
     * @notice Simplified verification for testing (mock mode)
     * @param user Address to verify
     * @param nullifierHash Nullifier hash to associate with user
     */
    function mockVerify(address user, bytes32 nullifierHash) external {
        require(user != address(0), "Invalid user address");
        require(!verifiedNullifiers[nullifierHash], "Nullifier already used");
        require(nullifierHash != bytes32(0), "Invalid nullifier");

        verifiedNullifiers[nullifierHash] = true;
        userNullifiers[user] = nullifierHash;

        emit ProofVerified(user, nullifierHash, block.timestamp);
    }

    /**
     * @notice Check if a user has been verified
     * @param user Address to check
     * @return bool Whether user has valid World ID proof
     */
    function isVerified(address user) external view returns (bool) {
        bytes32 nullifier = userNullifiers[user];
        return nullifier != bytes32(0) && verifiedNullifiers[nullifier];
    }

    /**
     * @notice Check if a nullifier hash has been used
     * @param nullifierHash Nullifier to check
     * @return bool Whether nullifier has been verified
     */
    function isNullifierUsed(
        bytes32 nullifierHash
    ) external view returns (bool) {
        return verifiedNullifiers[nullifierHash];
    }

    /**
     * @notice Get the nullifier hash for a user
     * @param user Address to query
     * @return bytes32 Nullifier hash associated with user (0x0 if not verified)
     */
    function getUserNullifier(address user) external view returns (bytes32) {
        return userNullifiers[user];
    }

    /**
     * @notice Update World ID Router address (admin only)
     * @param _newRouter New router address
     */
    function updateWorldIdRouter(address _newRouter) external {
        require(_newRouter != address(0), "Invalid router address");
        // In production, add onlyOwner or similar access control
        worldIdRouter = _newRouter;
    }

    /**
     * @notice Revoke a proof (for testing or emergency use)
     * @param nullifierHash Nullifier to revoke
     * @param user User address associated with nullifier
     */
    function revokeProof(bytes32 nullifierHash, address user) external {
        // In production, add proper access control
        require(verifiedNullifiers[nullifierHash], "Nullifier not verified");
        require(userNullifiers[user] == nullifierHash, "Mismatch");

        delete verifiedNullifiers[nullifierHash];
        delete userNullifiers[user];

        emit ProofRevoked(nullifierHash, user);
    }
}
