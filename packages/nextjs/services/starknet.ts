// src/services/starknet.ts
import { Provider, Account, Contract } from "starknet";
import type { Abi } from "starknet";

// These constants point to addresses + ABI locations
import {
  NFT_TICKET_ADDRESS,
  TABLE_STATE_ADDRESS,
  DECK_SHUFFLER_ADDRESS,
  NFT_TICKET_ABI,
  TABLE_STATE_ABI,
  DECK_SHUFFLER_ABI,
} from "../constants";

let provider: Provider | null = null;
let account: Account | null = null;

/**
 * Initialize Starknet provider + account once the user connects their wallet.
 */
export function initStarknet(starknetProvider?: any) {
  const rpcUrl =
    process.env.NEXT_PUBLIC_PROVIDER_URL ||
    process.env.NEXT_PUBLIC_DEVNET_PROVIDER_URL;
  provider = rpcUrl ? new Provider({ nodeUrl: rpcUrl }) : new Provider();
  account = starknetProvider?.account ?? null;
}

async function loadContract(
  address: string,
  abiPath: string,
): Promise<Contract> {
  if (!provider) throw new Error("Starknet provider not initialized");
  try {
    const res = await fetch(abiPath);
    const abi: Abi = await res.json();
    return new Contract(abi, address, account || provider);
  } catch (err) {
    console.error("Failed to load contract", err);
    throw err;
  }
}

export async function getNFTTicketContract(): Promise<Contract> {
  return loadContract(NFT_TICKET_ADDRESS, NFT_TICKET_ABI);
}

export async function getTableStateContract(): Promise<Contract> {
  return loadContract(TABLE_STATE_ADDRESS, TABLE_STATE_ABI);
}

export async function getDeckShufflerContract(): Promise<Contract> {
  return loadContract(DECK_SHUFFLER_ADDRESS, DECK_SHUFFLER_ABI);
}

/**
 * Checks if `userAddress` owns the NFT with token_id == `tournamentId`.
 */
export async function checkNFTOwnership(
  userAddress: string,
  tournamentId: string,
): Promise<boolean> {
  const nft = await getNFTTicketContract();

  // Pack tokenId as Uint256 = [low, high]
  const low = BigInt(tournamentId);
  const high = BigInt(0);

  try {
    // Pass the Uint256 array directly as positional arguments:
    const res: any = await nft.call("owner_of", [low, high]);
    return res.owner.toString() === userAddress;
  } catch {
    return false;
  }
}
