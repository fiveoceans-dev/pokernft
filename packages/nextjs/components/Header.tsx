"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";

import { SwitchTheme } from "./SwitchTheme";

type HeaderMenuLink = {
  label: string;
  href: string;
};

const menuLinks: HeaderMenuLink[] = [
  { label: "Home", href: "/#home" },
  { label: "How it Works", href: "/#how" },
  { label: "Trending", href: "/#tournaments" },
  { label: "Marketplace", href: "/#marketplace" },
];

const NavLinks = ({ close }: { close?: () => void }) => {
  return (
    <>
      {menuLinks.map(({ label, href }) => (
        <li key={href} onClick={close}>
          <Link
            href={href}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white hover:bg-yellow-400 hover:text-[#0c1a3a]"
          >
            {label}
          </Link>
        </li>
      ))}
    </>
  );
};

/**
 * Site header with navigation and connect wallet button
 */
export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="navbar bg-base-100/60 backdrop-blur z-20">
      <div className="flex-1">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/pokerboots.svg" alt="SE2 logo" width={40} height={40} />
        </Link>
      </div>

      <nav className="hidden lg:flex">
        <ul className="menu menu-horizontal px-1 gap-2">
          <NavLinks />
        </ul>
      </nav>

      <div className="lg:hidden">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        {isMenuOpen && (
          <ul className="menu menu-compact absolute right-2 mt-3 p-2 shadow bg-base-100 rounded-box">
            <NavLinks close={() => setIsMenuOpen(false)} />
          </ul>
        )}
      </div>

      <div className="flex-none ml-4 flex gap-4 items-center">
        <CustomConnectButton />
        <SwitchTheme />
      </div>
    </header>
  );
};

export default Header;
