
import { network } from "hardhat";

const { viem } = await network.connect();
const publicClient = await viem.getPublicClient();

console.log("Chain ID :", await publicClient.getChainId());
console.log("Bloc actuel :", await publicClient.getBlockNumber());
