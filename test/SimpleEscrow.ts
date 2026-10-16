
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

describe("SimpleEscrow", async function () {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const wallets = await viem.getWalletClients();

  const client = wallets[0];
  const freelancer = wallets[1];
  const other = wallets[2];

  async function deployEscrow() {
    return viem.deployContract("SimpleEscrow", [
      freelancer.account.address,
    ]);
  }

  it("starts in the None state", async function () {
    const escrow = await deployEscrow();

    assert.equal(Number(await escrow.read.state()), 0);
    assert.equal(
      (await escrow.read.client()).toLowerCase(),
      client.account.address.toLowerCase()
    );
    assert.equal(
      (await escrow.read.freelancer()).toLowerCase(),
      freelancer.account.address.toLowerCase()
    );
    assert.equal(await escrow.read.owed(), 0n);
  });

  it("allows the client to deposit ETH", async function () {
    const escrow = await deployEscrow();
    const amount = parseEther("1");

    await escrow.write.fund([], {
      account: client.account,
      value: amount,
    });

    assert.equal(Number(await escrow.read.state()), 1);
    assert.equal(await escrow.read.amount(), amount);
  });

  it("rejects a deposit from someone other than the client", async function () {
    const escrow = await deployEscrow();

    await assert.rejects(
      escrow.write.fund([], {
        account: other.account,
        value: parseEther("1"),
      }),
      /Only client/
    );
  });

  it("rejects a deposit of zero ETH", async function () {
    const escrow = await deployEscrow();

    await assert.rejects(
      escrow.write.fund([], {
        account: client.account,
        value: 0n,
      }),
      /Amount must be positive/
    );
  });

  it("allows only the freelancer to mark work as delivered", async function () {
    const escrow = await deployEscrow();

    await escrow.write.fund([], {
      account: client.account,
      value: parseEther("1"),
    });

    await assert.rejects(
      escrow.write.markDelivered([], {
        account: client.account,
      }),
      /Only freelancer/
    );

    await escrow.write.markDelivered([], {
      account: freelancer.account,
    });

    assert.equal(Number(await escrow.read.state()), 2);
  });

  it("allows the client to release payment after delivery", async function () {
    const escrow = await deployEscrow();
    const amount = parseEther("1");

    await escrow.write.fund([], {
      account: client.account,
      value: amount,
    });

    await escrow.write.markDelivered([], {
      account: freelancer.account,
    });

    await escrow.write.releasePayment([], {
      account: client.account,
    });

    assert.equal(Number(await escrow.read.state()), 3);
    assert.equal(await escrow.read.owed(), amount);
  });

  it("allows the client to cancel before delivery", async function () {
    const escrow = await deployEscrow();
    const amount = parseEther("1");

    await escrow.write.fund([], {
      account: client.account,
      value: amount,
    });

    await escrow.write.cancel([], {
      account: client.account,
    });

    assert.equal(Number(await escrow.read.state()), 4);
    assert.equal(await escrow.read.owed(), amount);
  });

  it("allows the freelancer to withdraw released payment", async function () {
    const escrow = await deployEscrow();
    const amount = parseEther("1");

    await escrow.write.fund([], {
      account: client.account,
      value: amount,
    });

    await escrow.write.markDelivered([], {
      account: freelancer.account,
    });

    await escrow.write.releasePayment([], {
      account: client.account,
    });

    const balanceBefore = await publicClient.getBalance({
      address: freelancer.account.address,
    });

    await escrow.write.withdraw([], {
      account: freelancer.account,
    });

    const balanceAfter = await publicClient.getBalance({
      address: freelancer.account.address,
    });

    assert.equal(await escrow.read.owed(), 0n);
    assert.ok(balanceAfter > balanceBefore);
  });

  it("allows the client to withdraw a refund after cancellation", async function () {
    const escrow = await deployEscrow();
    const amount = parseEther("1");

    await escrow.write.fund([], {
      account: client.account,
      value: amount,
    });

    await escrow.write.cancel([], {
      account: client.account,
    });

    await escrow.write.withdraw([], {
      account: client.account,
    });

    assert.equal(await escrow.read.owed(), 0n);
  });

  it("rejects withdrawal by the wrong person", async function () {
    const escrow = await deployEscrow();

    await escrow.write.fund([], {
      account: client.account,
      value: parseEther("1"),
    });

    await escrow.write.markDelivered([], {
      account: freelancer.account,
    });

    await escrow.write.releasePayment([], {
      account: client.account,
    });

    await assert.rejects(
      escrow.write.withdraw([], {
        account: other.account,
      }),
      /Only freelancer/
    );
  });

  it("rejects a second withdrawal", async function () {
    const escrow = await deployEscrow();

    await escrow.write.fund([], {
      account: client.account,
      value: parseEther("1"),
    });

    await escrow.write.markDelivered([], {
      account: freelancer.account,
    });

    await escrow.write.releasePayment([], {
      account: client.account,
    });

    await escrow.write.withdraw([], {
      account: freelancer.account,
    });

    await assert.rejects(
      escrow.write.withdraw([], {
        account: freelancer.account,
      }),
      /Nothing to withdraw/
    );
  });
});
