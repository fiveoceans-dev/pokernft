// src/components/Card.tsx
import clsx from 'clsx';
import type { Card as TCard } from '../game/types';          // type-only ✔
import cardStarknet from '../assets/svg-cards/card-starknet.svg';
// import cardPokerBoots from '../assets/svg-cards/card-pokerboots.svg';

/* ─────────── import all face SVGs at build-time ───────────
   Vite’s eager glob returns an object whose values are the URLs
   of the processed files (just like a normal `import ... from`).
*/
const faceSvgs = import.meta.glob('../assets/svg-cards/*_of_*.svg', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

/* Helper: convert rank/suit symbols → filename stem */
const rankMap: Record<string, string> = {
  'A': 'ace',  'K': 'king', 'Q': 'queen', 'J': 'jack', 'T': '10',
  '9': '9',    '8': '8',    '7': '7',     '6': '6',    '5': '5',
  '4': '4',    '3': '3',    '2': '2',
};
const suitMap: Record<string, string> = {
  '♠': 'spades',
  '♥': 'hearts',
  '♦': 'diamonds',
  '♣': 'clubs',
};
function faceKey(card: TCard) {
  return `../assets/svg-cards/${rankMap[card.rank]}_of_${suitMap[card.suit]}.svg`;
}

interface Props {
  card: TCard | null;        // null while face-down
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Card({ card, hidden, size = 'md' }: Props) {
  const className = clsx(
    'relative rounded-md shadow-sm',
    {
      'w-16 h-24': size === 'sm',
      'w-20 h-28': size === 'md',
      'w-24 h-32': size === 'lg',
    },
  );

  /* choose back or face */
  const src =
    hidden || !card
      ? cardStarknet
      : faceSvgs[faceKey(card)] ?? cardStarknet; // fallback to back if missing

  return <img src={src} className={className} draggable={false} />;
}
