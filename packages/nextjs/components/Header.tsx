"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { useOutsideClick } from "~~/hooks/scaffold-stark";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";
import { ConnectionStatus } from "~~/components/ConnectionStatus";
import { useTargetNetwork } from "~~/hooks/scaffold-stark/useTargetNetwork";
import { devnet } from "@starknet-react/chains";
import { useAccount, useNetwork, useProvider } from "@starknet-react/core";
import { BlockIdentifier } from "starknet";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  { label: "Home", href: "/#home" },
  { label: "How it Works", href: "/#how" },
  { label: "Tournaments", href: "/#trending-tournaments" },
  { label: "Live Games", href: "/#games" },
  { label: "Whitelist", href: "/whitelist" },
  { label: "Mint", href: "/nft/mint" },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const [isDark] = useState(true);
  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive
                  ? "!bg-gradient-nav !text-white active:bg-gradient-nav shadow-md"
                  : ""
              } py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col font-serif-renaissance hover:bg-gradient-nav hover:text-white`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const burgerMenuRef = useRef<HTMLDivElement>(null);

  useOutsideClick(
    burgerMenuRef,
    useCallback(() => setIsDrawerOpen(false), []),
  );

  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.network === devnet.network;

  const { provider } = useProvider();
  const { address, status, chainId } = useAccount();
  const { chain } = useNetwork();
  const [isDeployed, setIsDeployed] = useState(true);

  useEffect(() => {
    if (
      status === "connected" &&
      address &&
      chainId === targetNetwork.id &&
      chain.network === targetNetwork.network
    ) {
      provider
        .getClassHashAt(address)
        .then((classHash) => {
          if (classHash) setIsDeployed(true);
          else setIsDeployed(false);
        })
        .catch((e) => {
          console.error("contract check", e);
          if (e.toString().includes("Contract not found")) {
            setIsDeployed(false);
          }
        });
    }
  }, [
    status,
    address,
    provider,
    chainId,
    targetNetwork.id,
    targetNetwork.network,
    chain.network,
  ]);

  return (
    <div className="lg:static top-0 navbar min-h-0 flex-shrink-0 justify-between items-center z-20 px-0 sm:px-2 flex-nowrap gap-2">
      <div className="navbar-start flex items-center gap-2">
        <div className="lg:hidden dropdown" ref={burgerMenuRef}>
          <label
            tabIndex={0}
            className={`btn btn-ghost btn-sm
              ${isDrawerOpen ? "hover:bg-secondary" : "hover:bg-transparent"}`}
            onClick={() => {
              setIsDrawerOpen((prevIsOpenState) => !prevIsOpenState);
            }}
          >
            <Bars3Icon className="h-5 w-5" />
          </label>
          {isDrawerOpen && (
            <ul
              tabIndex={0}
              className="menu menu-compact dropdown-content mt-3 p-2 shadow rounded-box w-52 bg-base-100 z-50"
              onClick={() => {
                setIsDrawerOpen(false);
              }}
            >
              <HeaderMenuLinks />
            </ul>
          )}
        </div>
        <Link
          href="/"
          passHref
          className="flex items-center gap-2 shrink-0 text-accent font-serif-renaissance text-lg lg:text-xl whitespace-nowrap"
        >
          PokerNFTs.com
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end flex items-center justify-end gap-2 lg:gap-3 ml-auto">
        <ConnectionStatus />
        <CustomConnectButton />
      </div>
    </div>
  );
};
