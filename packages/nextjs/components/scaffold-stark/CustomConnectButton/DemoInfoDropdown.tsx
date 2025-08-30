import { useRef, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import {
  ArrowLeftEndOnRectangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { BlockieAvatar } from "~~/components/scaffold-stark";
import { useOutsideClick } from "~~/hooks/scaffold-stark";
import { useGameStore } from "~~/hooks/useGameStore";

export const DemoInfoDropdown = ({ address }: { address: string }) => {
  const [addressCopied, setAddressCopied] = useState(false);
  const dropdownRef = useRef<HTMLDetailsElement>(null);
  const closeDropdown = () => dropdownRef.current?.removeAttribute("open");
  const { handleDisconnect } = useGameStore();

  useOutsideClick(dropdownRef, closeDropdown);

  const handleLogout = async () => {
    // Use the game store disconnect handler for proper cleanup
    await handleDisconnect();
    window.location.reload();
  };

  return (
    <details ref={dropdownRef} className="dropdown dropdown-end leading-3">
      <summary className="btn bg-transparent btn-sm px-2 py-1 gap-0 !h-auto border border-[#5c4fe5] dropdown-toggle">
        <BlockieAvatar address={address} size={12} />
        <span className="ml-2 mr-2 text-sm">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <ChevronDownIcon className="h-4 w-4 ml-2 sm:ml-0 sm:block hidden" />
      </summary>
      <ul
        tabIndex={0}
        className="dropdown-content menu z-[2] p-2 mt-2 rounded-[5px] gap-1 border border-[#5c4fe5] bg-base-100"
      >
        <li>
          {addressCopied ? (
            <div className="btn-sm !rounded-xl flex gap-3 py-3">
              <CheckCircleIcon
                className="text-xl font-normal h-6 w-4 cursor-pointer ml-2 sm:ml-0"
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">Copy address</span>
            </div>
          ) : (
            <CopyToClipboard
              text={address}
              onCopy={() => {
                setAddressCopied(true);
                setTimeout(() => setAddressCopied(false), 800);
              }}
            >
              <div className="btn-sm !rounded-xl flex gap-3 py-3">
                <DocumentDuplicateIcon
                  className="text-xl font-normal h-6 w-4 cursor-pointer ml-2 sm:ml-0"
                  aria-hidden="true"
                />
                <span className="whitespace-nowrap">Copy address</span>
              </div>
            </CopyToClipboard>
          )}
        </li>
        <li>
          <button
            className="btn-sm !rounded-xl flex gap-3 py-3"
            type="button"
            onClick={handleLogout}
          >
            <ArrowLeftEndOnRectangleIcon className="h-6 w-4 ml-2 sm:ml-0" />
            <span className="whitespace-nowrap">Log out</span>
          </button>
        </li>
      </ul>
    </details>
  );
};
