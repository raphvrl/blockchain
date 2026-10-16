import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SimpleEscrowModule", (m) => {
  const freelancer = m.getParameter(
    "freelancer",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  );

  const escrow = m.contract("SimpleEscrow", [freelancer]);

  return { escrow };
});
