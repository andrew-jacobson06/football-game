export function GameField() {
  return (
    <div className="field-wrapper">
      <div id="field3D" className="field3D">
        {[10, 20, 30, 40, 50, 40, 30, 20, 10].map((n, i) => (
          <div
            key={i}
            className="yardline"
            style={{ left: `${(i + 1) * 10}%` }}
          >
            <span className="label top left">{String(n)[0]}</span>
            <span className="label top right">{String(n).slice(1) || "0"}</span>
          </div>
        ))}
        <div className="line-of-scrimmage" style={{ left: "64%" }} />
        <div className="first-down-line" style={{ left: "71%" }} />
      </div>
    </div>
  );
}
