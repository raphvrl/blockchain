import {
  type Address,
  type Hex,
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  getAddress,
  http,
  isAddress,
  parseEther,
} from "viem";
import { baseSepolia } from "viem/chains";
import { escrowAbi, STATES } from "./abi";
import artifact from "./SimpleEscrow.artifact.json";

const DEFAULT_CONTRACT =
  "0x80fB57D424c63FF934a74e0E0B4501973E42989a" as Address;
const STORAGE_KEY = "simple-escrow-address";
const BASESCAN = "https://sepolia.basescan.org";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const connectBtn = $<HTMLButtonElement>("connect");
const loadBtn = $<HTMLButtonElement>("load");
const deployBtn = $<HTMLButtonElement>("deploy");
const fundBtn = $<HTMLButtonElement>("fund");
const deliveredBtn = $<HTMLButtonElement>("mark-delivered");
const cancelBtn = $<HTMLButtonElement>("cancel");
const releaseBtn = $<HTMLButtonElement>("release");
const withdrawBtn = $<HTMLButtonElement>("withdraw");
const addressInput = $<HTMLInputElement>("contract-address");
const freelancerInput = $<HTMLInputElement>("freelancer-address");
const fundAmountInput = $<HTMLInputElement>("fund-amount");
const statusEl = $<HTMLParagraphElement>("status");
const basescanLink = $<HTMLAnchorElement>("basescan");
const networkBadge = $<HTMLSpanElement>("network-badge");

let account: Address | undefined;
let chainId: number | undefined;

type EscrowView = {
  client: Address;
  freelancer: Address;
  amount: bigint;
  owed: bigint;
  state: number;
  contractBalance: bigint;
};

