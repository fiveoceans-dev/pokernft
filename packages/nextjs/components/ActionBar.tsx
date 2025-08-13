// src/components/ActionBar.tsx

interface Props {
  street: string;
  onActivate(): void;
  onFlop(): void;
  onTurn(): void;
  onRiver(): void;
  hasHandStarted: boolean;
}

export default function ActionBar({
  street,
  hasHandStarted,
  ...actions
}: Props) {
  return (
    <div className="flex flex-col gap-2 card p-2 rounded">
      {street === "preflop" && !hasHandStarted && (
        <button
          onClick={actions.onActivate}
          className="py-1.5 px-3 text-sm rounded-full font-serif-renaissance hover:bg-gradient-nav hover:text-white"
        >
          Activate
        </button>
      )}
      {street === "preflop" && (
        <button
          onClick={actions.onFlop}
          disabled={!hasHandStarted}
          className="py-1.5 px-3 text-sm rounded-full font-serif-renaissance hover:bg-gradient-nav hover:text-white disabled:opacity-50"
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
          onClick={actions.onActivate}
          className="py-1.5 px-3 text-sm rounded-full font-serif-renaissance hover:bg-gradient-nav hover:text-white"
        >
          New Hand
        </button>
      )}
    </div>
  );
}
