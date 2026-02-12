// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PropertyNFT
 * @notice ERC-721 contract for tokenized rental properties
 * @dev Each NFT represents a unique rental property with metadata
 */
contract PropertyNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;

    struct PropertyMetadata {
        string propertyAddress;
        string propertyType; // e.g., "apartment", "house", "condo"
        uint256 squareFeet;
        uint256 bedrooms;
        uint256 bathrooms;
        bool isListed;
        uint256 monthlyRent; // in wei
    }

    mapping(uint256 => PropertyMetadata) public properties;
    mapping(address => uint256[]) public landlordProperties;

    event PropertyMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string propertyAddress
    );

    event PropertyListed(uint256 indexed tokenId, bool isListed);

    event RentUpdated(uint256 indexed tokenId, uint256 newRent);

    constructor() ERC721("ChainLease Property", "CLPROP") Ownable(msg.sender) {}

    /**
     * @notice Mint a new property NFT
     * @param to Address of the property owner (landlord)
     * @param metadataURI IPFS URI with property images and details
     * @param metadata On-chain property metadata
     * @return tokenId The ID of the minted NFT
     */
    function mintProperty(
        address to,
        string memory metadataURI,
        PropertyMetadata memory metadata
    ) public nonReentrant returns (uint256) {
        require(
            bytes(metadata.propertyAddress).length > 0,
            "Property address required"
        );
        require(metadata.squareFeet > 0, "Square feet must be > 0");
        require(metadata.monthlyRent > 0, "Rent must be > 0");

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        properties[newTokenId] = metadata;
        landlordProperties[to].push(newTokenId);

        emit PropertyMinted(newTokenId, to, metadata.propertyAddress);
        return newTokenId;
    }

    /**
     * @notice Toggle property listing status
     * @param tokenId Property NFT ID
     * @param isListed New listing status
     */
    function setPropertyListing(uint256 tokenId, bool isListed) public {
        require(ownerOf(tokenId) == msg.sender, "Not property owner");
        properties[tokenId].isListed = isListed;
        emit PropertyListed(tokenId, isListed);
    }

    /**
     * @notice Update monthly rent
     * @param tokenId Property NFT ID
     * @param newRent New monthly rent in wei
     */
    function updateRent(uint256 tokenId, uint256 newRent) public {
        require(ownerOf(tokenId) == msg.sender, "Not property owner");
        require(newRent > 0, "Rent must be > 0");
        properties[tokenId].monthlyRent = newRent;
        emit RentUpdated(tokenId, newRent);
    }

    /**
     * @notice Get all properties owned by a landlord
     * @param landlord Landlord address
     * @return Array of property token IDs
     */
    function getPropertiesByLandlord(
        address landlord
    ) public view returns (uint256[] memory) {
        return landlordProperties[landlord];
    }

    /**
     * @notice Get property metadata
     * @param tokenId Property NFT ID
     * @return PropertyMetadata struct
     */
    function getPropertyMetadata(
        uint256 tokenId
    ) public view returns (PropertyMetadata memory) {
        require(ownerOf(tokenId) != address(0), "Property does not exist");
        return properties[tokenId];
    }

    /**
     * @notice Get total number of properties minted
     * @return Total count
     */
    function totalProperties() public view returns (uint256) {
        return _tokenIdCounter;
    }

    // Override required functions
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Update landlordProperties mapping when token is transferred
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = super._update(to, tokenId, auth);

        if (from != address(0)) {
            // Remove from previous owner's list
            _removeFromLandlordProperties(from, tokenId);
        }

        if (to != address(0)) {
            // Add to new owner's list
            landlordProperties[to].push(tokenId);
        }

        return from;
    }

    function _removeFromLandlordProperties(
        address landlord,
        uint256 tokenId
    ) private {
        uint256[] storage propertyList = landlordProperties[landlord];
        for (uint256 i = 0; i < propertyList.length; i++) {
            if (propertyList[i] == tokenId) {
                propertyList[i] = propertyList[propertyList.length - 1];
                propertyList.pop();
                break;
            }
        }
    }
}
