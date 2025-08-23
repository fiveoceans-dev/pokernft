"use client";

// @refresh reset
import { Balance } from "../Balance";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { AddressQRCodeModal } from "./AddressQRCodeModal";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { DemoInfoDropdown } from "./DemoInfoDropdown";
import { useAutoConnect, useNetworkColor } from "~~/hooks/scaffold-stark";
import { useTargetNetwork } from "~~/hooks/scaffold-stark/useTargetNetwork";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-stark";
import { useAccount, useConnect, useNetwork } from "@starknet-react/core";
import { Address } from "@starknet-react/chains";
import { useEffect, useMemo, useState } from "react";
import ConnectModal from "./ConnectModal";

/**
 * Custom Connect Button (watch balance + custom design)
 */
export const CustomConnectButton = () => {
  useAutoConnect();
  const networkColor = useNetworkColor();
  const { connector } = useConnect();
  const { targetNetwork } = useTargetNetwork();
  const { account, status, address: accountAddress } = useAccount();
  const [accountChainId, setAccountChainId] = useState<bigint>(0n);
  const { chain } = useNetwork();
  const [demoAddress, setDemoAddress] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("sessionId") : null,
  );

  const blockExplorerAddressLink = useMemo(() => {
    return (
      accountAddress &&
      getBlockExplorerAddressLink(targetNetwork, accountAddress)
    );
  }, [accountAddress, targetNetwork]);

  useEffect(() => {
    if (accountAddress) {
      localStorage.setItem("sessionId", accountAddress);
    }
  }, [accountAddress]);

  useEffect(() => {
    if (status === "disconnected") {
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem("sessionId")
          : null;
      setDemoAddress(stored);
    } else {
      setDemoAddress(null);
    }
  }, [status]);

  // effect to get chain id and address from account
  useEffect(() => {
    if (account) {
      const getChainId = async () => {
        const chainId = await account.channel.getChainId();
        setAccountChainId(BigInt(chainId as string));
      };

      getChainId();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, status]);

  useEffect(() => {
    const handleChainChange = (event: { chainId?: bigint }) => {
      const { chainId } = event;
      if (chainId && chainId !== accountChainId) {
        setAccountChainId(chainId);
      }
    };
    connector?.on("change", handleChainChange);
    return () => {
      connector?.off("change", handleChainChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector]);

  if (status === "disconnected") {
    if (demoAddress) {
      return <DemoInfoDropdown address={demoAddress} />;
    }
    return <ConnectModal />;
  }

  if (accountChainId === 0n) return <ConnectModal />;

  if (accountChainId !== targetNetwork.id) {
    return <WrongNetworkDropdown />;
  }

  return (
    <>
      <div className="flex flex-col items-center max-sm:mt-2">
        <Balance
          address={accountAddress as Address}
          className="min-h-0 h-auto"
        />
        <span className="text-xs ml-1" style={{ color: networkColor }}>
          {chain.name}
        </span>
      </div>
      <AddressInfoDropdown
        address={accountAddress as Address}
        displayName={""}
        ensAvatar={""}
        blockExplorerAddressLink={blockExplorerAddressLink}
      />
      <AddressQRCodeModal
        address={accountAddress as Address}
        modalId="qrcode-modal"
      />
    </>
  );
};
