type Reason = {
  reason: string;
  label: string;
  percentage: number;
  count: number;
};

export default function ReasonBars({
  reasons
}: {
  reasons: Reason[];
}) {
  if (!reasons.length) {
    return (
      <p className="muted">
        Not enough exit data yet.
      </p>
    );
  }

  return (
    <div className="barList">
      {reasons.slice(0, 8).map((reason) => (
        <div
          className="barRow"
          key={reason.reason}
        >
          <div className="barMeta">
            <span>{reason.label}</span>

            <strong>
              {reason.percentage}%
            </strong>
          </div>

          <div className="barTrack">
            <div
              className="barFill dark"
              style={{
                width: `${reason.percentage}%`
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
