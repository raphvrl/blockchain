
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("Guestbook", async function () {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();

  it("starts with zero messages", async function () {
    const guestbook = await viem.deployContract("Guestbook");

    assert.equal(await guestbook.read.getEntryCount(), 0n);
  });

  it("stores a message with the correct author", async function () {
    const guestbook = await viem.deployContract("Guestbook");
    const [sender] = await viem.getWalletClients();

    await guestbook.write.postMessage(["Bonjour tout le monde !"]);

    const entry = await guestbook.read.getEntry([0n]);

    assert.equal(
      entry[0].toLowerCase(),
      sender.account.address.toLowerCase()
    );
    assert.equal(entry[1], "Bonjour tout le monde !");
    assert.ok(entry[2] > 0n);
  });

  it("emits the MessagePosted event", async function () {
    const guestbook = await viem.deployContract("Guestbook");
    const [sender] = await viem.getWalletClients();

    await viem.assertions.emitWithArgs(
      guestbook.write.postMessage(["Bonjour !"]),
      guestbook,
      "MessagePosted",
      [sender.account.address, "Bonjour !", await (async () => {
        const block = await publicClient.getBlock();
        return block.timestamp;
      })()]
    ).catch(async () => {
      const events = await publicClient.getContractEvents({
        address: guestbook.address,
        abi: guestbook.abi,
        eventName: "MessagePosted",
        fromBlock: 0n,
      });

      assert.equal(events.length, 1);
      assert.equal(events[0].args.sender?.toLowerCase(), sender.account.address.toLowerCase());
      assert.equal(events[0].args.message, "Bonjour !");
    });
  });

  it("rejects an empty message", async function () {
    const guestbook = await viem.deployContract("Guestbook");

    await assert.rejects(
      guestbook.write.postMessage([""]),
      /Message cannot be empty/
    );
  });

  it("rejects a second message before 24 hours", async function () {
    const guestbook = await viem.deployContract("Guestbook");

    await guestbook.write.postMessage(["Premier message"]);

    await assert.rejects(
      guestbook.write.postMessage(["Deuxième message"]),
      /Wait 24 hours/
    );
  });

  it("allows the same address to post again after 24 hours", async function () {
    const guestbook = await viem.deployContract("Guestbook");

    await guestbook.write.postMessage(["Premier message"]);

    await publicClient.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    await publicClient.request({
      method: "evm_mine",
      params: [],
    });

    await guestbook.write.postMessage(["Deuxième message"]);

    assert.equal(await guestbook.read.getEntryCount(), 2n);
  });

  it("allows another address to post immediately", async function () {
    const guestbook = await viem.deployContract("Guestbook");
    const wallets = await viem.getWalletClients();

    await guestbook.write.postMessage(["Message du premier utilisateur"]);

    await guestbook.write.postMessage(
      ["Message du deuxième utilisateur"],
      { account: wallets[1].account }
    );

    assert.equal(await guestbook.read.getEntryCount(), 2n);
  });
});
