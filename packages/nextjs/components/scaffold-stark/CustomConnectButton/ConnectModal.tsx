import { Connector, useConnect } from "@starknet-react/core";
import { useRef, useState } from "react";
import Wallet from "~~/components/scaffold-stark/CustomConnectButton/Wallet";
import { useLocalStorage } from "usehooks-ts";
import { BurnerConnector, burnerAccounts } from "@scaffold-stark/stark-burner";
import { useTheme } from "next-themes";
import { BlockieAvatar } from "../BlockieAvatar";
import GenericModal from "./GenericModal";
import { LAST_CONNECTED_TIME_LOCALSTORAGE_KEY } from "~~/utils/Constants";
import { randomAddress } from "../../../utils/address";

const loader = ({ src }: { src: string }) => {
  return src;
};

const ConnectModal = () => {
  const modalRef = useRef<HTMLInputElement>(null);
  const [isBurnerWallet, setIsBurnerWallet] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const { connectors, connect, error, status, ...props } = useConnect();
  const [_, setLastConnector] = useLocalStorage<{ id: string; ix?: number }>(
    "lastUsedConnector",
    { id: "" },
    {
      initializeWithValue: false,
    },
  );
  const [, setLastConnectionTime] = useLocalStorage<number>(
    LAST_CONNECTED_TIME_LOCALSTORAGE_KEY,
    0,
  );

  const handleCloseModal = () => {
    if (modalRef.current) {
      modalRef.current.checked = false;
    }
  };

  function handleConnectWallet(
    e: React.MouseEvent<HTMLButtonElement>,
    connector: Connector,
  ): void {
    if (connector.id === "burner-wallet") {
      setIsBurnerWallet(true);
      return;
    }
    
    // Clear ALL localStorage before connecting real wallet to ensure clean state
    if (typeof window !== "undefined") {
      // Clear all wallet-related storage keys
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("sessionId");
      // Clear any other keys that might affect wallet state
      Object.keys(localStorage).forEach(key => {
        if (key.includes('wallet') || key.includes('session') || key.includes('connect')) {
          // Skip the connector storage we're about to set
          if (key !== 'lastUsedConnector' && key !== LAST_CONNECTED_TIME_LOCALSTORAGE_KEY) {
            localStorage.removeItem(key);
          }
        }
      });
    }
    
    console.log("💼 Connecting real wallet with clean state...");
    connect({ connector });
    setLastConnector({ id: connector.id });
    setLastConnectionTime(Date.now());
    handleCloseModal();
  }

  function handleConnectBurner(
    e: React.MouseEvent<HTMLButtonElement>,
    ix: number,
  ) {
    // Clear ALL localStorage before connecting burner wallet to ensure clean state
    if (typeof window !== "undefined") {
      // Clear all wallet-related storage keys
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("sessionId");
      // Clear any other keys that might affect wallet state
      Object.keys(localStorage).forEach(key => {
        if (key.includes('wallet') || key.includes('session') || key.includes('connect')) {
          // Skip the connector storage we're about to set
          if (key !== 'lastUsedConnector' && key !== LAST_CONNECTED_TIME_LOCALSTORAGE_KEY) {
            localStorage.removeItem(key);
          }
        }
      });
    }
    
    console.log("🔥 Connecting burner wallet with clean state...");
    const connector = connectors.find((it) => it.id == "burner-wallet");
    if (connector && connector instanceof BurnerConnector) {
      connector.burnerAccount = burnerAccounts[ix];
      connect({ connector });
      setLastConnector({ id: connector.id, ix });
      setLastConnectionTime(Date.now());
      handleCloseModal();
    }
  }

  function handleDemoPlayer() {
    // Clear ALL localStorage to ensure clean state
    if (typeof window !== "undefined") {
      // Clear all wallet-related storage keys
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("sessionId");
      // Clear any other keys that might affect wallet state
      Object.keys(localStorage).forEach(key => {
        if (key.includes('wallet') || key.includes('session') || key.includes('connect')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // Create fresh demo address
    const addr = randomAddress();
    localStorage.setItem("walletAddress", addr);
    
    console.log("🎭 Demo player created with clean state:", addr.slice(0, 10) + "...");
    handleCloseModal();
    window.location.reload();
  }

  return (
    <div>
      <label
        htmlFor="connect-modal"
        className="py-1.5 px-3 text-sm rounded-full font-serif-renaissance cursor-pointer hover:bg-gradient-nav hover:text-white"
      >
        <span>Connect</span>
      </label>

      <input
        ref={modalRef}
        type="checkbox"
        id="connect-modal"
        className="modal-toggle"
      />
      <GenericModal modalId="connect-modal">
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">
              {isBurnerWallet ? "Choose account" : "Connect a Wallet"}
            </h3>
            <label
              onClick={() => setIsBurnerWallet(false)}
              htmlFor="connect-modal"
              className="btn btn-ghost btn-sm btn-circle cursor-pointer"
            >
              ✕
            </label>
          </div>
          {!isBurnerWallet && (
            <p className="mt-2 text-sm">
              Please login with one of the wallets.
            </p>
          )}
          <div className="flex flex-col flex-1 lg:grid">
            <div className="flex flex-col gap-4 w-full px-8 py-10">
              {!isBurnerWallet ? (
                <>
                  <button
                    className={`flex gap-4 items-center text-black rounded-[4px] p-3 transition-all border ${
                      isDarkMode
                        ? "hover:bg-[#385183] border-[#4f4ab7]"
                        : "hover:bg-slate-200 border-[#5c4fe5]"
                    }`}
                    onClick={handleDemoPlayer}
                  >
                    <div className="h-[1.5rem] w-[1.5rem] rounded-full bg-orange-500" />
                    <span className="text-start m-0">Demo Player</span>
                  </button>
                  {connectors.map((connector, index) => (
                    <Wallet
                      key={connector.id || index}
                      connector={connector}
                      loader={loader}
                      handleConnectWallet={handleConnectWallet}
                    />
                  ))}
                </>
              ) : (
                <div className="flex flex-col pb-[20px] justify-end gap-3">
                  <div className="h-[300px] overflow-y-auto flex w-full flex-col gap-2">
                    {burnerAccounts.map((burnerAcc, ix) => (
                      <div
                        key={burnerAcc.publicKey}
                        className="w-full flex flex-col"
                      >
                        <button
                          className={`hover:bg-gradient-modal border rounded-md text-black py-[8px] pl-[10px] pr-16 flex items-center gap-4 ${
                            isDarkMode ? "border-[#385183]" : ""
                          }`}
                          onClick={(e) => handleConnectBurner(e, ix)}
                        >
                          <BlockieAvatar
                            address={burnerAcc.accountAddress}
                            size={35}
                          />
                          {`${burnerAcc.accountAddress.slice(
                            0,
                            6,
                          )}...${burnerAcc.accountAddress.slice(-4)}`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      </GenericModal>
    </div>
  );
};

export default ConnectModal;
