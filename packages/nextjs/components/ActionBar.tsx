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
        <button onClick={actions.onFlop} className="btn">
          Deal Flop
        </button>
      )}
      {street === "flop" && (
        <button onClick={actions.onTurn} className="btn">
          Deal Turn
        </button>
      )}
      {street === "turn" && (
        <button onClick={actions.onRiver} className="btn">
          Deal River
        </button>
      )}
      {street === "river" && (
        <button onClick={actions.onStart} className="btn">
          New Hand
        </button>
      )}
    </div>
  );
}
