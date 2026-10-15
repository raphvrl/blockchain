
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("GuestbookModule", (m) => {
  const guestbook = m.contract("Guestbook");

  return { guestbook };
});
