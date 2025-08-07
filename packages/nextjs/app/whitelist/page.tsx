"use client";

import React, { useState } from "react";
import Button from "~~/components/ui/Button";

const WhitelistPage: React.FC = () => {
  const [form, setForm] = useState({ address: "", email: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <p className="text-center">Thanks for applying! We'll be in touch.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Wallet Address"
            required
            className="w-full p-2 rounded-md bg-transparent border border-border text-background"
          />
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full p-2 rounded-md bg-transparent border border-border text-background"
          />
          <Button type="submit" className="w-full">
            Apply
          </Button>
        </form>
      )}
    </main>
  );
};

export default WhitelistPage;
