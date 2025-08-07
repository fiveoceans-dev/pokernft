import { FaTwitter, FaInstagram, FaDiscord } from "react-icons/fa";

/**
 * StayTunedSection – social‑follow banner with neon glow + diagonal separator.
 * TailwindCSS utilities and react‑icons assumed.
 */
export default function StayTunedSection() {
  return (
    <section
      id="community"
      className="relative py-24 overflow-hidden"
    >      

      {/* subtle radial glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-800/10 via-indigo-600/10 to-purple-700/10 rounded-[40%] blur-[180px] -z-10" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-wide text-yellow-300">
          Highlights & Community
        </h2>
        <p className="max-w-xl mx-auto mt-4 text-slate-300">
          Highlight reels, testimonials and more. Join our community to keep the
          action going.
        </p>

        {/* social icons */}
        <div className="mt-10 flex justify-center gap-8 text-4xl">
          <SocialIcon
            href="https://twitter.com/pokernfts"
            label="Twitter"
            className="hover:text-sky-400"
          >
            <FaTwitter />
          </SocialIcon>
          <SocialIcon
            href="#"
            label="Instagram"
            className="hover:text-pink-400"
          >
            <FaInstagram />
          </SocialIcon>
          <SocialIcon
            href="https://discord.gg/jW43eTwe6J"
            label="Discord"
            className="hover:text-indigo-400"
          >
            <FaDiscord />
          </SocialIcon>
        </div>
      </div>
    </section>
  );
}

/* ------------------ helper ------------------ */
interface IconProps {
  href: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}
const SocialIcon = ({ href, label, children, className = "" }: IconProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className={`transition-colors duration-200 ${className}`}
  >
    {children}
  </a>
);
