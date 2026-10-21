import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category, TicketService } from '../../services/ticket.service';
import { SearchUsageResponse, SearchUsageSummary } from '../../app.models';

type DatePreset = 'today' | 'last7days' | 'last30days' | 'custom';

const EMPTY_SUMMARY: SearchUsageSummary = {
  totalSearches: 0,
  successfulMatches: 0,
  noMatchSearches: 0,
  totalMatchedTickets: 0,
  categoriesCreated: 0,
  ticketsCreated: 0
};

@Component({
  selector: 'app-search-usage-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-usage-page.component.html',
  styleUrl: './search-usage-page.component.css'
})
export class SearchUsagePageComponent implements OnInit {
  readonly categories = signal<Category[]>([]);
  readonly usage = signal<SearchUsageResponse | null>(null);
  readonly summary = signal<SearchUsageSummary>(EMPTY_SUMMARY);
  readonly loading = signal(false);
  readonly error = signal('');
  preset: DatePreset = 'today';
  startDate = '';
  endDate = '';
  categoryId: number | null = null;

  constructor(private readonly ticketService: TicketService) {
    this.setDateRange('today');
  }

  ngOnInit() {
    this.ticketService.getCategories().subscribe({
      next: response => this.categories.set(response.categories),
      error: error => {
        console.error('Search usage category list error:', error);
        this.error.set('Unable to load categories for the usage filter.');
      }
    });
    this.loadUsage();
  }

  get matchRate(): number {
    const { totalSearches, successfulMatches } = this.summary();
    return totalSearches === 0 ? 0 : Math.round((successfulMatches / totalSearches) * 100);
  }

  selectPreset(preset: DatePreset) {
    this.preset = preset;
    if (preset !== 'custom') {
      this.setDateRange(preset);
      this.loadUsage();
    }
  }

  onDateChange() {
    this.preset = 'custom';
    if (!this.startDate || !this.endDate) {
      this.usage.set(null);
      this.summary.set(EMPTY_SUMMARY);
      this.error.set('');
      return;
    }
    if (this.startDate > this.endDate) {
      this.usage.set(null);
      this.summary.set(EMPTY_SUMMARY);
      this.error.set('Start date must be on or before end date.');
      return;
    }
    this.loadUsage();
  }

  loadUsage(page = 1) {
    if (!this.startDate || !this.endDate || this.startDate > this.endDate) {
      this.usage.set(null);
      this.summary.set(EMPTY_SUMMARY);
      this.error.set('Choose a valid start and end date.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.ticketService.getSearchUsage(this.startDate, this.endDate, this.categoryId, page).subscribe({
      next: response => {
        this.usage.set(response);
        this.summary.set(response.summary);
        this.loading.set(false);
      },
      error: error => {
        console.error('Search usage error:', error);
        this.usage.set(null);
        this.summary.set(EMPTY_SUMMARY);
        this.error.set(error.status === 404
          ? 'Search usage API is unavailable. Restart the backend so it loads the current analytics routes.'
          : error.error?.error || 'Unable to load search usage. Please try again.');
        this.loading.set(false);
      }
    });
  }

  onCategoryChange() {
    this.loadUsage();
  }

  changePage(page: number) {
    this.loadUsage(page);
  }

  utcDate(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  }

  private setDateRange(preset: Exclude<DatePreset, 'custom'>) {
    const end = new Date();
    const start = new Date(end);
    if (preset === 'last7days') {
      start.setUTCDate(start.getUTCDate() - 6);
    } else if (preset === 'last30days') {
      start.setUTCDate(start.getUTCDate() - 29);
    }
    this.startDate = this.toDateInput(start);
    this.endDate = this.toDateInput(end);
  }

  private toDateInput(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
