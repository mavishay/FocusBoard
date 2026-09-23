import { useDailyMetrics } from "./useDailyMetrics";

export function MetricsStrip() {
  const metrics = useDailyMetrics();

  return (
    <div className="ds-metrics" data-testid="metrics-strip">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className={`ds-metric ds-${metric.tone}`}
          data-testid={`metric-${metric.id}`}
        >
          <div className="ds-label">{metric.label}</div>
          <div className="ds-value">{metric.value}</div>
          <div className="ds-hint">{metric.hint}</div>
        </div>
      ))}
    </div>
  );
}
