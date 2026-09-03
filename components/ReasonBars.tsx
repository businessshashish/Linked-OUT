type Reason = {
  reason: string;
  label: string;
  percentage: number | null;
  count: number;
};

export default function ReasonBars({
  reasons,
  showPercentages = false
}: {
  reasons: Reason[];
  showPercentages?: boolean;
}) {
  if (!reasons.length) {
    return (
      <p className="muted">
        Not enough exit data yet.
      </p>
    );
  }

  const maxCount = Math.max(...reasons.map((reason) => reason.count));

  return (
    <div className="barList">
      {reasons.slice(0, 8).map((reason) => (
        <div
          className="barRow"
          key={reason.reason}
        >
          <div className="barMeta">
            <span>{reason.label}</span>

            <strong>{showPercentages && reason.percentage !== null ? `${reason.percentage}%` : `${reason.count} mention${reason.count === 1 ? "" : "s"}`}</strong>
          </div>

          <div className="barTrack">
            <div
              className="barFill dark"
              style={{
                width: `${showPercentages && reason.percentage !== null ? reason.percentage : Math.round((reason.count / maxCount) * 100)}%`
              }}
            />
          </div>

          <small className="muted">
            Mentioned by {reason.count}{" "}
            {reason.count === 1
              ? "employee"
              : "employees"}
          </small>
        </div>
      ))}
    </div>
  );
}
