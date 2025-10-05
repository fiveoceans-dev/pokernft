const timeline = [
  "Launch a fully on-chain poker with verifiable RNG, hand evaluation, and low-fee tournaments.",
  "Integrate exchange, wallet, and RNG providers to streamline the player experience.",
  "Expand through global marketing campaigns and partnership-driven tournaments.",
  "Establish a decentralized treasury governed by players and partners.",
];

const collaborationAreas = [
  {
    title: "Blockchain Partner",
    description: "Provide infrastructure, node support, or liquidity incentives.",
  },
  {
    title: "RNG Partner",
    description: "Supply verifiable randomness through secure, on-chain oracles.",
  },
  {
    title: "Exchange Partner",
    description: "Enable fiat/crypto buy-ins, payouts, and liquidity routing.",
  },
  {
    title: "Wallet Partner",
    description: "Deliver seamless user onboarding and custody solutions.",
  },
  {
    title: "Audit & Security Partner",
    description: "Conduct audits, penetration testing, and certification.",
  },
  {
    title: "Gaming / Media Partner",
    description: "Expand reach through co-marketing and community events.",
  },
  {
    title: "Legal / Compliance Partner",
    description: "Assist with licensing, KYC/AML, and jurisdictional setup.",
  },
];

const supportTiers = [
  {
    name: "Angel Partner",
    description:
      "For early supporters and individual backers who share our long-term vision. Includes recognition as an Early Angel Partner, lifetime beta-season tournament access, name or brand listing on the Founders Wall, early feature previews, and invitations to private investor briefings.",
  },
  {
    name: "Gold Partner",
    description:
      "Entry into the Blockchain Poker Partner Network as an Official Ecosystem Partner. Includes priority technical integration, early access to APIs and tournament modules, and brand visibility across the platform, press releases, and digital campaigns.",
  },
  {
    name: "Platinum Partner",
    description:
      "For organizations seeking deeper collaboration and technical alignment. Includes all Gold benefits plus co-branded online and offline tournaments, joint content initiatives, VIP allocations for global live events, and exclusive access to platform technical insights, product roadmaps, and development previews.",
  },
  {
    name: "Diamond Partner",
    description:
      "Reserved for flagship strategic partners and key investors. Includes all Platinum benefits plus exclusive global co-branding across official tournaments, advisory board participation, shared revenue from select events, access to global conferences on blockchain, AI, and tech gaming, and premium hospitality at championship venues.",
  },
];

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-gray-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16">
        <header className="text-center">
          <p className="text-sm uppercase tracking-widest text-emerald-400">Partnerships</p>
          <h1 className="mt-2 text-4xl font-bold text-white sm:text-5xl">
            Blockchain Poker Partnership Overview
          </h1>
        </header>

        <section className="space-y-6 rounded-3xl bg-white/5 p-8 shadow-xl ring-1 ring-white/10 backdrop-blur">
          <h2 className="text-2xl font-semibold text-white">Project Overview</h2>
          <div className="space-y-4 text-base leading-relaxed text-gray-200">
            <p>PokerNFTs is a decentralized poker platform redefining trust in online gaming.</p>
            <p>
              PokerNFTs is a decentralized poker ecosystem redefining trust, fairness, and entertainment
              in online gaming. Our system leverages blockchain to guarantee provable randomness,
              transparent gameplay, and instant crypto settlements, ensuring that every hand, shuffle,
              and payout is verifiably fair and recorded on-chain.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-gray-100">
            <p className="text-lg font-medium">
              Our mission is to bring real players, real money, and real fairness to the global poker
              community through a scalable, onchain poker infrastructure.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white">Timeline</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {timeline.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-relaxed text-gray-200"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white">Areas of Collaboration</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {collaborationAreas.map((area) => (
              <article
                key={area.title}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-gray-200"
              >
                <h3 className="text-lg font-semibold text-white">{area.title}</h3>
                <p className="text-sm leading-relaxed">{area.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white">Support Tiers</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {supportTiers.map((tier) => (
              <article
                key={tier.name}
                className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-gray-100"
              >
                <h3 className="text-xl font-semibold text-emerald-300">{tier.name}</h3>
                <p className="text-sm leading-relaxed text-gray-200">{tier.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Contacts</h2>
          <p className="text-sm text-gray-300">WebTreeLogic llc</p>
          <p className="text-sm text-gray-300">Seoul, South Korea</p>
        </section>
      </div>
    </main>
  );
}
