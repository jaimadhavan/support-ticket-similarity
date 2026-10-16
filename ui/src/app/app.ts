import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

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
  tickets = signal<Ticket[]>([]);
  loading = signal(false);
  error = signal('');
  searchPerformed = signal(false);

  constructor(private http: HttpClient) {}

  searchTickets() {
    if (!this.keyword.trim()) {
      this.error.set('Please enter a keyword to search');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.searchPerformed.set(true);

    this.http.get<{ tickets: Ticket[] }>(`${this.apiUrl}/search?keyword=${encodeURIComponent(this.keyword)}`)
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

    this.http.post<{ message: string; total: number; inserted: number; skipped: number }>(
      `${this.apiUrl}/load`,
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

  clearSearch() {
    this.keyword = '';
    this.tickets.set([]);
    this.searchPerformed.set(false);
    this.error.set('');
  }
}
