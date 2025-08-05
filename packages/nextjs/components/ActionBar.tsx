// src/components/ActionBar.tsx
interface Props {
  street: number;
  onStart: () => void;
  onFlop: () => void;
  onTurn: () => void;
  onRiver: () => void;
}

export default function ActionBar({
  street,
  onStart,
  onFlop,
  onTurn,
  onRiver,
}: Props) {
  return (
    <div className="flex gap-4">
      {street === 0 && (
        <button onClick={onStart} className="btn">
          Deal Hole Cards
        </button>
      )}
      {street === 1 && (
        <button onClick={onFlop} className="btn">
          Deal Flop
        </button>
      )}
      {street === 2 && (
        <button onClick={onTurn} className="btn">
          Deal Turn
        </button>
      )}
      {street === 3 && (
        <button onClick={onRiver} className="btn">
          Deal River
        </button>
      )}
      {street >= 4 && (
        <button disabled className="btn opacity-50">
          Showdown Done
        </button>
      )}
    </div>
  );
}
