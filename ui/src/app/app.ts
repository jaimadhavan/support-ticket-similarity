import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { TicketService } from './services/ticket.service';
import { CategoriesPageComponent } from './admin/categories-page.component';
import { TicketsPageComponent } from './admin/tickets-page.component';

type UserRole = 'Support Agent' | 'Admin';
type AppPage = 'search' | 'categories' | 'tickets' | 'historical';

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
  imports: [CommonModule, FormsModule, HttpClientModule, CategoriesPageComponent, TicketsPageComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  userRole = signal<UserRole>('Support Agent');
  activePage = signal<AppPage>('search');
  keyword = '';
  resultLimit = 5;
  tickets = signal<Ticket[]>([]);
  loading = signal(false);
  removing = signal(false);
  removeConfirmationOpen = signal(false);
  availabilityLoading = signal(true);
  historicalTicketCount = signal<number | null>(null);
  resolvedTicketCount = signal<number | null>(null);
  availabilityError = signal('');
  error = signal('');
  successMessage = signal('');
  searchPerformed = signal(false);
  matchStatus = signal<'good_match' | 'no_good_match' | null>(null);
  copiedTicketId = '';

  constructor(private ticketService: TicketService) {}

  changeUserRole(role: UserRole) {
    this.userRole.set(role);
    if (role === 'Support Agent') {
      this.activePage.set('search');
      this.removeConfirmationOpen.set(false);
    }
  }

  navigateTo(page: AppPage) {
    if (page !== 'search' && this.userRole() !== 'Admin') {
      return;
    }
    if (page !== this.activePage()) {
      this.successMessage.set('');
    }
    this.activePage.set(page);
    if (page === 'search' || page === 'historical') {
      this.refreshHistoricalTicketAvailability();
    }
  }

  ngOnInit() {
    this.refreshHistoricalTicketAvailability();
  }

  refreshHistoricalTicketAvailability() {
    this.availabilityLoading.set(true);
    this.historicalTicketCount.set(null);
    this.resolvedTicketCount.set(null);
    this.availabilityError.set('');

    this.ticketService.getHistoricalTicketAvailability().subscribe({
      next: (response: { count: number; resolvedCount: number }) => {
        this.historicalTicketCount.set(response.count);
        this.resolvedTicketCount.set(response.resolvedCount);
        this.availabilityLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Historical ticket availability error:', error);
        this.availabilityError.set('Unable to check historical ticket availability. Please try again.');
        this.availabilityLoading.set(false);
      }
    });
  }

  searchTickets() {
    if (
      this.availabilityLoading() ||
      this.removing() ||
      (this.resolvedTicketCount() ?? 0) === 0
    ) {
      return;
    }

    if (!this.keyword.trim()) {
      this.error.set('Please enter a keyword to search');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.successMessage.set('');
    this.searchPerformed.set(true);
    this.matchStatus.set(null);

    this.ticketService.searchTickets(this.keyword,this.resultLimit).subscribe({
      next: (response: { tickets: Ticket[]; matchStatus: 'good_match' | 'no_good_match' }) => {
        this.tickets.set(response.tickets);
        this.matchStatus.set(response.matchStatus);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        console.error('Search error:', error);
        this.error.set(this.getSearchErrorMessage(error));
        this.loading.set(false);
        this.tickets.set([]);
        this.matchStatus.set(null);
      }
    });

  }

  onKeywordChange() {
    this.searchPerformed.set(false);
    this.matchStatus.set(null);
    this.tickets.set([]);
    this.error.set('');
  }

  private getSearchErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400 && typeof error.error?.error === 'string') {
        return error.error.error;
      }
      if (error.status === 0) {
        return 'Unable to reach the search service. Please check your connection and try again.';
      }
    }

    return 'Search failed. Please try again.';
  }

  loadTickets() {
    this.loading.set(true);
    this.error.set('');
    this.successMessage.set('');

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
        this.loading.set(false);
        this.clearSearch();
        this.successMessage.set(
          `${response.message}. Total: ${response.total}; inserted: ${response.inserted}; skipped: ${response.skipped} (invalid: ${response.invalid}, duplicates: ${response.duplicates}, failed: ${response.failed}).`
        );
        this.refreshHistoricalTicketAvailability();
      },
      error: (error: unknown) => {
        console.error('Load error:', error);
        this.error.set('Failed to load tickets. Please check the backend connection and try again.');
        this.loading.set(false);
      }
    });

  }

  removeTickets() {
    this.removing.set(true);
    this.error.set('');
    this.successMessage.set('');
    this.removeConfirmationOpen.set(false);

    this.ticketService.removeHistoricalTickets().subscribe({
      next: (response: { message: string; total: number }) => {
        this.removing.set(false);
        this.clearSearch();
        this.successMessage.set(`${response.message} (${response.total} tickets removed).`);
        this.refreshHistoricalTicketAvailability();
      },
      error: (error: unknown) => {
        console.error('Remove tickets error:', error);
        this.error.set('Failed to remove historical tickets. Please check the backend connection and try again.');
        this.removing.set(false);
      }
    });
  }

  requestRemoveTickets() {
    if (this.availabilityLoading() || this.availabilityError() || (this.historicalTicketCount() ?? 0) === 0) {
      return;
    }
    this.error.set('');
    this.successMessage.set('');
    this.removeConfirmationOpen.set(true);
  }

  cancelRemoveTickets() {
    this.removeConfirmationOpen.set(false);
  }

  closeHistoricalTicketManagement(section: HTMLDetailsElement) {
    this.removeConfirmationOpen.set(false);
    section.open = false;
  }

  confirmRemoveTickets() {
    if (!this.removeConfirmationOpen() || this.removing()) {
      return;
    }
    this.removeTickets();
  }

  clearSearch() {
    this.keyword = '';
    this.tickets.set([]);
    this.searchPerformed.set(false);
    this.matchStatus.set(null);
    this.error.set('');
    this.successMessage.set('');
    this.removeConfirmationOpen.set(false);
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
