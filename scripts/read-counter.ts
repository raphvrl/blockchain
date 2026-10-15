
import { network } from "hardhat";

async function main() {
  const { viem } = await network.connect();

  const counter = await viem.getContractAt(
    "Counter",
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  );

  const value = await counter.read.x();
  console.log("Valeur du compteur :", value.toString());
}

main().catch(console.error);
