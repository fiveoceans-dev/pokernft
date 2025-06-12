import { Cog8ToothIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-stark/useTargetNetwork";
import { useGlobalState } from "~~/services/store/store";
import { devnet, sepolia, mainnet } from "@starknet-react/chains";
import { Faucet } from "~~/components/scaffold-stark/Faucet";
import { FaucetSepolia } from "~~/components/scaffold-stark/FaucetSepolia";
import { BlockExplorerSepolia } from "./scaffold-stark/BlockExplorerSepolia";
import { BlockExplorer } from "./scaffold-stark/BlockExplorer";
import Link from "next/link";

/**
 * Site footer
 */
export const Footer = () => {
  const nativeCurrencyPrice = useGlobalState(
    (state) => state.nativeCurrencyPrice,
  );
  const { targetNetwork } = useTargetNetwork();

  // NOTE: workaround - check by name also since in starknet react devnet and sepolia has the same chainId
  const isLocalNetwork =
    targetNetwork.id === devnet.id && targetNetwork.network === devnet.network;
  const isSepoliaNetwork =
    targetNetwork.id === sepolia.id &&
    targetNetwork.network === sepolia.network;
  const isMainnetNetwork =
    targetNetwork.id === mainnet.id &&
    targetNetwork.network === mainnet.network;

  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0 bg-base-100">
      <div className="w-full">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-sm w-full">
            <div className="text-center">
              <p>
                All rights reserved © 2025
              </p>
            </div>
          </div>
        </ul>
      </div>
    </div>
  );
};
