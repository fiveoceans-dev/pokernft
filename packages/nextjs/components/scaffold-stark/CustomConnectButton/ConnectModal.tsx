import { useRef } from "react";
import { useTheme } from "next-themes";
import GenericModal from "./GenericModal";
import { randomAddress } from "../../../utils/address";

const ConnectModal = () => {
  const modalRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const handleCloseModal = () => {
    if (modalRef.current) {
      modalRef.current.checked = false;
    }
  };

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
            <h3 className="text-xl font-bold">Demo Player Only</h3>
            <label
              htmlFor="connect-modal"
              className="btn btn-ghost btn-sm btn-circle cursor-pointer"
            >
              ✕
            </label>
          </div>
          <p className="mt-2 text-sm">
            Only the demo player is currently available.
          </p>
          <div className="flex flex-col flex-1 lg:grid">
            <div className="flex flex-col gap-4 w-full px-8 py-10">
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
            </div>
          </div>
        </>
      </GenericModal>
    </div>
  );
};

export default ConnectModal;
