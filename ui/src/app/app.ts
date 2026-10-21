import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TicketService } from './services/ticket.service';
import { CategoriesPageComponent } from './pages/categories/categories-page.component';
import { TicketsPageComponent } from './pages/tickets/tickets-page.component';
import { HistoricalPageComponent } from './pages/historical/historical-page.component';
import { SearchUsagePageComponent } from './pages/analytics/search-usage-page.component';
import { SearchPageComponent } from './pages/search/search-page.component';
import {
  AppPage,
  HistoricalLoadSummary,
  HistoricalRemovalSummary,
  MatchStatus,
  Ticket,
  TicketSearchResponse,
  UserRole
} from './app.models';
import { ApplicationHeaderComponent } from './shared/application-header.component';
import { ApplicationNavigationComponent } from './shared/application-navigation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HttpClientModule,
    ApplicationHeaderComponent,
    ApplicationNavigationComponent,
    SearchPageComponent,
    CategoriesPageComponent,
    TicketsPageComponent,
    HistoricalPageComponent,
    SearchUsagePageComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy, OnInit {
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
  matchStatus = signal<MatchStatus>(null);
  copiedTicketId = '';
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly routeSubscription: Subscription;

  constructor(private ticketService: TicketService, private router: Router) {
    this.routeSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.syncPageFromRoute();
      }
    });
  }

  changeUserRole(role: UserRole) {
    this.userRole.set(role);
    this.clearFeedback();
    if (role === 'Support Agent') {
      this.removeConfirmationOpen.set(false);
      this.navigateTo('search');
    }
  }

  navigateTo(page: AppPage) {
    if (page !== 'search' && this.userRole() !== 'Admin') {
      return;
    }
    if (page !== this.activePage()) {
      this.clearFeedback();
      this.activePage.set(page);
      if (page === 'search' || page === 'historical') {
        this.refreshHistoricalTicketAvailability();
      }
    }
    void this.router.navigateByUrl(`/${page}`);
  }

  ngOnInit() {
    this.refreshHistoricalTicketAvailability();
  }

  ngOnDestroy() {
    this.clearFeedbackTimer();
    this.routeSubscription.unsubscribe();
  }

  private syncPageFromRoute() {
    const path = this.router.url.split(/[?#]/, 1)[0].replace(/^\/|\/$/g, '');
    const pages: AppPage[] = ['search', 'categories', 'tickets', 'historical', 'analytics'];
    if (!pages.includes(path as AppPage)) {
      return;
    }

    const page = path as AppPage;
    if (page !== 'search' && this.userRole() !== 'Admin') {
      this.navigateTo('search');
      return;
    }
    if (page !== this.activePage()) {
      this.clearFeedback();
      this.activePage.set(page);
      if (page === 'search' || page === 'historical') {
        this.refreshHistoricalTicketAvailability();
      }
    }
  }

  dismissFeedback() {
    this.clearFeedback();
  }

  private clearFeedbackTimer() {
    if (this.feedbackTimer !== null) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  private clearFeedback() {
    this.clearFeedbackTimer();
    this.error.set('');
    this.successMessage.set('');
  }

  private showFeedback(type: 'error' | 'success', message: string) {
    this.clearFeedback();
    if (type === 'error') {
      this.error.set(message);
    } else {
      this.successMessage.set(message);
    }
    this.feedbackTimer = setTimeout(() => this.clearFeedback(), 5000);
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
      this.showFeedback('error', 'Please enter a keyword to search');
      return;
    }

    this.loading.set(true);
    this.clearFeedback();
    this.searchPerformed.set(true);
    this.matchStatus.set(null);

    this.ticketService.searchTickets(this.keyword, this.resultLimit).subscribe({
      next: (response: TicketSearchResponse) => {
        this.tickets.set(response.tickets);
        this.matchStatus.set(response.matchStatus);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        console.error('Search error:', error);
        this.showFeedback('error', this.getSearchErrorMessage(error));
        this.loading.set(false);
        this.tickets.set([]);
        this.matchStatus.set(null);
      }
    });

  }

  onKeywordChange(keyword: string = this.keyword) {
    this.keyword = keyword;
    this.searchPerformed.set(false);
    this.matchStatus.set(null);
    this.tickets.set([]);
    this.clearFeedback();
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
    this.clearFeedback();

    this.ticketService.loadHistoricalTickets().subscribe({
      next: (response: HistoricalLoadSummary) => {
        this.loading.set(false);
        this.clearSearch();
        this.showFeedback('success',
          `${response.message}. Total: ${response.total}; inserted: ${response.inserted}; skipped: ${response.skipped} (invalid: ${response.invalid}, duplicates: ${response.duplicates}, failed: ${response.failed}).`
        );
        this.refreshHistoricalTicketAvailability();
      },
      error: (error: unknown) => {
        console.error('Load error:', error);
        this.showFeedback('error', 'Failed to load tickets. Please check the backend connection and try again.');
        this.loading.set(false);
      }
    });

  }

  removeTickets() {
    this.removing.set(true);
    this.clearFeedback();
    this.removeConfirmationOpen.set(false);

    this.ticketService.removeHistoricalTickets().subscribe({
      next: (response: HistoricalRemovalSummary) => {
        this.removing.set(false);
        this.clearSearch();
        this.showFeedback('success', `${response.message} (${response.total} tickets removed).`);
        this.refreshHistoricalTicketAvailability();
      },
      error: (error: unknown) => {
        console.error('Remove tickets error:', error);
        this.showFeedback('error', 'Failed to remove historical tickets. Please check the backend connection and try again.');
        this.removing.set(false);
      }
    });
  }

  requestRemoveTickets() {
    if (this.availabilityLoading() || this.availabilityError() || (this.historicalTicketCount() ?? 0) === 0) {
      return;
    }
    this.clearFeedback();
    this.removeConfirmationOpen.set(true);
  }

  cancelRemoveTickets() {
    this.removeConfirmationOpen.set(false);
  }

  confirmRemoveTickets() {
    if (!this.removeConfirmationOpen() || this.removing()) {
      return;
    }
    this.removeTickets();
  }

  clearSearch() {
    this.clearFeedbackTimer();
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
