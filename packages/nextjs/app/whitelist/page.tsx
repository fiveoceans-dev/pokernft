"use client";

import React, { useState } from "react";
import Button from "~~/components/ui/Button";

const WhitelistPage: React.FC = () => {
  const [form, setForm] = useState({
    nickname: "",
    email: "",
    wallet: "",
    purpose: "",
    referral: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold text-center">
        Whitelist Application
      </h1>
      {submitted ? (
        <p className="text-center">Thanks for applying! We&apos;ll be in touch.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="nickname"
            value={form.nickname}
            onChange={handleChange}
            placeholder="Nickname"
            required
            className="w-full p-2 rounded-md bg-transparent border border-border text-background"
          />
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email (optional)"
            className="w-full p-2 rounded-md bg-transparent border border-border text-background"
          />
          <input
            name="wallet"
            value={form.wallet}
            onChange={handleChange}
            placeholder="Starknet Wallet"
            required
            className="w-full p-2 rounded-md bg-transparent border border-border text-background"
          />
          <textarea
            name="purpose"
            value={form.purpose}
            onChange={handleChange}
            placeholder="Purpose of Application"
            rows={4}
            required
            className="w-full p-2 rounded-md bg-transparent border border-border text-background"
          />
          <input
            name="referral"
            value={form.referral}
            onChange={handleChange}
            placeholder="Referral Code"
            className="w-full p-2 rounded-md bg-transparent border border-border text-background"
          />
          <Button type="submit" className="w-full text-black">
            Apply
          </Button>
        </form>
      )}
    </main>
  );
};

export default WhitelistPage;
