import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { App } from './app';
import { TicketService } from './services/ticket.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: TicketService,
          useValue: {
            getHistoricalTicketAvailability: () => of({ count: 0, resolvedCount: 0 }),
            searchTickets: () => of({ tickets: [], matchStatus: 'no_good_match' }),
            loadHistoricalTickets: () => of({}),
            removeHistoricalTickets: () => of({})
          }
        }
      ]
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the enterprise application header and workspace role selector', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('.application-header');
    expect(header?.querySelector('h1')?.textContent).toContain('Support Ticket Management');
    expect(header?.textContent).toContain('Support Operations');
    expect(header?.textContent).toContain('Find trusted resolutions');
    expect(header?.querySelector('.brand-mark[aria-hidden="true"] svg')).toBeTruthy();
    expect(header?.querySelector('[aria-label="User role"]')).toBeTruthy();
  });

  it('should default to Support Agent and hide admin navigation', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect((compiled.querySelector('[aria-label="User role"]') as HTMLSelectElement).value).toBe('Support Agent');
    expect(compiled.textContent).toContain('Ticket Similarity Search');
    expect(compiled.textContent).not.toContain('Manage Ticket Categories');
    expect(compiled.textContent).not.toContain('Manage Historical Tickets');
  });

  it('changes the workspace role through the extracted header component', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const roleSelector = fixture.nativeElement.querySelector('[aria-label="User role"]') as HTMLSelectElement;

    roleSelector.value = 'Admin';
    roleSelector.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.userRole()).toBe('Admin');
    expect(fixture.nativeElement.textContent).toContain('Manage Tickets');
  });

  it('keeps one shared application header while switching between pages', async () => {
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 1, resolvedCount: 1 }),
        getCategories: () => of({ categories: [] }),
        getManagedTickets: () => of({ tickets: [] }),
        searchTickets: () => of({ tickets: [], matchStatus: 'no_good_match' }),
        loadHistoricalTickets: () => of({}),
        removeHistoricalTickets: () => of({})
      }
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.changeUserRole('Admin');

    for (const page of ['search', 'categories', 'tickets', 'historical'] as const) {
      fixture.componentInstance.navigateTo(page);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('app-application-header').length).toBe(1);
      expect(fixture.nativeElement.querySelector('.application-header h1')?.textContent)
        .toContain('Support Ticket Management');
    }
  });

  it('should show admin menus only after switching to Admin', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    fixture.componentInstance.changeUserRole('Admin');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Manage Ticket Categories');
    expect(fixture.nativeElement.textContent).toContain('Manage Tickets');
    expect(fixture.nativeElement.textContent).toContain('Manage Historical Tickets');

    fixture.componentInstance.navigateTo('tickets');
    fixture.componentInstance.changeUserRole('Support Agent');
    fixture.detectChanges();
    expect(fixture.componentInstance.activePage()).toBe('search');
    expect(fixture.nativeElement.textContent).not.toContain('Manage Tickets');
  });

  it('should explain when no resolved tickets are available and disable search', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const searchButton = compiled.querySelector('button.btn-primary') as HTMLButtonElement;
    expect(compiled.textContent).toContain('No resolved tickets are available for search yet');
    expect(searchButton.disabled).toBe(true);
  });

  it('should enable search when historical tickets are available', async () => {
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 1, resolvedCount: 1 }),
        searchTickets: () => of({ tickets: [], matchStatus: 'no_good_match' }),
        loadHistoricalTickets: () => of({}),
        removeHistoricalTickets: () => of({})
      }
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const searchButton = fixture.nativeElement.querySelector('button.btn-primary') as HTMLButtonElement;
    expect(searchButton.disabled).toBe(false);
  });

  it('keeps the results heading outside the independently scrollable results list', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.tickets.set([{
      ticket_id: 'T-1',
      category: 'billing',
      subject: 'Invoice mismatch',
      description: 'Invoice amount differs',
      resolution_notes: 'Corrected invoice total',
      tags: [],
      created_at: '2025-01-15',
      status: 'resolved'
    }]);
    fixture.componentInstance.keyword = 'invoice';
    fixture.detectChanges();

    const results = fixture.nativeElement.querySelector('.results-section') as HTMLElement;
    const heading = results.querySelector('h2');
    const list = results.querySelector('.tickets-list') as HTMLElement;

    expect(heading?.textContent).toContain('Results for "invoice"');
    expect(heading?.parentElement).toBe(results);
    expect(list.getAttribute('role')).toBe('region');
    expect(list.getAttribute('aria-label')).toBe('Search results');
    expect(list.querySelector('.ticket-card')).toBeTruthy();
  });

  it('should explain that a stop-word-only search needs more specific terms', async () => {
    const validationMessage =
      'Your search only contains common words that are ignored. Add specific terms such as a product, feature, or error message.';
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 1, resolvedCount: 1 }),
        searchTickets: () => throwError(() => new HttpErrorResponse({
          status: 400,
          error: { error: validationMessage }
        })),
        loadHistoricalTickets: () => of({}),
        removeHistoricalTickets: () => of({})
      }
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.keyword = 'the';

    fixture.componentInstance.searchTickets();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(validationMessage);
    expect(fixture.nativeElement.textContent).not.toContain('Please ensure the backend server is running');
    (fixture.nativeElement.querySelector('.dismissible-message .message-dismiss') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dismissible-message')).toBeNull();
  });

  it('should hide a no-match message while the user edits the search and show it after searching again', async () => {
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 1, resolvedCount: 1 }),
        searchTickets: () => of({ tickets: [], matchStatus: 'no_good_match' }),
        loadHistoricalTickets: () => of({}),
        removeHistoricalTickets: () => of({})
      }
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.keyword = 'invoice';
    fixture.componentInstance.searchPerformed.set(true);
    fixture.componentInstance.matchStatus.set('no_good_match');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.no-results')).toBeTruthy();

    const input = fixture.nativeElement.querySelector('.search-input') as HTMLInputElement;
    input.value = 'invoice paid';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.no-results')).toBeNull();

    (fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.no-results')).toBeTruthy();
  });

  it('should show load success and record counts inline', async () => {
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 2, resolvedCount: 2 }),
        searchTickets: () => of({ tickets: [], matchStatus: 'no_good_match' }),
        loadHistoricalTickets: () => of({
          message: 'Tickets loaded successfully',
          total: 3,
          inserted: 2,
          skipped: 1,
          invalid: 0,
          duplicates: 1,
          failed: 0
        }),
        removeHistoricalTickets: () => of({})
      }
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.changeUserRole('Admin');
    fixture.componentInstance.navigateTo('historical');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.historical-actions .btn-load') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tickets loaded successfully');
    expect(fixture.nativeElement.textContent).toContain('Total: 3; inserted: 2; skipped: 1');
    expect(fixture.nativeElement.querySelector('[role="status"].success-message')).toBeTruthy();

    const dismissButton = fixture.nativeElement.querySelector('.historical-message .message-dismiss') as HTMLButtonElement;
    dismissButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success-message')).toBeNull();

    fixture.componentInstance.loadTickets();
    fixture.detectChanges();
    fixture.componentInstance.navigateTo('search');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Tickets loaded successfully');
    expect(fixture.nativeElement.querySelector('.success-message')).toBeNull();
  });

  it('automatically dismisses historical operation feedback after five seconds', async () => {
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 2, resolvedCount: 2 }),
        searchTickets: () => of({ tickets: [], matchStatus: 'no_good_match' }),
        loadHistoricalTickets: () => of({
          message: 'Tickets loaded successfully',
          total: 2,
          inserted: 2,
          skipped: 0,
          invalid: 0,
          duplicates: 0,
          failed: 0
        }),
        removeHistoricalTickets: () => of({})
      }
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.changeUserRole('Admin');
    fixture.componentInstance.navigateTo('historical');
    fixture.detectChanges();

    vi.useFakeTimers();
    try {
      fixture.componentInstance.loadTickets();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.success-message')).toBeTruthy();

      vi.advanceTimersByTime(4999);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.success-message')).toBeTruthy();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.success-message')).toBeNull();
    } finally {
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('should ask for confirmation before deleting historical tickets', async () => {
    let deleteCalls = 0;
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 0, resolvedCount: 0 }),
        searchTickets: () => of({ tickets: [], matchStatus: 'no_good_match' }),
        loadHistoricalTickets: () => of({}),
        removeHistoricalTickets: () => {
          deleteCalls++;
          return of({
            message: 'Historical tickets deleted successfully',
            total: 4
          });
        }
      }
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.changeUserRole('Admin');
    fixture.componentInstance.navigateTo('historical');
    fixture.componentInstance.historicalTicketCount.set(4);
    fixture.componentInstance.requestRemoveTickets();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Delete all 4 historical tickets');
    expect(deleteCalls).toBe(0);

    fixture.componentInstance.confirmRemoveTickets();
    fixture.detectChanges();

    expect(deleteCalls).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Historical tickets deleted successfully');
    expect(fixture.nativeElement.textContent).toContain('(4 tickets removed)');
    expect(fixture.nativeElement.querySelector('[role="status"].success-message')).toBeTruthy();
  });

  it('should keep load and remove historical ticket actions available on the simplified page', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.changeUserRole('Admin');
    fixture.componentInstance.navigateTo('historical');
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const loadButton = Array.from(buttons)
      .find(button => button.textContent?.includes('Load Tickets from JSON')) as HTMLButtonElement;
    const removeButton = Array.from(buttons)
      .find(button => button.textContent?.includes('Remove Historical Tickets')) as HTMLButtonElement;

    expect(loadButton).toBeTruthy();
    expect(loadButton.disabled).toBe(false);
    expect(removeButton).toBeTruthy();
    expect(removeButton.disabled).toBe(true);
    expect(getComputedStyle(removeButton).backgroundColor).toBe('rgb(220, 38, 38)');
    expect(fixture.nativeElement.textContent).toContain('No historical tickets yet');
  });

  it('should show all tickets in management but disable search when none are resolved', async () => {
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 3, resolvedCount: 0 }),
        searchTickets: () => of({ tickets: [], matchStatus: 'no_good_match' }),
        loadHistoricalTickets: () => of({}),
        removeHistoricalTickets: () => of({})
      }
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance.changeUserRole('Admin');
    fixture.componentInstance.navigateTo('historical');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('3 tickets');
    expect(fixture.nativeElement.textContent).toContain('All statuses');

    fixture.componentInstance.navigateTo('search');
    fixture.detectChanges();
    const searchButton = fixture.nativeElement.querySelector('button.btn-primary') as HTMLButtonElement;
    expect(searchButton.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No resolved tickets are available for search yet');
    expect(fixture.nativeElement.textContent).not.toContain('No historical tickets are available yet');
  });

  it('should cancel deletion without calling the delete API', async () => {
    let deleteCalls = 0;
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 2, resolvedCount: 2 }),
        searchTickets: () => of({ tickets: [], matchStatus: 'no_good_match' }),
        loadHistoricalTickets: () => of({}),
        removeHistoricalTickets: () => {
          deleteCalls++;
          return of({ message: 'Deleted', total: 2 });
        }
      }
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.changeUserRole('Admin');
    fixture.componentInstance.navigateTo('historical');
    fixture.componentInstance.requestRemoveTickets();
    fixture.detectChanges();
    fixture.componentInstance.cancelRemoveTickets();
    fixture.detectChanges();

    expect(deleteCalls).toBe(0);
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
  });

});
