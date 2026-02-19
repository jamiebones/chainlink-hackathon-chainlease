import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("PaymentEscrow", async function () {
    const { viem } = await network.connect();
    const publicClient = await viem.getPublicClient();
    const [owner, landlord, tenant, otherAccount] = await viem.getWalletClients();

    describe("Deployment", async function () {
        it("Should set the deployer as owner", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const contractOwner = await paymentEscrow.read.owner();

            assert.equal(contractOwner.toLowerCase(), owner.account.address.toLowerCase());
        });

        it("Should have correct constants", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");

            const lateFeePercentage = await paymentEscrow.read.LATE_FEE_PERCENTAGE();
            const gracePeriod = await paymentEscrow.read.GRACE_PERIOD();

            assert.equal(lateFeePercentage, 5n);
            assert.equal(gracePeriod, 259200n); // 3 days in seconds
        });
    });

    describe("Security Deposit", async function () {
        it("Should allow tenant to deposit security", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const depositAmount = parseEther("3.0");

            const paymentEscrowAsTenant = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: tenant } }
            );

            const hash = await paymentEscrowAsTenant.write.depositSecurity(
                [1n, landlord.account.address],
                { value: depositAmount }
            );

            await viem.assertions.emit(hash, paymentEscrow, "DepositReceived");

            const escrow = await paymentEscrow.read.escrows([1n]);
            assert.equal(escrow[0], 1n); // leaseId
            assert.equal(escrow[1].toLowerCase(), landlord.account.address.toLowerCase()); // landlord
            assert.equal(escrow[2].toLowerCase(), tenant.account.address.toLowerCase()); // tenant
            assert.equal(escrow[3], depositAmount); // depositAmount
            assert.equal(escrow[5], false); // released
            assert.equal(escrow[6], false); // forfeited
        });

        it("Should revert if deposit amount is zero", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");

            const paymentEscrowAsTenant = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: tenant } }
            );

            await assert.rejects(
                paymentEscrowAsTenant.write.depositSecurity(
                    [1n, landlord.account.address],
                    { value: 0n }
                ),
                /Amount must be > 0/
            );
        });

        it("Should revert if deposit already exists", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const depositAmount = parseEther("3.0");

            const paymentEscrowAsTenant = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: tenant } }
            );

            await paymentEscrowAsTenant.write.depositSecurity(
                [1n, landlord.account.address],
                { value: depositAmount }
            );

            await assert.rejects(
                paymentEscrowAsTenant.write.depositSecurity(
                    [1n, landlord.account.address],
                    { value: depositAmount }
                ),
                /Already deposited/
            );
        });

        it("Should revert if landlord address is invalid", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");

            const paymentEscrowAsTenant = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: tenant } }
            );

            await assert.rejects(
                paymentEscrowAsTenant.write.depositSecurity(
                    [1n, "0x0000000000000000000000000000000000000000"],
                    { value: parseEther("3.0") }
                ),
                /Invalid landlord/
            );
        });
    });

    describe("Release Deposit", async function () {
        it("Should allow landlord to release deposit to tenant", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const depositAmount = parseEther("3.0");

            const paymentEscrowAsTenant = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: tenant } }
            );

            await paymentEscrowAsTenant.write.depositSecurity(
                [1n, landlord.account.address],
                { value: depositAmount }
            );

            const tenantBalanceBefore = await publicClient.getBalance({
                address: tenant.account.address,
            });

            const paymentEscrowAsLandlord = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: landlord } }
            );

            const hash = await paymentEscrowAsLandlord.write.releaseDeposit([1n]);

            await viem.assertions.emit(hash, paymentEscrow, "DepositReleased");

            const escrow = await paymentEscrow.read.escrows([1n]);
            assert.equal(escrow[5], true); // released

            const tenantBalanceAfter = await publicClient.getBalance({
                address: tenant.account.address,
            });

            assert.equal(tenantBalanceAfter - tenantBalanceBefore, depositAmount);
        });

        it("Should revert if deposit already released", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const depositAmount = parseEther("3.0");

            const paymentEscrowAsTenant = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: tenant } }
            );

            await paymentEscrowAsTenant.write.depositSecurity(
                [1n, landlord.account.address],
                { value: depositAmount }
            );

            const paymentEscrowAsLandlord = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: landlord } }
            );

            await paymentEscrowAsLandlord.write.releaseDeposit([1n]);

            await assert.rejects(
                paymentEscrowAsLandlord.write.releaseDeposit([1n]),
                /Already released/
            );
        });

        it("Should revert if non-authorized user tries to release", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const depositAmount = parseEther("3.0");

            const paymentEscrowAsTenant = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: tenant } }
            );

            await paymentEscrowAsTenant.write.depositSecurity(
                [1n, landlord.account.address],
                { value: depositAmount }
            );

            const paymentEscrowAsOther = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: otherAccount } }
            );

            await assert.rejects(
                paymentEscrowAsOther.write.releaseDeposit([1n]),
                /Not authorized/
            );
        });
    });

    describe("Rent Payment", async function () {
        it("Should allow tenant to pay rent", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const rentAmount = parseEther("1.5");

            const landlordBalanceBefore = await publicClient.getBalance({
                address: landlord.account.address,
            });

            const paymentEscrowAsTenant = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: tenant } }
            );

            const hash = await paymentEscrowAsTenant.write.payRent(
                [1n, landlord.account.address],
                { value: rentAmount }
            );

            await viem.assertions.emit(hash, paymentEscrow, "RentPaid");

            const landlordBalanceAfter = await publicClient.getBalance({
                address: landlord.account.address,
            });

            assert.equal(landlordBalanceAfter - landlordBalanceBefore, rentAmount);

            const totalPaid = await paymentEscrow.read.totalPaid([1n]);
            assert.equal(totalPaid, rentAmount);
        });

        it("Should track payment history", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const rentAmount = parseEther("1.5");

            const paymentEscrowAsTenant = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: tenant } }
            );

            await paymentEscrowAsTenant.write.payRent(
                [1n, landlord.account.address],
                { value: rentAmount }
            );

            await paymentEscrowAsTenant.write.payRent(
                [1n, landlord.account.address],
                { value: rentAmount }
            );

            const history = await paymentEscrow.read.getPaymentHistory([1n]);
            assert.equal(history.length, 2);
        });

        it("Should revert if payment amount is zero", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");

            const paymentEscrowAsTenant = await viem.getContractAt(
                "PaymentEscrow",
                paymentEscrow.address,
                { client: { wallet: tenant } }
            );

            await assert.rejects(
                paymentEscrowAsTenant.write.payRent(
                    [1n, landlord.account.address],
                    { value: 0n }
                ),
                /Amount must be > 0/
            );
        });
    });

    describe("Late Fee Calculation", async function () {
        it("Should calculate correct late fee percentage", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const rentAmount = parseEther("1000");

            const lateFee = await paymentEscrow.read.calculateLateFee([rentAmount]);
            const expectedFee = parseEther("50"); // 5% of 1000

            assert.equal(lateFee, expectedFee);
        });
    });

    describe("Collect Rent (Automated)", async function () {
        it("Should allow authorized party to collect rent", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const rentAmount = parseEther("1.5");
            const lateFee = parseEther("0.075"); // 5% late fee
            const totalAmount = rentAmount + lateFee;

            const landlordBalanceBefore = await publicClient.getBalance({
                address: landlord.account.address,
            });

            // Owner can collect rent (simulating CRE workflow)
            const hash = await paymentEscrow.write.collectRent(
                [1n, tenant.account.address, landlord.account.address, rentAmount, lateFee],
                { value: totalAmount }
            );

            await viem.assertions.emit(hash, paymentEscrow, "RentPaid");

            const landlordBalanceAfter = await publicClient.getBalance({
                address: landlord.account.address,
            });

            assert.equal(landlordBalanceAfter - landlordBalanceBefore, totalAmount);
        });

        it("Should revert if insufficient payment", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const rentAmount = parseEther("1.5");
            const lateFee = parseEther("0.075");
            const insufficientAmount = parseEther("1.0");

            await assert.rejects(
                paymentEscrow.write.collectRent(
                    [1n, tenant.account.address, landlord.account.address, rentAmount, lateFee],
                    { value: insufficientAmount }
                ),
                /Insufficient payment/
            );
        });

        it("Should refund excess payment", async function () {
            const paymentEscrow = await viem.deployContract("PaymentEscrow");
            const rentAmount = parseEther("1.5");
            const lateFee = parseEther("0.075");
            const totalAmount = rentAmount + lateFee;
            const excessAmount = parseEther("0.5");

            const ownerBalanceBefore = await publicClient.getBalance({
                address: owner.account.address,
            });

            await paymentEscrow.write.collectRent(
                [1n, tenant.account.address, landlord.account.address, rentAmount, lateFee],
                { value: totalAmount + excessAmount }
            );

            const ownerBalanceAfter = await publicClient.getBalance({
                address: owner.account.address,
            });

            // Owner should get refunded the excess (minus gas)
            const balanceDiff = ownerBalanceBefore - ownerBalanceAfter;
            assert(balanceDiff < totalAmount + parseEther("0.01")); // Account for gas
        });
    });
});
