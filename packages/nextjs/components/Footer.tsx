/**
 * Minimal footer pinned at the bottom by layout flex.
 * - Centered text, inherits body font and size
 * - Subtle top border to keep the footer visually light
 */
import Link from "next/link";
import { FaTwitter, FaDiscord, FaInstagram } from "react-icons/fa";

export const Footer = () => {
  return (
    <footer className="shrink-0 w-full border-t border-white/10 dark:border-white/10 py-1">
      <div className="max-w-7xl mx-auto px-3 grid grid-cols-3 items-center text-current">
        {/* left spacer to keep center text truly centered */}
        <div />
        {/* centered brand text inherits body font/size */}
        <div className="text-center text-sm whitespace-nowrap">PokerNFTs © 2025</div>
        {/* right-aligned links + socials (single line) */}
        <div className="flex items-center justify-end gap-3 whitespace-nowrap text-sm">
          <a href="https://twitter.com/pokernfts" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:text-accent transition-colors"><FaTwitter size={16} /></a>
          <a href="" target="_blank" rel="noopener noreferrer" aria-label="Discord" className="hover:text-accent transition-colors"><FaDiscord size={16} /></a>
          <a href="" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-accent transition-colors"><FaInstagram size={16} /></a>
        </div>
      </div>
    </footer>
  );
};
