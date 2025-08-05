import React from "react";

type GridProps = {
  children: React.ReactNode;
};

export const NFTGrid: React.FC<GridProps> = ({ children }) => (
  <div className="grid grid-cols-12 gap-4 md:gap-6">{children}</div>
);

export default NFTGrid;
