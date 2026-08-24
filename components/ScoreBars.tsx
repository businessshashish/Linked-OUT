type Score = {
  label: string;
  score: number;
};

export default function ScoreBars({
  scores
}: {
  scores: Score[];
}) {
  return (
    <div className="barList">
      {scores.map((item) => (
        <div
          className="barRow"
          key={item.label}
        >
          <div className="barMeta">
            <span>{item.label}</span>
            <strong>{item.score}</strong>
          </div>

          <div className="barTrack">
            <div
              className="barFill"
              style={{
                width: `${item.score}%`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
