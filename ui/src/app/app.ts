import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TicketService } from './services/ticket.service';
interface Ticket {
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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private apiUrl = '/api/tickets';
  
  keyword = '';
  resultLimit = 5;
  tickets = signal<Ticket[]>([]);
  loading = signal(false);
  removing = signal(false);
  error = signal('');
  searchPerformed = signal(false);
  matchStatus = signal<'good_match' | 'no_good_match' | null>(null);
  copiedTicketId = '';

  constructor(private http: HttpClient, private ticketService: TicketService) {}

  searchTickets() {
    if (!this.keyword.trim()) {
      this.error.set('Please enter a keyword to search');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.searchPerformed.set(true);
    this.matchStatus.set(null);

    this.ticketService.searchTickets(this.keyword,this.resultLimit).subscribe({
      next: (response: { tickets: Ticket[]; matchStatus: 'good_match' | 'no_good_match' }) => {
        this.tickets.set(response.tickets);
        this.matchStatus.set(response.matchStatus);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Search error:', error);
        this.error.set('Failed to search tickets. Please ensure the backend server is running.');
        this.loading.set(false);
        this.tickets.set([]);
        this.matchStatus.set(null);
      }
    });

  }

  loadTickets() {
    this.loading.set(true);
    this.error.set('');

  this.ticketService.loadHistoricalTickets().subscribe({
    next: (response: {
      message: string;
      total: number;
      inserted: number;
      skipped: number;
      invalid: number;
      duplicates: number;
      failed: number;
    }) => {
    alert(`${response.message}\nTotal: ${response.total}\nInserted: ${response.inserted}\nSkipped: ${response.skipped} (invalid: ${response.invalid}, duplicates: ${response.duplicates}, failed: ${response.failed})`);
    this.loading.set(false);
    this.clearSearch();
  },
  error: (error: any) => {
    console.error('Load error:', error);
    this.error.set('Failed to load tickets. Please ensure the backend server is running.');
    this.loading.set(false);
  }
});

  }

  removeTickets() {
    this.removing.set(true);
    this.error.set('');

    this.ticketService.removeHistoricalTickets().subscribe({
      next: (response: { message: string; total: number }) => {
        alert(`${response.message}`);
        this.removing.set(false);
        this.clearSearch();
      },
      error: (error: any) => {
        this.error.set('Failed to remove historical tickets. Please ensure the backend server is running.');
        this.removing.set(false);
      }
    });
  }

  clearSearch() {
    this.keyword = '';
    this.tickets.set([]);
    this.searchPerformed.set(false);
    this.matchStatus.set(null);
    this.error.set('');
  }

  copyToClipboard(text: string, event: Event) {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      this.copiedTicketId = this.tickets().find(t => t.resolution_notes === text)?.ticket_id || '';
      setTimeout(() => {
        this.copiedTicketId = '';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }
}
