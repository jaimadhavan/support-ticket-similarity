import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TicketService } from '../../services/ticket.service';
import { SearchUsagePageComponent } from './search-usage-page.component';

describe('SearchUsagePageComponent', () => {
  it('shows search usage metrics and matched ticket IDs', async () => {
    const getSearchUsage = vi.fn(() => of({
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      categoryId: null,
      summary: {
        totalSearches: 2,
        successfulMatches: 1,
        noMatchSearches: 1,
        totalMatchedTickets: 2,
        categoriesCreated: 1,
        ticketsCreated: 3
      },
      page: 1,
      pageSize: 25,
      pageCount: 1,
      detailCount: 2,
      ticketsByCategory: [{
        categoryId: 2,
        category: 'Billing',
        categoryCreatedAt: '2026-10-01T10:00:00.000Z',
        ticketCount: 3,
        tickets: [{
          ticketId: 'T-1303',
          subject: 'Duplicate billing charge',
          status: 'resolved',
          createdAt: '2026-10-21T10:00:00.000Z'
        }]
      }],
      searches: [{
        id: '8',
        searchText: 'duplicate invoice charge',
        searchedAt: '2026-10-21T10:00:00.000Z',
        matchFound: true,
        matchCount: 2,
        matchingTickets: [
          {
            ticketId: 'T-1303',
            categoryId: 2,
            category: 'Billing',
            subject: 'Duplicate billing charge',
            status: 'resolved',
            ticketCreatedAt: '2026-10-20'
          },
          {
            ticketId: 'T-1304',
            categoryId: 2,
            category: 'Billing',
            subject: 'Second duplicate charge',
            status: 'resolved',
            ticketCreatedAt: '2026-10-19'
          }
        ]
      }]
    }));
    await TestBed.configureTestingModule({
      imports: [SearchUsagePageComponent],
      providers: [{
        provide: TicketService,
        useValue: {
          getCategories: () => of({ categories: [{ id: 2, name: 'Billing', is_active: true }] }),
          getSearchUsage
        }
      }]
    }).compileComponents();

    const fixture = TestBed.createComponent(SearchUsagePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getSearchUsage).toHaveBeenCalledWith(
      fixture.componentInstance.startDate,
      fixture.componentInstance.endDate,
      null,
      1
    );
    expect(fixture.nativeElement.textContent).toContain('Total searches');
    expect(fixture.nativeElement.textContent).toContain('2');
    expect(fixture.nativeElement.textContent).toContain('50%');
    expect(fixture.nativeElement.textContent).toContain('duplicate invoice charge');
    expect(fixture.nativeElement.textContent).toContain('Tickets created');
    expect(fixture.nativeElement.textContent).toContain('Duplicate billing charge');
    expect(fixture.nativeElement.textContent).toContain('View 3 tickets');
    expect(fixture.nativeElement.textContent).toContain('System Analysis');
    expect(fixture.nativeElement.textContent).toContain('Category Created');
    expect(fixture.nativeElement.textContent).toContain('Ticket Details');
    expect(fixture.nativeElement.textContent).not.toContain('Matched ticket IDs');
    expect(fixture.nativeElement.querySelector('th')?.textContent).not.toContain('Matched-ticket category');
    const matchSummary = fixture.nativeElement.querySelector('.match-details summary') as HTMLElement;
    matchSummary.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('T-1303');
    expect(fixture.nativeElement.textContent).toContain('Second duplicate charge');
    expect(fixture.nativeElement.textContent).toContain('resolved');
    expect(fixture.nativeElement.textContent).toContain('Oct 20, 2026');
    expect((fixture.nativeElement.querySelector('.match-details') as HTMLDetailsElement).open).toBe(true);
    expect(fixture.componentInstance.preset).toBe('today');
    expect(fixture.componentInstance.startDate).toBe(fixture.componentInstance.endDate);
  });

  it('applies the selected matched-ticket category to analytics requests', async () => {
    const getSearchUsage = vi.fn(() => of({
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      categoryId: 2,
      summary: {
        totalSearches: 1,
        successfulMatches: 1,
        noMatchSearches: 0,
        totalMatchedTickets: 1,
        categoriesCreated: 0,
        ticketsCreated: 1
      },
      page: 1,
      pageSize: 25,
      pageCount: 1,
      detailCount: 1,
      ticketsByCategory: [],
      searches: []
    }));
    await TestBed.configureTestingModule({
      imports: [SearchUsagePageComponent],
      providers: [{
        provide: TicketService,
        useValue: {
          getCategories: () => of({ categories: [] }),
          getSearchUsage
        }
      }]
    }).compileComponents();

    const fixture = TestBed.createComponent(SearchUsagePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.categoryId = 2;
    fixture.componentInstance.onCategoryChange();
    await fixture.whenStable();

    expect(getSearchUsage).toHaveBeenLastCalledWith(
      fixture.componentInstance.startDate,
      fixture.componentInstance.endDate,
      2,
      1
    );
  });

  it('clears stale metrics when the selected date range is invalid', async () => {
    await TestBed.configureTestingModule({
      imports: [SearchUsagePageComponent],
      providers: [{
        provide: TicketService,
        useValue: {
          getCategories: () => of({ categories: [] }),
          getSearchUsage: () => of({
            startDate: '2026-10-01',
            endDate: '2026-10-30',
            categoryId: null,
            summary: {
              totalSearches: 1,
              successfulMatches: 1,
              noMatchSearches: 0,
              totalMatchedTickets: 1,
              categoriesCreated: 0,
              ticketsCreated: 1
            },
            page: 1,
            pageSize: 25,
            pageCount: 1,
            detailCount: 1,
            ticketsByCategory: [],
            searches: []
          })
        }
      }]
    }).compileComponents();

    const fixture = TestBed.createComponent(SearchUsagePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.startDate = '2026-10-31';
    fixture.componentInstance.endDate = '2026-10-30';
    fixture.componentInstance.onDateChange();

    expect(fixture.componentInstance.usage()).toBeNull();
    expect(fixture.componentInstance.summary().totalSearches).toBe(0);
    expect(fixture.componentInstance.error()).toContain('Start date must be on or before end date');
  });

  it('explains that the backend must be restarted when the usage route is missing', async () => {
    await TestBed.configureTestingModule({
      imports: [SearchUsagePageComponent],
      providers: [{
        provide: TicketService,
        useValue: {
          getCategories: () => of({ categories: [] }),
          getSearchUsage: () => throwError(() => ({
            status: 404,
            error: { error: 'Route not found' }
          }))
        }
      }]
    }).compileComponents();

    const fixture = TestBed.createComponent(SearchUsagePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.error()).toContain('Restart the backend');
  });
});
