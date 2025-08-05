import Image from "next/image";
import React from "react";

type AvatarProps = {
  src: string;
  alt: string;
  size?: number;
  variant?: "circle" | "square";
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 40,
  variant = "circle",
}) => (
  <div
    className={`overflow-hidden ${
      variant === "circle" ? "rounded-full" : "rounded-md"
    }`}
    style={{ width: size, height: size }}
  >
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-cover"
    />
  </div>
);

export default Avatar;
