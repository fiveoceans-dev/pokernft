import React from "react";

type GridProps = {
  children: React.ReactNode;
};

export const NFTGrid: React.FC<GridProps> = ({ children }) => (
  <div className="flex flex-wrap justify-center gap-4 md:gap-6">{children}</div>
);

export default NFTGrid;
