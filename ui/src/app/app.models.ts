export type UserRole = 'Support Agent' | 'Admin';
export type AppPage = 'search' | 'categories' | 'tickets' | 'historical';
export type MatchStatus = 'good_match' | 'no_good_match' | null;

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
