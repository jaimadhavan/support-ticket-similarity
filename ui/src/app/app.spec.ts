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
            getHistoricalTicketAvailability: () => of({ count: 0 }),
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

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Support Ticket Similarity Search');
  });

  it('should explain when no historical tickets are available and disable search', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const searchButton = compiled.querySelector('button.btn-primary') as HTMLButtonElement;
    expect(compiled.textContent).toContain('No historical tickets are available yet');
    expect(searchButton.disabled).toBe(true);
  });

  it('should enable search when historical tickets are available', async () => {
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 1 }),
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

  it('should explain that a stop-word-only search needs more specific terms', async () => {
    const validationMessage =
      'Your search only contains common words that are ignored. Add specific terms such as a product, feature, or error message.';
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 1 }),
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
  });

  it('should show load success and record counts inline', async () => {
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 2 }),
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

    fixture.componentInstance.loadTickets();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tickets loaded successfully');
    expect(fixture.nativeElement.textContent).toContain('Total: 3; inserted: 2; skipped: 1');
    expect(fixture.nativeElement.querySelector('[role="status"].success-message')).toBeTruthy();
  });

  it('should ask for confirmation before deleting historical tickets', async () => {
    let deleteCalls = 0;
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 0 }),
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

  it('should cancel deletion without calling the delete API', async () => {
    let deleteCalls = 0;
    TestBed.overrideProvider(TicketService, {
      useValue: {
        getHistoricalTicketAvailability: () => of({ count: 2 }),
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

    fixture.componentInstance.requestRemoveTickets();
    fixture.detectChanges();
    fixture.componentInstance.cancelRemoveTickets();
    fixture.detectChanges();

    expect(deleteCalls).toBe(0);
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('should collapse historical ticket management when its Cancel button is clicked', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const section = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    section.open = true;
    fixture.detectChanges();

    const cancelButton = fixture.nativeElement.querySelector('.btn-manage-cancel') as HTMLButtonElement;
    cancelButton.click();
    fixture.detectChanges();

    expect(section.open).toBe(false);
    expect(fixture.componentInstance.removeConfirmationOpen()).toBe(false);
  });
});
