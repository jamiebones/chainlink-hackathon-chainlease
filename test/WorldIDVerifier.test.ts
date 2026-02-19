import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes } from "viem";

describe("WorldIDVerifier", async function () {
    const { viem } = await network.connect();
    const [owner, user1, user2] = await viem.getWalletClients();

    const mockWorldIdRouter = "0x1234567890123456789012345678901234567890";
    const appId = "app_staging_test123";
    const actionId = "apply-for-lease";

    describe("Deployment", async function () {
        it("Should set the correct configuration", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const routerAddress = await worldIdVerifier.read.worldIdRouter();
            const storedAppId = await worldIdVerifier.read.appId();
            const storedActionId = await worldIdVerifier.read.actionId();

            assert.equal(routerAddress.toLowerCase(), mockWorldIdRouter.toLowerCase());
            assert.equal(storedAppId, appId);
            assert.equal(storedActionId, actionId);
        });

        it("Should revert if router address is invalid", async function () {
            await assert.rejects(
                viem.deployContract("WorldIDVerifier", [
                    "0x0000000000000000000000000000000000000000",
                    appId,
                    actionId,
                ]),
                /Invalid router address/
            );
        });
    });

    describe("Mock Verification", async function () {
        it("Should verify a user with mock verification", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const nullifierHash = keccak256(toBytes("unique-nullifier-1"));

            const hash = await worldIdVerifier.write.mockVerify([
                user1.account.address,
                nullifierHash,
            ]);

            await viem.assertions.emit(hash, worldIdVerifier, "ProofVerified");

            const isVerified = await worldIdVerifier.read.verifiedNullifiers([
                nullifierHash,
            ]);
            assert.equal(isVerified, true);

            const userNullifier = await worldIdVerifier.read.userNullifiers([
                user1.account.address,
            ]);
            assert.equal(userNullifier, nullifierHash);
        });

        it("Should revert if nullifier already used", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const nullifierHash = keccak256(toBytes("unique-nullifier-1"));

            await worldIdVerifier.write.mockVerify([
                user1.account.address,
                nullifierHash,
            ]);

            await assert.rejects(
                worldIdVerifier.write.mockVerify([user2.account.address, nullifierHash]),
                /Nullifier already used/
            );
        });

        it("Should revert if user address is invalid", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const nullifierHash = keccak256(toBytes("unique-nullifier-1"));

            await assert.rejects(
                worldIdVerifier.write.mockVerify([
                    "0x0000000000000000000000000000000000000000",
                    nullifierHash,
                ]),
                /Invalid user address/
            );
        });

        it("Should revert if nullifier is zero", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            await assert.rejects(
                worldIdVerifier.write.mockVerify([
                    user1.account.address,
                    "0x0000000000000000000000000000000000000000000000000000000000000000",
                ]),
                /Invalid nullifier/
            );
        });
    });

    describe("Full Proof Verification", async function () {
        it("Should verify a World ID proof", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const nullifierHash = keccak256(toBytes("unique-nullifier-1"));
            const root = 12345n;
            const proof = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n];

            const hash = await worldIdVerifier.write.verifyProof([
                user1.account.address,
                root,
                nullifierHash,
                proof,
            ]);

            await viem.assertions.emit(hash, worldIdVerifier, "ProofVerified");
        });

        it("Should prevent nullifier reuse in proof verification", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const nullifierHash = keccak256(toBytes("unique-nullifier-1"));
            const root = 12345n;
            const proof = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n];

            await worldIdVerifier.write.verifyProof([
                user1.account.address,
                root,
                nullifierHash,
                proof,
            ]);

            await assert.rejects(
                worldIdVerifier.write.verifyProof([
                    user2.account.address,
                    root,
                    nullifierHash,
                    proof,
                ]),
                /Nullifier already used/
            );
        });
    });

    describe("Checking Verification Status", async function () {
        it("Should return true for verified user", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const nullifierHash = keccak256(toBytes("unique-nullifier-1"));

            await worldIdVerifier.write.mockVerify([
                user1.account.address,
                nullifierHash,
            ]);

            const isVerified = await worldIdVerifier.read.isVerified([user1.account.address]);
            assert.equal(isVerified, true);
        });

        it("Should return false for unverified user", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const nullifierHash = keccak256(toBytes("unique-nullifier-1"));

            const isVerified = await worldIdVerifier.read.isVerified([user1.account.address]);
            assert.equal(isVerified, false);
        });
    });

    describe("Nullifier Management", async function () {
        it("Should track user nullifiers correctly", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const nullifierHash1 = keccak256(toBytes("unique-nullifier-1"));
            const nullifierHash2 = keccak256(toBytes("unique-nullifier-2"));

            await worldIdVerifier.write.mockVerify([
                user1.account.address,
                nullifierHash1,
            ]);

            await worldIdVerifier.write.mockVerify([
                user2.account.address,
                nullifierHash2,
            ]);

            const user1Nullifier = await worldIdVerifier.read.userNullifiers([
                user1.account.address,
            ]);
            const user2Nullifier = await worldIdVerifier.read.userNullifiers([
                user2.account.address,
            ]);

            assert.equal(user1Nullifier, nullifierHash1);
            assert.equal(user2Nullifier, nullifierHash2);
            assert.notEqual(user1Nullifier, user2Nullifier);
        });

        it("Should ensure nullifiers are globally unique", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const nullifierHash = keccak256(toBytes("unique-nullifier-1"));

            await worldIdVerifier.write.mockVerify([
                user1.account.address,
                nullifierHash,
            ]);

            // Different user trying to use same nullifier
            await assert.rejects(
                worldIdVerifier.write.mockVerify([user2.account.address, nullifierHash]),
                /Nullifier already used/
            );
        });
    });

    describe("Revoke Verification", async function () {
        it("Should allow owner to revoke verification", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const nullifierHash = keccak256(toBytes("unique-nullifier-1"));

            await worldIdVerifier.write.mockVerify([
                user1.account.address,
                nullifierHash,
            ]);

            const hash = await worldIdVerifier.write.revokeProof([
                nullifierHash,
            ]);

            await viem.assertions.emitWithArgs(
                hash,
                worldIdVerifier,
                "ProofRevoked",
                [nullifierHash, user1.account.address]
            );

            const isVerified = await worldIdVerifier.read.verifiedNullifiers([
                nullifierHash,
            ]);
            assert.equal(isVerified, false);
        });

        it("Should allow user to be re-verified after revocation", async function () {
            const worldIdVerifier = await viem.deployContract("WorldIDVerifier", [
                mockWorldIdRouter,
                appId,
                actionId,
            ]);

            const nullifierHash = keccak256(toBytes("unique-nullifier-1"));

            await worldIdVerifier.write.mockVerify([
                user1.account.address,
                nullifierHash,
            ]);

            await worldIdVerifier.write.revokeProof([nullifierHash]);

            // Should be able to re-verify
            await worldIdVerifier.write.mockVerify([
                user1.account.address,
                nullifierHash,
            ]);

            const isVerified = await worldIdVerifier.read.verifiedNullifiers([
                nullifierHash,
            ]);
            assert.equal(isVerified, true);
        });
    });
});
