import type Database from 'better-sqlite3';

export type QuoteSource = 'zenquotes' | 'quotable' | 'default' | 'cache';

export interface DailyQuote {
  date: string;
  content: string;
  author: string;
  source: QuoteSource;
  tags: string[];
  fetchedAt: string;
}

interface DailyQuoteRow {
  date: string;
  content: string;
  author: string;
  source: string;
  tags: string | null;
  fetched_at: string;
}

const DEFAULT_QUOTE = {
  content: 'The secret of getting ahead is getting started.',
  author: 'Mark Twain',
  tags: ['motivation', 'productivity'],
};

function todayDateString(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rowToQuote(row: DailyQuoteRow): DailyQuote {
  let tags: string[] = [];
  if (row.tags) {
    try {
      const parsed = JSON.parse(row.tags) as unknown;
      if (Array.isArray(parsed)) {
        tags = parsed.filter((tag): tag is string => typeof tag === 'string');
      }
    } catch {
      tags = [];
    }
  }

  return {
    date: row.date,
    content: row.content,
    author: row.author,
    source: row.source as QuoteSource,
    tags,
    fetchedAt: row.fetched_at,
  };
}

export class QuoteService {
  constructor(private db: Database.Database) {}

  async getToday(): Promise<DailyQuote> {
    const today = todayDateString();
    const cached = this.getCachedQuote(today);
    if (cached) {
      return { ...cached, source: 'cache' };
    }

    return this.fetchAndCache(today);
  }

  async refresh(): Promise<DailyQuote> {
    const today = todayDateString();
    const fetched = await this.fetchRandomFromApis();
    const quote = fetched ?? this.buildDefaultQuote(today);
    return this.saveQuote(quote);
  }

  private getCachedQuote(date: string): DailyQuote | null {
    const row = this.db
      .prepare('SELECT date, content, author, source, tags, fetched_at FROM daily_quotes WHERE date = ?')
      .get(date) as DailyQuoteRow | undefined;

    return row ? rowToQuote(row) : null;
  }

  private async fetchAndCache(date: string): Promise<DailyQuote> {
    const fetched = await this.fetchDailyFromApis(date);
    const quote = fetched ?? this.buildDefaultQuote(date);
    return this.saveQuote(quote);
  }

  private saveQuote(quote: DailyQuote): DailyQuote {
    this.db
      .prepare(
        `INSERT INTO daily_quotes (date, content, author, source, tags, fetched_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(date) DO UPDATE SET
           content = excluded.content,
           author = excluded.author,
           source = excluded.source,
           tags = excluded.tags,
           fetched_at = excluded.fetched_at`
      )
      .run(
        quote.date,
        quote.content,
        quote.author,
        quote.source,
        JSON.stringify(quote.tags)
      );

    const saved = this.getCachedQuote(quote.date);
    return saved ?? quote;
  }

  private buildDefaultQuote(date: string): DailyQuote {
    return {
      date,
      content: DEFAULT_QUOTE.content,
      author: DEFAULT_QUOTE.author,
      source: 'default',
      tags: DEFAULT_QUOTE.tags,
      fetchedAt: new Date().toISOString(),
    };
  }

  private async fetchDailyFromApis(date: string): Promise<DailyQuote | null> {
    const zenQuote = await this.fetchZenQuotes('today');
    if (zenQuote) {
      return { ...zenQuote, date };
    }

    const quotableQuote = await this.fetchQuotable();
    if (quotableQuote) {
      return { ...quotableQuote, date };
    }

    const cached = this.getCachedQuote(date);
    if (cached) {
      return cached;
    }

    return null;
  }

  private async fetchRandomFromApis(): Promise<DailyQuote | null> {
    const today = todayDateString();
    const zenQuote = await this.fetchZenQuotes('random');
    if (zenQuote) {
      return { ...zenQuote, date: today };
    }

    const quotableQuote = await this.fetchQuotable();
    if (quotableQuote) {
      return { ...quotableQuote, date: today };
    }

    return null;
  }

  private async fetchZenQuotes(
    mode: 'today' | 'random',
  ): Promise<Omit<DailyQuote, 'date'> | null> {
    try {
      const response = await fetch(`https://zenquotes.io/api/${mode}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;

      const data = (await response.json()) as Array<{ q?: string; a?: string }>;
      const entry = data[0];
      if (!entry?.q || !entry?.a) return null;

      return {
        content: entry.q.trim(),
        author: entry.a.trim(),
        source: 'zenquotes',
        tags: [],
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private async fetchQuotable(): Promise<Omit<DailyQuote, 'date'> | null> {
    try {
      const response = await fetch('https://api.quotable.io/random', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;

      const data = (await response.json()) as {
        content?: string;
        author?: string;
        tags?: string[];
      };

      if (!data.content || !data.author) return null;

      return {
        content: data.content.trim(),
        author: data.author.trim(),
        source: 'quotable',
        tags: Array.isArray(data.tags)
          ? data.tags.filter((tag): tag is string => typeof tag === 'string')
          : [],
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}
