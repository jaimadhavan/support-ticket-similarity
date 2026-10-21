export type UserRole = 'Support Agent' | 'Admin';
export type AppPage = 'search' | 'categories' | 'tickets' | 'historical' | 'analytics';
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

export interface SearchUsageSummary {
  totalSearches: number;
  successfulMatches: number;
  noMatchSearches: number;
  totalMatchedTickets: number;
  categoriesCreated: number;
  ticketsCreated: number;
}

export interface TicketCreationActivity {
  ticketId: string;
  subject: string;
  status: string;
  createdAt: string;
}

export interface TicketCategoryActivity {
  categoryId: number;
  category: string;
  categoryCreatedAt: string;
  ticketCount: number;
  tickets: TicketCreationActivity[];
}

export interface SearchUsageRecord {
  id: string;
  searchText: string;
  searchedAt: string;
  matchFound: boolean;
  matchCount: number;
  matchingTickets: Array<{
    ticketId: string;
    categoryId: number;
    category: string;
    subject?: string | null;
    status?: string | null;
    ticketCreatedAt?: string | null;
  }>;
}

export interface SearchUsageResponse {
  startDate: string;
  endDate: string;
  categoryId: number | null;
  summary: SearchUsageSummary;
  page: number;
  pageSize: number;
  pageCount: number;
  detailCount: number;
  ticketsByCategory: TicketCategoryActivity[];
  searches: SearchUsageRecord[];
}
