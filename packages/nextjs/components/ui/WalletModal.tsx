import React, { useState } from "react";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";
import Button from "./Button";

export const WalletModal: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Wallet</Button>
      {open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div className="bg-primary p-6 rounded-md w-80 space-y-4">
            <CustomConnectButton />
            <Button
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletModal;
