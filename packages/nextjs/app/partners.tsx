"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export default function PartnersPage() {


  useEffect(() => {

    
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Lobby</h1>
          
        </div>
        
      </div>
    </main>
  );
}
