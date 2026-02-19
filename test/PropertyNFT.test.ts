import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("PropertyNFT", async function () {
    const { viem } = await network.connect();
    const publicClient = await viem.getPublicClient();
    const [owner, landlord, otherAccount] = await viem.getWalletClients();

    describe("Deployment", async function () {
        it("Should set the correct name and symbol", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const name = await propertyNFT.read.name();
            const symbol = await propertyNFT.read.symbol();

            assert.equal(name, "ChainLease Property");
            assert.equal(symbol, "CLPROP");
        });

        it("Should set the deployer as owner", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");
            const contractOwner = await propertyNFT.read.owner();

            assert.equal(contractOwner.toLowerCase(), owner.account.address.toLowerCase());
        });
    });

    describe("Minting Properties", async function () {
        it("Should mint a property NFT with correct metadata", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const metadata = {
                propertyAddress: "123 Main St, New York, NY",
                propertyType: "apartment",
                squareFeet: 1200n,
                bedrooms: 2n,
                bathrooms: 2n,
                isListed: true,
                monthlyRent: parseEther("1.5"),
            };

            const hash = await propertyNFT.write.mintProperty([
                landlord.account.address,
                "ipfs://QmTest123",
                metadata,
            ]);

            // Check that PropertyMinted event was emitted
            await viem.assertions.emit(hash, propertyNFT, "PropertyMinted");

            // Verify ownership
            const tokenOwner = await propertyNFT.read.ownerOf([1n]);
            assert.equal(tokenOwner.toLowerCase(), landlord.account.address.toLowerCase());

            // Verify metadata
            const storedMetadata = await propertyNFT.read.properties([1n]);
            assert.equal(storedMetadata[0], metadata.propertyAddress);
            assert.equal(storedMetadata[1], metadata.propertyType);
            assert.equal(storedMetadata[2], metadata.squareFeet);
            assert.equal(storedMetadata[3], metadata.bedrooms);
            assert.equal(storedMetadata[4], metadata.bathrooms);
            assert.equal(storedMetadata[5], metadata.isListed);
            assert.equal(storedMetadata[6], metadata.monthlyRent);
        });

        it("Should revert if property address is empty", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const metadata = {
                propertyAddress: "",
                propertyType: "apartment",
                squareFeet: 1200n,
                bedrooms: 2n,
                bathrooms: 2n,
                isListed: true,
                monthlyRent: parseEther("1.5"),
            };

            await assert.rejects(
                propertyNFT.write.mintProperty([
                    landlord.account.address,
                    "ipfs://QmTest123",
                    metadata,
                ]),
                /Property address required/
            );
        });

        it("Should revert if square feet is zero", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 0n,
                bedrooms: 2n,
                bathrooms: 2n,
                isListed: true,
                monthlyRent: parseEther("1.5"),
            };

            await assert.rejects(
                propertyNFT.write.mintProperty([
                    landlord.account.address,
                    "ipfs://QmTest123",
                    metadata,
                ]),
                /Square feet must be > 0/
            );
        });

        it("Should revert if rent is zero", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 1200n,
                bedrooms: 2n,
                bathrooms: 2n,
                isListed: true,
                monthlyRent: 0n,
            };

            await assert.rejects(
                propertyNFT.write.mintProperty([
                    landlord.account.address,
                    "ipfs://QmTest123",
                    metadata,
                ]),
                /Rent must be > 0/
            );
        });

        it("Should track landlord properties", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 1200n,
                bedrooms: 2n,
                bathrooms: 2n,
                isListed: true,
                monthlyRent: parseEther("1.5"),
            };

            await propertyNFT.write.mintProperty([
                landlord.account.address,
                "ipfs://QmTest1",
                metadata,
            ]);

            await propertyNFT.write.mintProperty([
                landlord.account.address,
                "ipfs://QmTest2",
                { ...metadata, propertyAddress: "456 Elm St" },
            ]);

            const landlordProps = await propertyNFT.read.getPropertiesByLandlord([
                landlord.account.address,
            ]);

            assert.equal(landlordProps.length, 2);
            assert.equal(landlordProps[0], 1n);
            assert.equal(landlordProps[1], 2n);
        });
    });

    describe("Property Listing Management", async function () {
        it("Should allow property owner to update listing status", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 1200n,
                bedrooms: 2n,
                bathrooms: 2n,
                isListed: true,
                monthlyRent: parseEther("1.5"),
            };

            await propertyNFT.write.mintProperty([
                landlord.account.address,
                "ipfs://QmTest",
                metadata,
            ]);

            // Connect as landlord
            const propertyNFTAsLandlord = await viem.getContractAt(
                "PropertyNFT",
                propertyNFT.address,
                { client: { wallet: landlord } }
            );

            const hash = await propertyNFTAsLandlord.write.setPropertyListing([1n, false]);

            await viem.assertions.emitWithArgs(
                hash,
                propertyNFT,
                "PropertyListed",
                [1n, false]
            );

            const updatedMetadata = await propertyNFT.read.properties([1n]);
            assert.equal(updatedMetadata[5], false);
        });

        it("Should revert if non-owner tries to update listing", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 1200n,
                bedrooms: 2n,
                bathrooms: 2n,
                isListed: true,
                monthlyRent: parseEther("1.5"),
            };

            await propertyNFT.write.mintProperty([
                landlord.account.address,
                "ipfs://QmTest",
                metadata,
            ]);

            const propertyNFTAsOther = await viem.getContractAt(
                "PropertyNFT",
                propertyNFT.address,
                { client: { wallet: otherAccount } }
            );

            await assert.rejects(
                propertyNFTAsOther.write.setPropertyListing([1n, false]),
                /Not property owner/
            );
        });
    });

    describe("Rent Management", async function () {
        it("Should allow property owner to update rent", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 1200n,
                bedrooms: 2n,
                bathrooms: 2n,
                isListed: true,
                monthlyRent: parseEther("1.5"),
            };

            await propertyNFT.write.mintProperty([
                landlord.account.address,
                "ipfs://QmTest",
                metadata,
            ]);

            const propertyNFTAsLandlord = await viem.getContractAt(
                "PropertyNFT",
                propertyNFT.address,
                { client: { wallet: landlord } }
            );

            const newRent = parseEther("2.0");
            const hash = await propertyNFTAsLandlord.write.updateRent([1n, newRent]);

            await viem.assertions.emitWithArgs(
                hash,
                propertyNFT,
                "RentUpdated",
                [1n, newRent]
            );

            const updatedMetadata = await propertyNFT.read.properties([1n]);
            assert.equal(updatedMetadata[6], newRent);
        });

        it("Should revert if rent is set to zero", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 1200n,
                bedrooms: 2n,
                bathrooms: 2n,
                isListed: true,
                monthlyRent: parseEther("1.5"),
            };

            await propertyNFT.write.mintProperty([
                landlord.account.address,
                "ipfs://QmTest",
                metadata,
            ]);

            const propertyNFTAsLandlord = await viem.getContractAt(
                "PropertyNFT",
                propertyNFT.address,
                { client: { wallet: landlord } }
            );

            await assert.rejects(
                propertyNFTAsLandlord.write.updateRent([1n, 0n]),
                /Rent must be > 0/
            );
        });

        it("Should revert if non-owner tries to update rent", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 1200n,
                bedrooms: 2n,
                bathrooms: 2n,
                isListed: true,
                monthlyRent: parseEther("1.5"),
            };

            await propertyNFT.write.mintProperty([
                landlord.account.address,
                "ipfs://QmTest",
                metadata,
            ]);

            const propertyNFTAsOther = await viem.getContractAt(
                "PropertyNFT",
                propertyNFT.address,
                { client: { wallet: otherAccount } }
            );

            await assert.rejects(
                propertyNFTAsOther.write.updateRent([1n, parseEther("2.0")]),
                /Not property owner/
            );
        });
    });

    describe("Token URI", async function () {
        it("Should return correct token URI", async function () {
            const propertyNFT = await viem.deployContract("PropertyNFT");

            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 1200n,
                bedrooms: 2n,
                bathrooms: 2n,
                isListed: true,
                monthlyRent: parseEther("1.5"),
            };

            const uri = "ipfs://QmTest123ABC";
            await propertyNFT.write.mintProperty([
                landlord.account.address,
                uri,
                metadata,
            ]);

            const tokenUri = await propertyNFT.read.tokenURI([1n]);
            assert.equal(tokenUri, uri);
        });
    });
});
