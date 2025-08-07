// src/components/ActionBar.tsx
interface Props {
  street: string;
  onStart(): void;
  onFlop(): void;
  onTurn(): void;
  onRiver(): void;
}

export default function ActionBar({ street, ...actions }: Props) {
  return (
    <div className="flex gap-4 card p-2 rounded-full">
      {street === "preflop" && (
        <button
          onClick={actions.onFlop}
          className="py-1.5 px-3 text-sm rounded-full font-serif-renaissance hover:bg-gradient-nav hover:text-white"
        >
          Deal Flop
        </button>
      )}
      {street === "flop" && (
        <button
          onClick={actions.onTurn}
          className="py-1.5 px-3 text-sm rounded-full font-serif-renaissance hover:bg-gradient-nav hover:text-white"
        >
          Deal Turn
        </button>
      )}
      {street === "turn" && (
        <button
          onClick={actions.onRiver}
          className="py-1.5 px-3 text-sm rounded-full font-serif-renaissance hover:bg-gradient-nav hover:text-white"
        >
          Deal River
        </button>
      )}
      {street === "river" && (
        <button
          onClick={actions.onStart}
          className="py-1.5 px-3 text-sm rounded-full font-serif-renaissance hover:bg-gradient-nav hover:text-white"
        >
          New Hand
        </button>
      )}
    </div>
  );
}
