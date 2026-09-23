import { PLACEHOLDER_NEXT_UP } from "./placeholder-data";

export function NextUpBanner() {
  const [prefix, ...rest] = PLACEHOLDER_NEXT_UP.split(": ");

  return (
    <div className="ds-next" data-testid="next-up-banner">
      <strong>{prefix}:</strong> {rest.join(": ")}
    </div>
  );
}
