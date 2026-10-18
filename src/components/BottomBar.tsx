type Props = {
  backLabel?: string;
  nextLabel: string;
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
};

export function BottomBar({ backLabel, nextLabel, onBack, onNext, nextDisabled }: Props) {
  return (
    <footer className="bottom">
      <div className="bottom__inner">
        {backLabel && onBack ? (
          <button type="button" onClick={onBack}>
            {backLabel}
          </button>
        ) : null}
        <button type="button" className="primary" onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
        </button>
      </div>
    </footer>
  );
}
