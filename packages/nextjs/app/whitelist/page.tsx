"use client";

import React, { useState } from "react";
import Button from "~~/components/ui/Button";

const InfoCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="p-4 bg-primary/10 rounded-md border border-border text-background text-white space-y-2">
    <h2 className="font-semibold">{title}</h2>
    <div className="text-sm leading-relaxed">{children}</div>
  </div>
);

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

  const leftCards = [
    {
      title: "Whitelisted Creators",
      content:
        "Only approved accounts can launch tournaments and earn 10% from every NFT sale.",
    },
    {
      title: "Permissionless Protocol",
      content:
        "Anyone can join. Mint an NFT collection that acts as a tournament ticket for your community.",
    },
    {
      title: "On-Chain Fairness",
      content:
        "The poker evaluator, random number generator, and bank live on-chain so nobody can cheat.",
    },
    {
      title: "NFT Tickets",
      content:
        "Mint NFTs with an image, tournament name, date, and buy-in. Sell them freely once created.",
    },
  ];

  const rightCards = [
    {
      title: "Revenue Split",
      content: "Each NFT sale: 80% prize pool, 10% protocol, 10% creator.",
    },
    {
      title: "Refund Policy",
      content:
        "Skip the event? Claim a 90% refund within 25 days—10% protocol fee is non‑refundable.",
    },
    {
      title: "Prize Distribution (BUYIN $100)",
      content: (
        <div className="space-y-3">
          <div className="text-xs text-gray-300 mb-2">
            Total Prize Pool: $800,000 (10,000 × $100 × 80%)
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left">Place</th>
                <th className="text-right">% Pool</th>
                <th className="text-right">Prize</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1st</td>
                <td className="text-right">31%</td>
                <td className="text-right">$248,000</td>
              </tr>
              <tr>
                <td>2nd</td>
                <td className="text-right">19%</td>
                <td className="text-right">$152,000</td>
              </tr>
              <tr>
                <td>3rd</td>
                <td className="text-right">14%</td>
                <td className="text-right">$112,000</td>
              </tr>
              <tr>
                <td>4–9th</td>
                <td className="text-right">3% each</td>
                <td className="text-right">$24,000</td>
              </tr>
              <tr>
                <td>10–27th</td>
                <td className="text-right">1% each</td>
                <td className="text-right">$8,000</td>
              </tr>
              <tr>
                <td>28–100th</td>
                <td className="text-right">0.2% each</td>
                <td className="text-right">$1,600</td>
              </tr>
              <tr>
                <td>101–500th</td>
                <td className="text-right">0.05% each</td>
                <td className="text-right">$400</td>
              </tr>
              <tr>
                <td>501–10,000th</td>
                <td className="text-right">0.01% each</td>
                <td className="text-right">$80</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      title: "Prize Redemption",
      content:
        "Winners redeem prizes on-chain during the official redemption period after the tournament ends.",
    },
  ];

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-center mb-6">
        Whitelist Application
      </h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 max-w-xs mx-auto">
          {leftCards.map(({ title, content }) => (
            <InfoCard key={title} title={title}>
              {content}
            </InfoCard>
          ))}
        </div>
        <div className="space-y-4 max-w-md mx-auto">
          {submitted ? (
            <p className="text-center">
              Thanks for applying! We&apos;ll be in touch.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                name="nickname"
                value={form.nickname}
                onChange={handleChange}
                placeholder="Nickname"
                required
                className="w-full p-2 rounded-md bg-transparent border border-accent text-background"
              />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email (optional)"
                className="w-full p-2 rounded-md bg-transparent border border-accent text-background"
              />
              <input
                name="wallet"
                value={form.wallet}
                onChange={handleChange}
                placeholder="Starknet Wallet"
                required
                className="w-full p-2 rounded-md bg-transparent border border-accent text-background"
              />
              <textarea
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
                placeholder="Purpose of Application"
                rows={6}
                required
                className="w-full p-2 rounded-md bg-transparent border border-accent text-background"
              />
              <input
                name="referral"
                value={form.referral}
                onChange={handleChange}
                placeholder="Referral Code"
                className="w-full p-2 rounded-md bg-transparent border border-accent text-background"
              />
              <Button type="submit" className="w-full text-black">
                Apply
              </Button>
            </form>
          )}
        </div>
        <div className="space-y-4 max-w-xs mx-auto">
          {rightCards.map(({ title, content }) => (
            <InfoCard key={title} title={title}>
              {content}
            </InfoCard>
          ))}
        </div>
      </div>
    </main>
  );
};

export default WhitelistPage;
