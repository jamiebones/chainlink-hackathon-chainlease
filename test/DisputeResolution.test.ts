import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, getAddress } from "viem";

describe("DisputeResolution", async function () {
    const { viem } = await network.connect();
    const publicClient = await viem.getPublicClient();
    const [owner, landlord, tenant, arbitrator, otherAccount] =
        await viem.getWalletClients();

    describe("Deployment", async function () {
        it("Should set the deployer as owner and arbitrator", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");

            const contractOwner = await disputeResolution.read.owner();
            const isArbitrator = await disputeResolution.read.arbitrators([
                owner.account.address,
            ]);

            assert.equal(contractOwner.toLowerCase(), owner.account.address.toLowerCase());
            assert.equal(isArbitrator, true);
        });

        it("Should have correct dispute fee", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");

            const disputeFee = await disputeResolution.read.DISPUTE_FEE();
            assert.equal(disputeFee, parseEther("0.01"));
        });
    });

    describe("Arbitrator Management", async function () {
        it("Should allow owner to add arbitrators", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");

            const hash = await disputeResolution.write.addArbitrator([
                arbitrator.account.address,
            ]);

            await viem.assertions.emitWithArgs(
                hash,
                disputeResolution,
                "ArbitratorAdded",
                [getAddress(arbitrator.account.address)]
            );

            const isArbitrator = await disputeResolution.read.arbitrators([
                arbitrator.account.address,
            ]);
            assert.equal(isArbitrator, true);
        });

        it("Should allow owner to remove arbitrators", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");

            await disputeResolution.write.addArbitrator([arbitrator.account.address]);

            const hash = await disputeResolution.write.removeArbitrator([
                arbitrator.account.address,
            ]);

            await viem.assertions.emitWithArgs(
                hash,
                disputeResolution,
                "ArbitratorRemoved",
                [getAddress(arbitrator.account.address)]
            );

            const isArbitrator = await disputeResolution.read.arbitrators([
                arbitrator.account.address,
            ]);
            assert.equal(isArbitrator, false);
        });

        it("Should revert if non-owner tries to add arbitrator", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");

            const disputeResolutionAsLandlord = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: landlord } }
            );

            await assert.rejects(
                disputeResolutionAsLandlord.write.addArbitrator([
                    arbitrator.account.address,
                ]),
                /OwnableUnauthorizedAccount/
            );
        });
    });

    describe("Filing Disputes", async function () {
        it("Should allow tenant to file a dispute", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            const disputeResolutionAsTenant = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: tenant } }
            );

            const reason = "Property damage not caused by tenant";
            const evidence = "ipfs://QmEvidence123";

            const hash = await disputeResolutionAsTenant.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, reason, evidence],
                { value: disputeFee }
            );

            await viem.assertions.emitWithArgs(
                hash,
                disputeResolution,
                "DisputeCreated",
                [1n, 1n, getAddress(tenant.account.address), reason]
            );

            const dispute = await disputeResolution.read.disputes([1n]);
            assert.equal(dispute[0], 1n); // disputeId
            assert.equal(dispute[1], 1n); // leaseId
            assert.equal(dispute[2].toLowerCase(), landlord.account.address.toLowerCase()); // landlord
            assert.equal(dispute[3].toLowerCase(), tenant.account.address.toLowerCase()); // tenant
            assert.equal(dispute[4].toLowerCase(), tenant.account.address.toLowerCase()); // initiator
            assert.equal(dispute[5], reason);
            assert.equal(dispute[6], evidence);
            assert.equal(dispute[7], 0); // status = Open
            assert.equal(dispute[8], 0); // outcome = Pending
        });

        it("Should allow landlord to file a dispute", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            const disputeResolutionAsLandlord = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: landlord } }
            );

            const reason = "Unpaid rent and property damage";
            const evidence = "ipfs://QmEvidence456";

            const hash = await disputeResolutionAsLandlord.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, reason, evidence],
                { value: disputeFee }
            );

            await viem.assertions.emitWithArgs(
                hash,
                disputeResolution,
                "DisputeCreated",
                [1n, 1n, getAddress(landlord.account.address), reason]
            );

            const dispute = await disputeResolution.read.disputes([1n]);
            assert.equal(dispute[4].toLowerCase(), landlord.account.address.toLowerCase()); // initiator
        });

        it("Should revert if dispute fee not paid", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");

            const disputeResolutionAsTenant = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: tenant } }
            );

            await assert.rejects(
                disputeResolutionAsTenant.write.fileDispute(
                    [
                        1n,
                        landlord.account.address,
                        tenant.account.address,
                        "Test dispute",
                        "ipfs://test",
                    ],
                    { value: 0n }
                ),
                (error) => {
                    return error.message.includes("Insufficient dispute fee");
                }
            );
        });

        it("Should revert if initiator is neither landlord nor tenant", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            const disputeResolutionAsOther = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: otherAccount } }
            );

            await assert.rejects(
                disputeResolutionAsOther.write.fileDispute(
                    [
                        1n,
                        landlord.account.address,
                        tenant.account.address,
                        "Test dispute",
                        "ipfs://test",
                    ],
                    { value: disputeFee }
                ),
                (error) => {
                    return error.message.includes("Not party to lease");
                }
            );
        });

        it("Should track disputes by lease ID", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            const disputeResolutionAsTenant = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: tenant } }
            );

            await disputeResolutionAsTenant.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, "Dispute 1", "ipfs://1"],
                { value: disputeFee }
            );

            await disputeResolutionAsTenant.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, "Dispute 2", "ipfs://2"],
                { value: disputeFee }
            );

            const leaseDisputes = await disputeResolution.read.getLeaseDisputes([1n]);
            assert.equal(leaseDisputes.length, 2);
            assert.equal(leaseDisputes[0], 1n);
            assert.equal(leaseDisputes[1], 2n);
        });
    });

    describe("Dispute Status Management", async function () {
        it("Should allow arbitrator to update dispute status", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            await disputeResolution.write.addArbitrator([arbitrator.account.address]);

            const disputeResolutionAsTenant = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: tenant } }
            );

            await disputeResolutionAsTenant.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, "Test", "ipfs://test"],
                { value: disputeFee }
            );

            const disputeResolutionAsArbitrator = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: arbitrator } }
            );

            const hash = await disputeResolutionAsArbitrator.write.updateDisputeStatus([
                1n,
                1, // UnderReview
            ]);

            await viem.assertions.emitWithArgs(
                hash,
                disputeResolution,
                "DisputeStatusChanged",
                [1n, 1] // DisputeStatus.UnderReview
            );

            const dispute = await disputeResolution.read.disputes([1n]);
            assert.equal(dispute[7], 1); // status = UnderReview
        });

        it("Should revert if non-arbitrator tries to update status", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            const disputeResolutionAsTenant = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: tenant } }
            );

            await disputeResolutionAsTenant.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, "Test", "ipfs://test"],
                { value: disputeFee }
            );

            await assert.rejects(
                disputeResolutionAsTenant.write.updateDisputeStatus([1n, 1]),
                /Not arbitrator/
            );
        });
    });

    describe("Resolving Disputes", async function () {
        it("Should allow arbitrator to resolve dispute in favor of landlord", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            await disputeResolution.write.addArbitrator([arbitrator.account.address]);

            const disputeResolutionAsTenant = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: tenant } }
            );

            await disputeResolutionAsTenant.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, "Test", "ipfs://test"],
                { value: disputeFee }
            );

            const disputeResolutionAsArbitrator = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: arbitrator } }
            );

            const resolutionNotes = "Evidence supports landlord's claim";
            const hash = await disputeResolutionAsArbitrator.write.resolveDispute([
                1n,
                1, // FavorLandlord
                resolutionNotes,
            ]);

            await viem.assertions.emitWithArgs(
                hash,
                disputeResolution,
                "DisputeResolved",
                [1n, 1, arbitrator.account.address] // outcome = FavorLandlord
            );

            const dispute = await disputeResolution.read.disputes([1n]);
            assert.equal(dispute[7], 2); // status = Resolved
            assert.equal(dispute[8], 1); // outcome = FavorLandlord
            assert.equal(dispute[11].toLowerCase(), arbitrator.account.address.toLowerCase()); // resolver
            assert.equal(dispute[12], resolutionNotes);
        });

        it("Should allow arbitrator to resolve dispute in favor of tenant", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            const disputeResolutionAsLandlord = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: landlord } }
            );

            await disputeResolutionAsLandlord.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, "Test", "ipfs://test"],
                { value: disputeFee }
            );

            const hash = await disputeResolution.write.resolveDispute([
                1n,
                2, // FavorTenant
                "Tenant not responsible",
            ]);

            await viem.assertions.emit(hash, disputeResolution, "DisputeResolved");

            const dispute = await disputeResolution.read.disputes([1n]);
            assert.equal(dispute[8], 2); // outcome = FavorTenant
        });

        it("Should revert if trying to resolve already resolved dispute", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            const disputeResolutionAsTenant = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: tenant } }
            );

            await disputeResolutionAsTenant.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, "Test", "ipfs://test"],
                { value: disputeFee }
            );

            await disputeResolution.write.resolveDispute([1n, 1, "Resolved"]);

            await assert.rejects(
                disputeResolution.write.resolveDispute([1n, 2, "Try again"]),
                /Already resolved/
            );
        });
    });

    describe("Cancel Dispute", async function () {
        it("Should allow initiator to cancel open dispute", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            const disputeResolutionAsTenant = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: tenant } }
            );

            await disputeResolutionAsTenant.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, "Test", "ipfs://test"],
                { value: disputeFee }
            );

            const hash = await disputeResolutionAsTenant.write.cancelDispute([1n]);

            await viem.assertions.emitWithArgs(
                hash,
                disputeResolution,
                "DisputeStatusChanged",
                [1n, 3] // DisputeStatus.Cancelled
            );

            const dispute = await disputeResolution.read.disputes([1n]);
            assert.equal(dispute[7], 3); // status = Cancelled
        });

        it("Should revert if non-initiator tries to cancel", async function () {
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            const disputeResolutionAsTenant = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: tenant } }
            );

            await disputeResolutionAsTenant.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, "Test", "ipfs://test"],
                { value: disputeFee }
            );

            const disputeResolutionAsLandlord = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: landlord } }
            );

            await assert.rejects(
                disputeResolutionAsLandlord.write.cancelDispute([1n]),
                (error) => {
                    return error.message.includes("Not initiator");
                }
            );
        });
    });

    describe("Dispute Count", async function () {
        it.skip("Should return correct total disputes count", async function () {
            // TODO: Add totalDisputes function to DisputeResolution contract
            const disputeResolution = await viem.deployContract("DisputeResolution");
            const disputeFee = parseEther("0.01");

            const disputeResolutionAsTenant = await viem.getContractAt(
                "DisputeResolution",
                disputeResolution.address,
                { client: { wallet: tenant } }
            );

            await disputeResolutionAsTenant.write.fileDispute(
                [1n, landlord.account.address, tenant.account.address, "Dispute 1", "ipfs://1"],
                { value: disputeFee }
            );

            await disputeResolutionAsTenant.write.fileDispute(
                [2n, landlord.account.address, tenant.account.address, "Dispute 2", "ipfs://2"],
                { value: disputeFee }
            );

            const totalDisputes = await disputeResolution.read.totalDisputes();
            assert.equal(totalDisputes, 2n);
        });
    });
});
