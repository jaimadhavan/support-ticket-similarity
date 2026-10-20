
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HistoricalLoadSummary, HistoricalRemovalSummary, TicketSearchResponse } from '../app.models';

export interface Category {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
}

export type TicketStatus = 'new' | 'inprogress' | 'resolved';

export interface ManagedTicket {
  ticket_id: string;
  category_id: number;
  category?: string;
  subject: string;
  description: string;
  resolution_notes: string;
  tags: string[];
  created_at: string;
  status: TicketStatus;
}

export interface ManagedTicketList {
  tickets: ManagedTicket[];
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getHistoricalTicketAvailability(): Observable<{ count: number; resolvedCount: number }> {
    return this.http.get<{ count: number; resolvedCount: number }>(`${this.apiUrl}/availability`);
  }

  getCategories(): Observable<{ categories: Category[] }> {
    return this.http.get<{ categories: Category[] }>('/api/categories');
  }

  addCategory(name: string): Observable<Category> {
    return this.http.post<Category>('/api/categories', { name });
  }

  updateCategory(id: number, name: string): Observable<Category> {
    return this.http.put<Category>(`/api/categories/${id}`, { name });
  }

  deactivateCategory(id: number): Observable<{ message: string; category: Category }> {
    return this.http.delete<{ message: string; category: Category }>(`/api/categories/${id}`);
  }

  getManagedTickets(): Observable<ManagedTicketList> {
    return this.http.get<ManagedTicketList>('/api/admin/tickets');
  }

  addManagedTicket(ticket: ManagedTicket): Observable<ManagedTicket> {
    return this.http.post<ManagedTicket>('/api/admin/tickets', ticket);
  }

  updateManagedTicket(ticketId: string, ticket: ManagedTicket): Observable<ManagedTicket> {
    return this.http.put<ManagedTicket>(`/api/admin/tickets/${encodeURIComponent(ticketId)}`, ticket);
  }

  deleteManagedTicket(ticketId: string): Observable<{ message: string; ticket_id: string }> {
    return this.http.delete<{ message: string; ticket_id: string }>(
      `/api/admin/tickets/${encodeURIComponent(ticketId)}`
    );
  }

  loadHistoricalTickets(): Observable<HistoricalLoadSummary> {
    return this.http.post<HistoricalLoadSummary>(
      `${this.apiUrl}/loadHistoricalTickets`,
      {}
    );
  }

  removeHistoricalTickets(): Observable<HistoricalRemovalSummary> {
    return this.http.delete<HistoricalRemovalSummary>(
      `${this.apiUrl}/removeHistoricalTickets`
    );
  }

  searchTickets(keyword: string, resultLimit: number): Observable<TicketSearchResponse> {
    return this.http.get<TicketSearchResponse>(
      `${this.apiUrl}/search?keyword=${encodeURIComponent(keyword)}&limit=${resultLimit}`
    );
  }
}
