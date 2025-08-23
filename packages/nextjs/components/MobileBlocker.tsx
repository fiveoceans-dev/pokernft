"use client";

import useIsMobile from "~~/hooks/useIsMobile";
import { useScrollLock } from "~~/hooks/useScrollLock";

const MobileBlocker = () => {
  const isMobile = useIsMobile();
  useScrollLock(isMobile);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="mx-4 rounded-md bg-white p-6 text-center text-black">
        <p className="mb-2 text-lg font-semibold">
          Mobile support is coming soon.
        </p>
        <p>Please use a desktop browser to play.</p>
      </div>
    </div>
  );
};

export default MobileBlocker;

