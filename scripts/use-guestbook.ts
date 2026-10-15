
import { network } from "hardhat";

async function main() {
  const { viem } = await network.connect();

  const guestbook = await viem.getContractAt(
    "Guestbook",
    "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
  );

  await guestbook.write.postMessage([
    "Bonjour ! Mon premier message sur la blockchain."
  ]);

  const count = await guestbook.read.getEntryCount();

  console.log("Nombre de messages :", count.toString());

  const entry = await guestbook.read.getEntry([count - 1n]);

  console.log("Auteur :", entry[0]);
  console.log("Message :", entry[1]);
  console.log("Date :", entry[2].toString());
}

main().catch(console.error);
