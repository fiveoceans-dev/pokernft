"use client";

import Image from "next/image";

export interface PopularNftCardProps {
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

export default function PopularNftCard({
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
}: PopularNftCardProps) {
  return (
    <div className="max-w-xs w-full bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square overflow-hidden">
        <Image
          src={image}
          alt={title}
          width={320}
          height={320}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="px-4 pt-4 pb-2 space-y-1" />
      <div className="px-4 flex justify-between text-xs text-gray-600 font-medium">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-gray-900 leading-tight">
            {title}
          </h2>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-gray-900 leading-tight">{`Buy-In ${buyIn}`}</span>
        </div>
      </div>
      <div className="px-4 flex justify-between text-xs text-gray-600 font-medium">
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
          <span className="ml-1 text-yellow-400">{dateTime}</span>
          <br />
          <span className="text-xs text-gray-500 font-medium">
            {tournamentType}
          </span>
        </div>
      </div>
      <hr className="my-2 border-gray-100" />
      <div className="px-4 pb-4 flex justify-between text-xs text-gray-600 font-medium">
        <div className="flex flex-col">
          <span className="text-green-600 flex items-center gap-1">
            {`${registered.toLocaleString()} / ${maxRegistered.toLocaleString()}`}
          </span>
          <span className="text-gray-400">Registered</span>
        </div>
        <div className="text-right">
          <span className="text-gray-900 flex font-bold">{prize}</span>
          <span className="text-gray-400">PRIZE</span>
        </div>
      </div>
      <div className="px-4 flex justify-between text-xs text-gray-600 font-medium pb-4">
        <div className="flex flex-col" />
        <div className="text-right">
          <span className="text-gray-400 mr-2">Rules</span>
          <span className="text-gray-400">More</span>
        </div>
      </div>
    </div>
  );
}
