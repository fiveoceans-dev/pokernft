"use client";

import React, { useState } from "react";
import { useAccount } from "@starknet-react/core";
import Button from "~~/components/ui/Button";
import { WHITELISTED_ADDRESSES } from "~~/constants";

const MintPage: React.FC = () => {
  const { address } = useAccount();
  const [form, setForm] = useState({
    title: "",
    image: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Mint data", form);
  };

  if (!address || !WHITELISTED_ADDRESSES.includes(address.toLowerCase())) {
    return (
      <main className="p-6 text-center">
        <p>Your wallet is not whitelisted for minting.</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold text-center">Mint NFT</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Title"
          className="w-full p-2 rounded-md bg-transparent border border-border text-background"
        />
        <input
          name="image"
          value={form.image}
          onChange={handleChange}
          placeholder="Image URL"
          className="w-full p-2 rounded-md bg-transparent border border-border text-background"
        />
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Description"
          className="w-full p-2 rounded-md bg-transparent border border-border text-background"
        />
        <Button type="submit" className="w-full">
          Mint NFT
        </Button>
      </form>
    </main>
  );
};

export default MintPage;
