import Image from "next/image";
import React from "react";
import Avatar from "./Avatar";
import Badge from "./Badge";
import Button from "./Button";

type NFTCardProps = {
  title: string;
  image: string;
  creator: string;
  price: string;
  chainIcon: string;
  badge?: { label: string; variant?: "verified" | "new" | "sale" };
  actionLabel?: string;
};

export const NFTCard: React.FC<NFTCardProps> = ({
  title,
  image,
  creator,
  price,
  chainIcon,
  badge,
  actionLabel = "Buy now",
}) => (
  <div className="group relative w-48 sm:w-56 flex-shrink-0">
    <div className="relative w-48 h-48 sm:w-56 sm:h-56 overflow-hidden rounded-lg bg-base-300">
      <Image
        src={image}
        alt={title}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Button>{actionLabel}</Button>
      </div>
      {badge && (
        <div className="absolute top-2 left-2">
          <Badge label={badge.label} variant={badge.variant} />
        </div>
      )}
      <Image
        src={chainIcon}
        alt="chain"
        width={20}
        height={20}
        className="absolute top-2 right-2"
      />
    </div>
    <div className="mt-3 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-background truncate">
          {title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Avatar src={creator} alt={title} size={24} />
          <span className="text-xs text-background">{price}</span>
        </div>
      </div>
    </div>
  </div>
);

export default NFTCard;
