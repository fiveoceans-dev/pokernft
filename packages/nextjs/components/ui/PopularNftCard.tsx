import Image from "next/image";
import type { FC } from "react";
import Button from "./Button";
import { buyNft } from "~~/services/nft";

export interface PopularNftCardProps {
  id: number;
  image: string;
  title: string;
  buyIn: string;
  status: string;
  gameType: string;
  dateTime: string;
  tournamentType: string;
  registered: number;
  maxRegistered: number;
  prize: string;
}

export const PopularNftCard: FC<PopularNftCardProps> = ({
  id,
  image,
  title,
  buyIn,
  status,
  gameType,
  dateTime,
  tournamentType,
  registered,
  maxRegistered,
  prize,
}) => (
  <div className="w-40 sm:w-48 md:w-64 min-w-[10rem] bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
    <div className="relative w-full aspect-square overflow-hidden">
      <Image src={image} alt={title} fill className="object-cover" />
    </div>
    <div className="px-2 pb-2 space-y-1" />
    <div className="px-2 flex justify-between text-xs text-gray-600 font-medium">
      <div className="flex flex-col">
        <h2 className="text-sm font-semibold text-gray-900 leading-tight">
          {title}
        </h2>
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold text-gray-900 leading-tight">{`Buy-In ${buyIn}`}</span>
      </div>
    </div>
    <div className="px-2 flex justify-between text-xs text-gray-600 font-medium">
      <div className="flex flex-col">
        <span className="text-green-600 flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
          {status}
        </span>
        <div className="flex items-center text-xs text-gray-500 font-medium">
          {gameType}
        </div>
      </div>
      <div className="text-right">
        <span className="ml-1 text-accent">{dateTime}</span>
        <br />
        <span className="text-xs text-gray-500 font-medium">
          {tournamentType}
        </span>
      </div>
    </div>
    <hr className="my-2 border-gray-100" />
    <div className="px-2 flex justify-between text-xs text-gray-600 font-medium">
      <div className="flex flex-col">
        <span className="text-green-600 flex items-center gap-1">
          {`${registered.toLocaleString()} / ${maxRegistered.toLocaleString()}`}
        </span>
        <span className="text-gray-400">Sold</span>
      </div>
      <div className="text-right">
        <span className="text-gray-900 flex font-bold">{prize}</span>
        <span className="text-gray-400">PRIZE</span>
      </div>
    </div>
    <div className="px-2 flex justify-between items-center text-xs text-gray-600 font-medium pb-4">
      <Button onClick={() => buyNft(id)}>Buy</Button>
      <span className="text-gray-400">Rules</span>
    </div>
  </div>
);

export default PopularNftCard;
