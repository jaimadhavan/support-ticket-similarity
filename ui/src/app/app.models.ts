export type UserRole = 'Support Agent' | 'Admin';
export type AppPage = 'search' | 'categories' | 'tickets' | 'historical';
export type SearchMatchStatus = 'good_match' | 'no_good_match';
export type MatchStatus = SearchMatchStatus | null;

export interface Ticket {
  ticket_id: string;
  category: string;
  subject: string;
  description: string;
  resolution_notes: string;
  tags: string[];
  created_at: string;
  status: string;
  matchCount?: number;
  matchedWords?: string[];
}

export interface HistoricalLoadSummary {
  message: string;
  total: number;
  inserted: number;
  skipped: number;
  invalid: number;
  duplicates: number;
  failed: number;
}

export interface HistoricalRemovalSummary {
  message: string;
  total: number;
}

export interface TicketSearchResponse {
  keyword: string;
  count: number;
  matchStatus: SearchMatchStatus;
  tickets: Ticket[];
}
