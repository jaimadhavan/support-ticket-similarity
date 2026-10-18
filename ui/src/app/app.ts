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
  relevance?: number;
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

    this.http.get<{ tickets: Ticket[] }>(
      `${this.apiUrl}/search?keyword=${encodeURIComponent(this.keyword)}&limit=${this.resultLimit}`
    )
      .subscribe({
        next: (response) => {
          this.tickets.set(response.tickets);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Search error:', err);
          this.error.set('Failed to search tickets. Please ensure the backend server is running.');
          this.loading.set(false);
          this.tickets.set([]);
        }
      });
  }

  loadTickets() {
    this.loading.set(true);
    this.error.set('');

//   this.ticketService.loadHistoricalTickets().subscribe({
//     next: (response: { message: string; total: number; inserted: number; skipped: number }) => {
//     alert(`Tickets loaded successfully!\nTotal: ${response.total}\nInserted: ${response.inserted}\nSkipped: ${response.skipped}`);
//     this.loading.set(false);
//   },
//   error: (error: any) => {
//     console.error('Load error:', error);
//     this.error.set('Failed to load tickets. Please ensure the backend server is running.');
//     this.loading.set(false);
//   }
// });


    this.http.post<{ message: string; total: number; inserted: number; skipped: number }>(
      `${this.apiUrl}/loadHistoricalTickets`,
      {}
    ).subscribe({
      next: (response) => {
        alert(`Tickets loaded successfully!\nTotal: ${response.total}\nInserted: ${response.inserted}\nSkipped: ${response.skipped}`);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Load error:', err);
        this.error.set('Failed to load tickets. Please ensure the backend server is running.');
        this.loading.set(false);
      }
    });
  }

  removeTickets() {
    this.removing.set(true);
    this.error.set('');

    this.http.delete<{ message: string; total: number }>(`${this.apiUrl}/removeHistoricalTickets`).subscribe({
      next: (response) => {
        alert(`${response.message} ${response.total} tickets are deleted`);
        this.removing.set(false);
        // this.tickets.set([]);
        this.clearSearch();
      },
      error: (err) => {
        console.error('Remove error:', err);
        this.error.set('Failed to remove historical tickets. Please ensure the backend server is running.');
        this.removing.set(false);
      }
    });
  }

  clearSearch() {
    this.keyword = '';
    this.tickets.set([]);
    this.searchPerformed.set(false);
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
