import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function DailyQuote() {
  const [content, setContent] = useState<string | null>(null);
  const [author, setAuthor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadQuote = useCallback(async () => {
    const quote = await window.electronAPI.quote.getToday();
    setContent(quote.content);
    setAuthor(quote.author);
  }, []);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const quote = await window.electronAPI.quote.refresh();
      setContent(quote.content);
      setAuthor(quote.author);
    } finally {
      setRefreshing(false);
    }
  };

  if (!content || !author) {
    return null;
  }

  return (
    <div className="ds-quote" data-testid="daily-quote">
      <blockquote className="ds-quote-text" dir="ltr">
        <em>&ldquo;{content}&rdquo;</em>
        <span className="ds-quote-author">— {author}</span>
      </blockquote>
      <button
        type="button"
        className="ds-quote-refresh"
        onClick={() => void handleRefresh()}
        disabled={refreshing}
        aria-label="רענון ציטוט"
        title="רענון ציטוט"
      >
        <RefreshCw className={refreshing ? "ds-spin" : undefined} size={16} />
      </button>
    </div>
  );
}
