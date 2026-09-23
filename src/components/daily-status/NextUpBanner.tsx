import { useNextUpData, type NextUpBannerProps } from "./use-next-up-data";

export function NextUpBanner(props: NextUpBannerProps = {}) {
  const summary = useNextUpData(props);

  return (
    <div className="ds-next" data-testid="next-up-banner">
      <strong>Next up:</strong> {summary}
    </div>
  );
}
