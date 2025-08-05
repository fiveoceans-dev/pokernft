// NFTSaleSection.tsx

import { useState, type ChangeEvent } from "react";
import nftPlaceholder from "../assets/nft-placeholder.png";

/**
 * NftSaleSection — live SVG NFT configurator (2× card) with rich style controls.
 */
export default function NftSaleSection() {
  const [form, setForm] = useState({
    name: "Saturday Night with Friends",
    creator: "CryptoPunk",
    description:
      "Weekly high-stakes action for Starknet grinders. Join live on-chain poker action or live youtube stream.",
    game: "Texas Hold’em",
    price: "10",
    type: "2 Entries",
    date: "June 1 (5PM PST)",
    supply: "1000",
    refund: "90%",
    borderColor: "#F4C33B", // gold
    imgBorderColor: "#2F8FFD", // sapphire blue
    bgColor: "#081A34", // deep navy
    featuresColor: "#3E5AFF", // indigo pattern
    textColor: "#E6E8F0", // light slate
    bgStyle: "dots",
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  /* ---------------------- JSX ---------------------- */
  return (
    <section
      id="mint"
      className="relative py-24 px-6 md:px-12 bg-[#0a1a38] text-white"
    >
      <h2 className="text-3xl md:text-4xl font-extrabold text-yellow-300 text-center mb-12">
        Spin Up Tournament with NFTs
      </h2>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12">
        {/* NFT preview */}
        <div className="flex-1 flex justify-center">
          <SvgPreview {...form} />
        </div>
        {/* Configurator */}
        <div className="flex-1">
          <div className="bg-white/5 backdrop-blur-md p-8 rounded-xl border border-yellow-400/30 shadow-lg space-y-5">
            <Field
              label="Title"
              name="name"
              value={form.name}
              onChange={handleChange}
            />
            <Field
              label="Creator"
              name="creator"
              value={form.creator}
              onChange={handleChange}
            />
            <Field
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              textarea
            />
            <Field
              label="Game"
              name="game"
              value={form.game}
              onChange={handleChange}
            />
            <Field
              label="Ticket Price ($)"
              name="price"
              value={form.price}
              onChange={handleChange}
            />
            <Field
              label="Entries"
              name="type"
              value={form.type}
              onChange={handleChange}
            />
            <Field
              label="Date"
              name="date"
              value={form.date}
              onChange={handleChange}
            />
            <Field
              label="Supply"
              name="supply"
              value={form.supply}
              onChange={handleChange}
            />
            <Field
              label="Refund %"
              name="refund"
              value={form.refund}
              onChange={handleChange}
            />

            {/* Color pickers */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <ColorField
                label="Border 1"
                name="borderColor"
                value={form.borderColor}
                onChange={handleChange}
              />
              <ColorField
                label="Border 2"
                name="imgBorderColor"
                value={form.imgBorderColor}
                onChange={handleChange}
              />
              <ColorField
                label="Background"
                name="bgColor"
                value={form.bgColor}
                onChange={handleChange}
              />
              <ColorField
                label="Features"
                name="featuresColor"
                value={form.featuresColor}
                onChange={handleChange}
              />
              <ColorField
                label="Text"
                name="textColor"
                value={form.textColor}
                onChange={handleChange}
              />
            </div>

            {/* Background style */}
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-yellow-300">
                Background Style
              </span>
              <select
                name="bgStyle"
                value={form.bgStyle}
                onChange={handleChange}
                className="px-3 py-2 rounded-md text-[#0c1a3a]"
              >
                <option value="dots">Dots</option>
                <option value="crosses">Crosses</option>
                <option value="hearts">Hearts</option>
              </select>
            </label>

            <button className="w-full mt-6 py-3 bg-yellow-400 text-[#0c1a3a] font-semibold rounded-lg hover:bg-yellow-300 transition-colors">
              Launch (TBD)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------- Helper Components -------------------- */
interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  textarea?: boolean;
}
const Field = ({ label, name, value, onChange, textarea }: FieldProps) => (
  <label className="flex flex-col gap-1 text-sm">
    <span className="font-medium text-yellow-300">{label}</span>
    {textarea ? (
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        className="px-3 py-2 rounded-md text-[#0c1a3a]"
      />
    ) : (
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="px-3 py-2 rounded-md text-[#0c1a3a]"
      />
    )}
  </label>
);

const ColorField = ({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) => (
  <label className="flex flex-col gap-1 text-sm items-start">
    <span className="font-medium text-yellow-300">{label}</span>
    <input
      type="color"
      name={name}
      value={value}
      onChange={onChange}
      className="w-10 h-8 border-none cursor-pointer"
    />
  </label>
);

/* -------------------- SVG Preview -------------------- */
const SvgPreview = (p: Record<string, string>) => (
  <svg
    width="520"
    height="720"
    viewBox="0 0 520 720"
    className="shadow-2xl rounded-2xl"
    style={{ background: p.bgColor, border: `10px solid ${p.borderColor}` }}
  >
    {/* background patterns */}
    {p.bgStyle === "dots" && (
      <defs>
        <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="2" fill={p.featuresColor} />
        </pattern>
      </defs>
    )}
    {p.bgStyle === "crosses" && (
      <defs>
        <pattern
          id="cross"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 5 H10 M5 0 V10"
            stroke={p.featuresColor}
            strokeWidth="2"
          />
        </pattern>
      </defs>
    )}
    {p.bgStyle === "hearts" && (
      <defs>
        <pattern
          id="hearts"
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M14 25 L5 16 C1 12 1 6 5 4 C8 3 11 4 14 7 C17 4 20 3 23 4 C27 6 27 12 23 16 L14 25 Z"
            fill={p.featuresColor}
          />
        </pattern>
      </defs>
    )}
    {p.bgStyle === "dots" && (
      <rect width="520" height="720" fill="url(#dots)" />
    )}
    {p.bgStyle === "crosses" && (
      <rect width="520" height="720" fill="url(#cross)" />
    )}
    {p.bgStyle === "hearts" && (
      <rect width="520" height="720" fill="url(#hearts)" />
    )}

    {/* artwork 50 % height + rounded, fat inner border */}

    <image
      href={nftPlaceholder.src}
      x="40"
      y="70"
      width="440"
      height="300"
      preserveAspectRatio="xMidYMid slice"
    />
    <rect
      x="40"
      y="70"
      width="440"
      height="300"
      fill="none"
      stroke={p.imgBorderColor}
      strokeWidth="8"
    />
    {/* title (max two rows) */}
    <foreignObject x="40" y="0" width="440" height="64">
      <div
        {...{ xmlns: "http://www.w3.org/1999/xhtml" }}
        style={{
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 28,
          color: p.textColor,
          textAlign: "center",
          lineHeight: "32px",
          overflow: "hidden",
        }}
      >
        {p.name}
      </div>
    </foreignObject>

    {/* price & creator */}
    <text
      x="50%"
      y="400"
      fill={p.textColor}
      color={p.textColor}
      fontFamily="sans-serif"
      fontSize="26"
      fontWeight="bold"
      textAnchor="middle"
    >
      ${p.price}
    </text>
    <text
      x="40"
      y="420"
      fill={p.textColor}
      fontFamily="sans-serif"
      fontSize="18"
      fontWeight="600"
    >
      CREATOR: {p.creator}
    </text>
    <text
      x="30%"
      y="445"
      fill={p.textColor}
      fontFamily="sans-serif"
      fontSize="18"
      fontWeight="600"
    >
      -- DESCRIPTION --
    </text>
    {/* description block (same transparent bg as details) */}
    <foreignObject x="60" y="450" width="416" height="100">
      <text
        {...{ xmlns: "http://www.w3.org/1999/xhtml" }}
        style={{
          color: p.textColor,
          fontFamily: "sans-serif",
          fontSize: 18,
          whiteSpace: "pre-wrap",
          textAlign: "left",
        }}
      >
        {p.description}
      </text>
    </foreignObject>

    {/* details header + bg */}
    <rect
      x="40"
      y="425"
      width="440"
      height="264"
      rx="12"
      fill="#FFFFFF"
      opacity="0.1"
    />
    <text
      x="30%"
      y="570"
      fill={p.textColor}
      fontFamily="sans-serif"
      fontSize="18"
      fontWeight="600"
    >
      -- DETAILS --
    </text>

    {/* labels column */}
    {["Game", "Entries", "Supply", "Refund", "Date"].map((lbl, i) => (
      <text
        key={lbl}
        x="60"
        y={590 + i * 22}
        fill={p.textColor}
        fontFamily="sans-serif"
        fontSize="18"
      >
        {lbl}:
      </text>
    ))}

    {[p.game, p.type, p.supply, p.refund, p.date].map((lbl, i) => (
      <text
        key={lbl}
        x="160"
        y={590 + i * 22}
        fill={p.textColor}
        fontFamily="sans-serif"
        fontSize="18"
      >
        {lbl}
      </text>
    ))}

    {/* values column */}

    <foreignObject x="200" y="746" width="280" height="60">
      <div
        {...{ xmlns: "http://www.w3.org/1999/xhtml" }}
        style={{
          color: "#9CA3AF",
          fontFamily: "sans-serif",
          fontSize: 16,
          whiteSpace: "pre-wrap",
        }}
      >
        {p.date}
      </div>
    </foreignObject>
  </svg>
);
