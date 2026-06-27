export function LeagueNews() {
  const headlines = [
    "Placeholder Headline One highlights late-game heroics",
    "Placeholder Headline Two recaps pivotal injury report",
    "Placeholder Headline Three focuses on coaching comments",
    "Placeholder Headline Four previews Sunday night showdown",
    "Placeholder Headline Five details roster shake-up notes",
    "Placeholder Headline Six breaks down analyst power rankings",
  ];
  return (
    <div className="news-feed">
      <section className="news-panel">
        <header className="news-panel-header">
          <h2 className="news-panel-title">Top Headlines</h2>
        </header>
        <ul className="news-headline-list">
          {headlines.map((h, i) => (
            <li className="news-headline-item" key={h}>
              <a className="news-headline-link" href="#">
                <span className="headline-icon">📰</span>
                {h}
              </a>
              <span className="headline-timestamp">
                {["5m", "18m", "47m", "1h", "2h", "4h"][i]}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="news-feature">
        <div className="feature-card">
          <div className="feature-tag">Game of the Week</div>
          <div className="feature-matchup">
            <div className="feature-team">
              <div className="feature-team-abbr">LV</div>
              <div className="feature-team-record">2-6</div>
            </div>
            <div className="feature-kickoff">
              <div className="feature-kickoff-time">8:15 PM</div>
              <div className="feature-kickoff-network">
                Prime Time • Placeholder Stadium
              </div>
            </div>
            <div className="feature-team">
              <div className="feature-team-abbr">DEN</div>
              <div className="feature-team-record">5-3</div>
            </div>
          </div>
          <div className="feature-image" />
          <div className="feature-headline">
            Placeholder Feature Story explores breakout pass rusher poised for
            stardom
          </div>
          <p className="feature-summary">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras eu
            velit sem. Suspendisse potenti.
          </p>
          <a className="feature-link" href="#">
            Read Full Story
          </a>
        </div>
      </section>
      <section className="news-secondary">
        <h3 className="news-secondary-title">More From Around The League</h3>
        <div className="news-secondary-grid">
          {[
            "rookie quarterback momentum",
            "defensive adjustments",
            "standings shuffle",
          ].map((t) => (
            <article className="news-secondary-card" key={t}>
              <a className="news-secondary-link" href="#">
                <h4 className="news-secondary-headline">
                  Placeholder secondary headline spotlights {t}
                </h4>
                <p className="news-secondary-summary">
                  Integer cursus massa sed turpis sodales, ut elementum enim
                  posuere.
                </p>
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
