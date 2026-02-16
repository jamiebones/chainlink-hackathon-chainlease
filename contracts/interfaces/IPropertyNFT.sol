// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPropertyNFT
 * @notice Interface for PropertyNFT contract
 */
interface IPropertyNFT {
    struct PropertyMetadata {
        string propertyAddress;
        string propertyType;
        uint256 squareFeet;
        uint256 bedrooms;
        uint256 bathrooms;
        bool isListed;
        uint256 monthlyRent;
    }

    event PropertyMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string propertyAddress
    );

    event PropertyListed(uint256 indexed tokenId, bool isListed);

    event RentUpdated(uint256 indexed tokenId, uint256 newRent);

    function mintProperty(
        address to,
        string memory metadataURI,
        PropertyMetadata memory metadata
    ) external returns (uint256);

    function setPropertyListing(uint256 tokenId, bool isListed) external;

    function updateRent(uint256 tokenId, uint256 newRent) external;

    function getPropertiesByLandlord(
        address landlord
    ) external view returns (uint256[] memory);

    function getProperty(
        uint256 tokenId
    ) external view returns (PropertyMetadata memory);

    function ownerOf(uint256 tokenId) external view returns (address);

    function isListed(uint256 tokenId) external view returns (bool);
}
