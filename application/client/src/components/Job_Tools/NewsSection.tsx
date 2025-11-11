 interface NewsArticle {
 title: string;
   snippet: string;
   link: string;
    date?: string;
    source?: string;
    publishedAt?: string;
    category?: string;
    relevanceScore?: number;
    summary?: string;
    keyPoints?: string[];
  }

interface NewsColumnProps {
  news: NewsArticle[]; // The news data passed from parent
  showRelevantOnly: boolean; // The state to control filtering
  setShowRelevantOnly: React.Dispatch<React.SetStateAction<boolean>>; // Function to update state in parent
}

const NewsColumn: React.FC<NewsColumnProps> = ({ news, showRelevantOnly, setShowRelevantOnly }) => {
  // Filter and sort news within the component
  let filteredNews: NewsArticle[] = [];
  if (news) {
    filteredNews = news
    .filter(article => {
        if (!showRelevantOnly) return true;
        return (article.relevanceScore !== undefined && article.relevanceScore >= 1);
 // Just check if it exists
    })
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
  }

  return (
    <div className="news-column"> {/* This div now has the className */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">News</h2>
          <button
            onClick={() => setShowRelevantOnly(prev => !prev)}
            className="filter-button"
          >
            {showRelevantOnly ? 'Show All News' : 'Show Career-Relevant Only'}
          </button>
        </div>
        <div className="section-content">
          {filteredNews.length > 0 ? (
            filteredNews.slice(0, 5).map((article, index) => (
              <div key={index} className="news-article">
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="section-link"
                >
                  <span>→ {article.title || 'Untitled Article'}</span>
                </a>
                <p className="news-meta">
                  {article.category && <strong>Category:</strong>} {article.category} |{' '}
                  {article.source && <strong>Source:</strong>} {article.source} |{' '}
                  {article.relevanceScore !== undefined && <strong>Relevance:</strong>} {article.relevanceScore}
                </p>
                {article.summary && (
                  <p className="news-summary">
                    <strong>Summary:</strong> {article.summary}
                  </p>
                )}
                {article.keyPoints && article.keyPoints.length > 0 && (
                  <ul className="news-keypoints">
                    {article.keyPoints.map((point, i) => (
                      <li key={i}>• {point}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          ) : (
            <p>No news articles found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsColumn;