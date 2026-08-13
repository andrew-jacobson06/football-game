import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { getArticles, type LeagueArticle } from "../../api/client";
import defaultArticleHero from "../../assets/hero.png";
import { leagueHeadlines } from "./leagueArticles";

function articleExcerpt(article: LeagueArticle) {
  return article.articleMarkdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function ArticleView({ article, onBack }: { article: LeagueArticle; onBack: () => void }) {
  return (
    <article className="article-view">
      <button className="article-view__back" type="button" onClick={onBack}>← Back to league news</button>
      <div className="article-view__hero">
        <img src={article.heroImageUrl || defaultArticleHero} alt={`${article.title} hero`} />
      </div>
      <div className="article-view__content">
        <p className="article-view__meta">Week {article.week} · {new Date(article.publishedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>
        <h1>{article.title}</h1>
        {article.summary && <p className="article-view__dek">{article.summary}</p>}
        <div className="article-view__body"><ReactMarkdown>{article.articleMarkdown}</ReactMarkdown></div>
      </div>
    </article>
  );
}

export function LeagueNews() {
  const [articles, setArticles] = useState<LeagueArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<LeagueArticle | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    getArticles()
      .then(({ articles: loadedArticles }) => setArticles(loadedArticles.slice(0, 3)))
      .catch(() => setLoadFailed(true));
  }, []);

  if (selectedArticle) return <ArticleView article={selectedArticle} onBack={() => setSelectedArticle(null)} />;

  return (
    <div className="news-feed">
      <section className="news-panel">
        <header className="news-panel-header"><h2 className="news-panel-title">Top Headlines</h2></header>
        <ul className="news-headline-list">
          {leagueHeadlines.map((headline, index) => (
            <li className="news-headline-item" id={`article-${index}`} key={headline}>
              <a className="news-headline-link" href="#"><span className="headline-icon">📰</span>{headline}</a>
              <span className="headline-timestamp">{["5m", "18m", "47m", "1h", "2h", "4h"][index]}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="news-feature">
        <div className="feature-card">
          <div className="feature-tag">Game of the Week</div>
          <div className="feature-matchup"><div className="feature-team"><div>LV</div><div className="feature-team-record">2-6</div></div><div className="feature-kickoff"><div>8:15 PM</div><div>Prime Time • Placeholder Stadium</div></div><div className="feature-team"><div>DEN</div><div className="feature-team-record">5-3</div></div></div>
          <div className="feature-image" />
          <div className="feature-headline">Placeholder Feature Story explores breakout pass rusher poised for stardom</div>
          <p className="feature-summary">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras eu velit sem.</p>
        </div>
      </section>
      <section className="news-secondary">
        <h3 className="news-secondary-title">More From Around The League</h3>
        {loadFailed && <p className="news-secondary-status">League articles are unavailable right now.</p>}
        {!loadFailed && articles.length === 0 && <p className="news-secondary-status">No published articles yet.</p>}
        <div className="news-secondary-grid">
          {articles.map((article) => (
            <article className="news-secondary-card" key={article.id}>
              <button className="news-secondary-link" type="button" onClick={() => setSelectedArticle(article)}>
                <h4 className="news-secondary-headline">{article.title}</h4>
                <p className="news-secondary-summary">{articleExcerpt(article)}</p>
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
