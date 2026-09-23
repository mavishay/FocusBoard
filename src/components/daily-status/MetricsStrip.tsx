import { PLACEHOLDER_METRICS } from "./placeholder-data";

export function MetricsStrip() {
  return (
    <div className="ds-metrics" data-testid="metrics-strip">
      {PLACEHOLDER_METRICS.map((metric) => (
        <div key={metric.label} className={`ds-metric ds-${metric.tone}`}>
          <div className="ds-label">{metric.label}</div>
          <div className="ds-value">{metric.value}</div>
          <div className="ds-hint">{metric.hint}</div>
        </div>
      ))}
    </div>
  );
}
