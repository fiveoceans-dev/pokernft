import React, { useState } from "react";
import Button from "./Button";

export const MintModal: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Mint NFT</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-primary p-6 rounded-md w-96 space-y-4">
            <h3 className="text-background font-semibold">Mint NFT</h3>
            <input
              type="text"
              placeholder="Title"
              className="w-full px-3 py-2 rounded-md bg-transparent border border-border text-background"
            />
            <input type="file" className="w-full text-background" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button>Mint</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MintModal;