function shorten(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function showStatus(message: string, kind: "ok" | "error" | "") {
  statusEl.hidden = !message;
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`.trim();
}

function explorer(address: string) {
  return `${BASESCAN}/address/${address}`;
}

function wallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask n’est pas installé.");
  }
  if (!account) {
    throw new Error("Connecte d’abord MetaMask.");
  }
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: custom(window.ethereum),
  });
}

async function ensureBaseSepolia() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x14a34" }],
    });
  } catch (error) {
    const err = error as { code?: number };
    if (err.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x14a34",
          chainName: "Base Sepolia",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://sepolia.base.org"],
          blockExplorerUrls: [BASESCAN],
        },
      ],
    });
  }
}

function currentAddress(): Address {
  const value = addressInput.value.trim();
  if (!isAddress(value)) {
    throw new Error("Adresse de contrat invalide.");
  }
  return getAddress(value);
}

async function readEscrow(address: Address): Promise<EscrowView> {
  const contract = {
    address,
    abi: escrowAbi,
  } as const;

  const [client, freelancer, amount, owed, state, contractBalance] =
    await Promise.all([
      publicClient.readContract({ ...contract, functionName: "client" }),
      publicClient.readContract({ ...contract, functionName: "freelancer" }),
      publicClient.readContract({ ...contract, functionName: "amount" }),
      publicClient.readContract({ ...contract, functionName: "owed" }),
      publicClient.readContract({ ...contract, functionName: "state" }),
      publicClient.getBalance({ address }),
    ]);

  return {
    client,
    freelancer,
    amount,
    owed,
    state: Number(state),
    contractBalance,
  };
}

function roleOf(view: EscrowView) {
  if (!account) return "Non connecté";
  if (account.toLowerCase() === view.client.toLowerCase()) return "Client";
  if (account.toLowerCase() === view.freelancer.toLowerCase()) return "Freelance";
  return "Observateur";
}

function setText(id: string, value: string) {
  $(id).textContent = value;
}

function render(view: EscrowView) {
  const role = roleOf(view);
  setText("client", view.client);
  setText("freelancer", view.freelancer);
  setText("amount", `${formatEther(view.amount)} ETH`);
  setText("owed", `${formatEther(view.owed)} ETH`);
  setText("contract-balance", `${formatEther(view.contractBalance)} ETH`);
  setText("role", role);

  for (const step of document.querySelectorAll<HTMLSpanElement>("#steps span")) {
    step.classList.toggle("active", Number(step.dataset.state) === view.state);
  }

  const isClient = role === "Client";
  const isFreelancer = role === "Freelance";
  fundBtn.disabled = !(isClient && view.state === 0);
  deliveredBtn.disabled = !(isFreelancer && view.state === 1);
  cancelBtn.disabled = !(isClient && view.state === 1);
  releaseBtn.disabled = !(isClient && view.state === 2);
  withdrawBtn.disabled = !(
    view.owed > 0n &&
    ((isFreelancer && view.state === 3) || (isClient && view.state === 4))
  );

  basescanLink.href = explorer(currentAddress());
}

async function refreshWallet() {
  if (!account) {
    setText("account", "—");
    setText("balance", "—");
    setText("role", "—");
    networkBadge.textContent = "Réseau inconnu";
    networkBadge.className = "badge";
    return;
  }

  setText("account", account);
  const [balance, id] = await Promise.all([
    publicClient.getBalance({ address: account }),
    window.ethereum
      ? window.ethereum
          .request({ method: "eth_chainId" })
          .then((value) => Number(value as string))
      : Promise.resolve(undefined),
  ]);
  chainId = id;
  setText("balance", `${formatEther(balance)} ETH`);
  const onBase = chainId === baseSepolia.id;
  networkBadge.textContent = onBase
    ? "Base Sepolia"
    : `Chain ${chainId ?? "?"}`;
  networkBadge.className = `badge ${onBase ? "ok" : "bad"}`;
}

async function load() {
  const address = currentAddress();
  localStorage.setItem(STORAGE_KEY, address);
  const view = await readEscrow(address);
  render(view);
  await refreshWallet();
  showStatus(`État : ${STATES[view.state] ?? view.state}`, "ok");
}

async function send(fn: () => Promise<Hex>, okMessage: string) {
  try {
    showStatus("Transaction en cours…", "");
    await ensureBaseSepolia();
    const hash = await fn();
    showStatus(`En attente de confirmation : ${hash}`, "");
    await publicClient.waitForTransactionReceipt({ hash });
    await load();
    showStatus(okMessage, "ok");
  } catch (error) {
    const err = error as { shortMessage?: string; message?: string };
    showStatus(err.shortMessage ?? err.message ?? "Erreur", "error");
  }
}

async function connect() {
  if (!window.ethereum) {
    showStatus("Installe MetaMask pour tester le contrat.", "error");
    return;
  }
  await ensureBaseSepolia();
  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  account = getAddress(accounts[0]);
  connectBtn.textContent = shorten(account);
  await refreshWallet();
  try {
    await load();
  } catch (error) {
    const err = error as { message?: string };
    showStatus(err.message ?? "Impossible de lire le contrat.", "error");
  }
}

connectBtn.addEventListener("click", () => {
  void connect();
});

loadBtn.addEventListener("click", () => {
  void load().catch((error: { message?: string }) => {
    showStatus(error.message ?? "Chargement impossible.", "error");
  });
});

deployBtn.addEventListener("click", () => {
  void send(async () => {
    const freelancer = freelancerInput.value.trim();
    if (!isAddress(freelancer)) {
      throw new Error("Adresse freelance invalide.");
    }
    const client = wallet();
    const hash = await client.deployContract({
      abi: escrowAbi,
      bytecode: artifact.bytecode as Hex,
      args: [getAddress(freelancer)],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) {
      throw new Error("Le déploiement n’a pas renvoyé d’adresse.");
    }
    addressInput.value = receipt.contractAddress;
    localStorage.setItem(STORAGE_KEY, receipt.contractAddress);
    return hash;
  }, "Nouveau contrat déployé.");
});

fundBtn.addEventListener("click", () => {
  void send(
    () =>
      wallet().writeContract({
        address: currentAddress(),
        abi: escrowAbi,
        functionName: "fund",
        value: parseEther(fundAmountInput.value.trim() || "0"),
      }),
    "Dépôt effectué.",
  );
});

deliveredBtn.addEventListener("click", () => {
  void send(
    () =>
      wallet().writeContract({
        address: currentAddress(),
        abi: escrowAbi,
        functionName: "markDelivered",
      }),
    "Travail marqué comme livré.",
  );
});

cancelBtn.addEventListener("click", () => {
  void send(
    () =>
      wallet().writeContract({
        address: currentAddress(),
        abi: escrowAbi,
        functionName: "cancel",
      }),
    "Escrow annulé.",
  );
});

releaseBtn.addEventListener("click", () => {
  void send(
    () =>
      wallet().writeContract({
        address: currentAddress(),
        abi: escrowAbi,
        functionName: "releasePayment",
      }),
    "Paiement libéré.",
  );
});

withdrawBtn.addEventListener("click", () => {
  void send(
    () =>
      wallet().writeContract({
        address: currentAddress(),
        abi: escrowAbi,
        functionName: "withdraw",
      }),
    "Retrait effectué.",
  );
});

function listenWallet() {
  if (!window.ethereum) return;
  window.ethereum.on("accountsChanged", (accounts) => {
    const list = accounts as string[];
    account = list[0] ? getAddress(list[0]) : undefined;
    connectBtn.textContent = account ? shorten(account) : "Connecter MetaMask";
    void refreshWallet();
    void load().catch(() => undefined);
  });
  window.ethereum.on("chainChanged", () => {
    void refreshWallet();
  });
}

addressInput.value = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CONTRACT;
basescanLink.href = explorer(addressInput.value);
listenWallet();
void load().catch(() => {
  showStatus(
    "Connecte MetaMask, ou charge le contrat déjà déployé sur Base Sepolia.",
    "",
  );
});
