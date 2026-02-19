import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, keccak256, toBytes } from "viem";

describe("LeaseAgreement", async function () {
    const { viem } = await network.connect();
    const publicClient = await viem.getPublicClient();
    const [owner, landlord, tenant, forwarder, otherAccount] =
        await viem.getWalletClients();

    // Helper to deploy contracts
    async function deployContracts() {
        const propertyNFT = await viem.deployContract("PropertyNFT");
        const leaseAgreement = await viem.deployContract("LeaseAgreement", [
            propertyNFT.address,
            forwarder.account.address, // Mock forwarder
        ]);

        // Mint a property for testing
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

        return { propertyNFT, leaseAgreement };
    }

    describe("Deployment", async function () {
        it("Should set the correct PropertyNFT address", async function () {
            const { propertyNFT, leaseAgreement } = await deployContracts();

            const propertyNFTAddress = await leaseAgreement.read.propertyNFT();
            assert.equal(
                propertyNFTAddress.toLowerCase(),
                propertyNFT.address.toLowerCase()
            );
        });

        it("Should initialize with zero leases", async function () {
            const { leaseAgreement } = await deployContracts();

            const totalLeases = await leaseAgreement.read.totalLeases();
            assert.equal(totalLeases, 0n);
        });
    });

    describe("Creating Leases", async function () {
        it("Should create a lease with World ID nullifier", async function () {
            const { leaseAgreement } = await deployContracts();

            const monthlyRent = parseEther("1.5");
            const securityDeposit = parseEther("3.0");
            const duration = 365n; // 1 year
            const worldIdNullifier = keccak256(toBytes("unique-nullifier-1"));

            const leaseAgreementAsTenant = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: tenant } }
            );

            const hash = await leaseAgreementAsTenant.write.createLease([
                1n, // propertyId
                duration,
                worldIdNullifier,
            ]);

            await viem.assertions.emitWithArgs(hash, leaseAgreement, "LeaseCreated", [
                1n,
                1n,
                tenant.account.address,
                monthlyRent,
            ]);

            const lease = await leaseAgreement.read.leases([1n]);
            assert.equal(lease[0], 1n); // leaseId
            assert.equal(lease[1], 1n); // propertyId
            assert.equal(lease[2].toLowerCase(), landlord.account.address.toLowerCase()); // landlord
            assert.equal(lease[3].toLowerCase(), tenant.account.address.toLowerCase()); // tenant
            assert.equal(lease[4], monthlyRent); // monthlyRent
            assert.equal(lease[5], securityDeposit); // securityDeposit
            assert.equal(lease[8], 0); // state = Draft

            // Check nullifier is marked as used
            const nullifierUsed = await leaseAgreement.read.usedNullifiers([
                worldIdNullifier,
            ]);
            assert.equal(nullifierUsed, true);
        });

        it("Should revert if World ID nullifier already used", async function () {
            const { leaseAgreement } = await deployContracts();

            const worldIdNullifier = keccak256(toBytes("unique-nullifier-1"));

            const leaseAgreementAsTenant = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: tenant } }
            );

            await leaseAgreementAsTenant.write.createLease([
                1n, // propertyId
                365n,
                worldIdNullifier,
            ]);

            // Try to create another lease with same nullifier
            await assert.rejects(
                leaseAgreementAsTenant.write.createLease([
                    1n,
                    365n,
                    worldIdNullifier,
                ]),
                /Already applied/
            );
        });

        it("Should track tenant and landlord leases", async function () {
            const { leaseAgreement } = await deployContracts();

            const worldIdNullifier = keccak256(toBytes("unique-nullifier-1"));

            const leaseAgreementAsTenant = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: tenant } }
            );

            await leaseAgreementAsTenant.write.createLease([
                1n,
                365n,
                worldIdNullifier,
            ]);

            const tenantLeases = await leaseAgreement.read.getTenantLeases([
                tenant.account.address,
            ]);
            const landlordLeases = await leaseAgreement.read.getLandlordLeases([
                landlord.account.address,
            ]);

            assert.equal(tenantLeases.length, 1);
            assert.equal(tenantLeases[0], 1n);
            assert.equal(landlordLeases.length, 1);
            assert.equal(landlordLeases[0], 1n);
        });
    });

    describe("Credit Check", async function () {
        it("Should update credit check status from forwarder", async function () {
            const { leaseAgreement } = await deployContracts();

            const worldIdNullifier = keccak256(toBytes("unique-nullifier-1"));

            const leaseAgreementAsTenant = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: tenant } }
            );

            await leaseAgreementAsTenant.write.createLease([
                1n,
                365n,
                worldIdNullifier,
            ]);

            // Simulate forwarder calling manualCreditCheckOverride
            const leaseAgreementAsForwarder = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: forwarder } }
            );

            const hash = await leaseAgreementAsForwarder.write.manualCreditCheckOverride([
                1n,
                true,
                "verification-123",
            ]);

            await viem.assertions.emitWithArgs(
                hash,
                leaseAgreement,
                "CreditCheckCompleted",
                [1n, true, "verification-123"]
            );

            const lease = await leaseAgreement.read.leases([1n]);
            assert.equal(lease[10], true); // creditCheckPassed
            assert.equal(lease[11], "verification-123"); // verificationId
            assert.equal(lease[8], 1); // state = PendingApproval
        });

        it("Should revert if non-forwarder tries to update credit check", async function () {
            const { leaseAgreement } = await deployContracts();

            const worldIdNullifier = keccak256(toBytes("unique-nullifier-1"));

            const leaseAgreementAsTenant = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: tenant } }
            );

            await leaseAgreementAsTenant.write.createLease([
                1n,
                365n,
                worldIdNullifier,
            ]);

            await assert.rejects(
                leaseAgreementAsTenant.write.manualCreditCheckOverride([
                    1n,
                    true,
                    "verification-123",
                ]),
                /Only forwarder/
            );
        });
    });

    describe("Activating Leases", async function () {
        it("Should activate lease after credit check passes", async function () {
            const { leaseAgreement } = await deployContracts();

            const worldIdNullifier = keccak256(toBytes("unique-nullifier-1"));

            const leaseAgreementAsTenant = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: tenant } }
            );

            await leaseAgreementAsTenant.write.createLease([
                1n,
                365n,
                worldIdNullifier,
            ]);

            const leaseAgreementAsForwarder = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: forwarder } }
            );

            await leaseAgreementAsForwarder.write.manualCreditCheckOverride([
                1n,
                true,
                "verification-123",
            ]);

            const leaseAgreementAsLandlord = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: landlord } }
            );

            const hash = await leaseAgreementAsLandlord.write.activateLease([1n]);

            await viem.assertions.emit(hash, leaseAgreement, "LeaseActivated");

            const lease = await leaseAgreement.read.leases([1n]);
            assert.equal(lease[8], 2); // state = Active
            assert(lease[6] > 0n); // startDate set
            assert(lease[7] > 0n); // endDate set
        });

        it("Should revert if credit check not passed", async function () {
            const { leaseAgreement } = await deployContracts();

            const worldIdNullifier = keccak256(toBytes("unique-nullifier-1"));

            const leaseAgreementAsTenant = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: tenant } }
            );

            await leaseAgreementAsTenant.write.createLease([
                1n,
                365n,
                worldIdNullifier,
            ]);

            const leaseAgreementAsForwarder = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: forwarder } }
            );

            await leaseAgreementAsForwarder.write.manualCreditCheckOverride([
                1n,
                false,
                "verification-123",
            ]);

            const leaseAgreementAsLandlord = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: landlord } }
            );

            await assert.rejects(
                leaseAgreementAsLandlord.write.activateLease([1n]),
                /Credit check not passed/
            );
        });

        it("Should revert if non-landlord tries to activate", async function () {
            const { leaseAgreement } = await deployContracts();

            const worldIdNullifier = keccak256(toBytes("unique-nullifier-1"));

            const leaseAgreementAsTenant = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: tenant } }
            );

            await leaseAgreementAsTenant.write.createLease([
                1n,
                365n,
                worldIdNullifier,
            ]);

            const leaseAgreementAsForwarder = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: forwarder } }
            );

            await leaseAgreementAsForwarder.write.manualCreditCheckOverride([
                1n,
                true,
                "verification-123",
            ]);

            await assert.rejects(
                leaseAgreementAsTenant.write.activateLease([1n]),
                /Only landlord/
            );
        });
    });

    describe("Get Active Leases", async function () {
        it("Should return all active leases", async function () {
            const { leaseAgreement } = await deployContracts();

            // Create and activate multiple leases
            for (let i = 1; i <= 3; i++) {
                const nullifier = keccak256(toBytes(`unique-nullifier-${i}`));

                const leaseAgreementAsTenant = await viem.getContractAt(
                    "LeaseAgreement",
                    leaseAgreement.address,
                    { client: { wallet: tenant } }
                );

                await leaseAgreementAsTenant.write.createLease([
                    1n,
                    365n,
                    nullifier,
                ]);

                const leaseAgreementAsForwarder = await viem.getContractAt(
                    "LeaseAgreement",
                    leaseAgreement.address,
                    { client: { wallet: forwarder } }
                );

                await leaseAgreementAsForwarder.write.manualCreditCheckOverride([
                    BigInt(i),
                    true,
                    `verification-${i}`,
                ]);

                const leaseAgreementAsLandlord = await viem.getContractAt(
                    "LeaseAgreement",
                    leaseAgreement.address,
                    { client: { wallet: landlord } }
                );

                await leaseAgreementAsLandlord.write.activateLease([BigInt(i)]);
            }

            const activeLeases = await leaseAgreement.read.getActiveLeases();
            assert.equal(activeLeases.length, 3);
            assert.equal(activeLeases[0], 1n);
            assert.equal(activeLeases[1], 2n);
            assert.equal(activeLeases[2], 3n);
        });
    });

    describe("Recording Payments", async function () {
        it("Should allow authorized party to record payment", async function () {
            const { leaseAgreement, propertyNFT } = await deployContracts();

            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            await leaseAgreement.write.setPaymentEscrow([paymentEscrow.address]);

            const worldIdNullifier = keccak256(toBytes("unique-nullifier-1"));

            const leaseAgreementAsTenant = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: tenant } }
            );

            await leaseAgreementAsTenant.write.createLease([
                1n,
                365n,
                worldIdNullifier,
            ]);

            const leaseAgreementAsForwarder = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: forwarder } }
            );

            await leaseAgreementAsForwarder.write.manualCreditCheckOverride([
                1n,
                true,
                "verification-123",
            ]);

            const leaseAgreementAsLandlord = await viem.getContractAt(
                "LeaseAgreement",
                leaseAgreement.address,
                { client: { wallet: landlord } }
            );

            await leaseAgreementAsLandlord.write.activateLease([1n]);

            const paymentEscrowContract = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address
            );

            await paymentEscrowContract.write.recordPayment([1n], { value: parseEther("1.5") });

            const lease = await leaseAgreement.read.leases([1n]);
            assert(lease[12] > 0n); // lastPaymentDate updated
        });
    });
});
