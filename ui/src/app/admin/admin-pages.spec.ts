import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CategoriesPageComponent } from '../pages/categories/categories-page.component';
import { TicketsPageComponent } from '../pages/tickets/tickets-page.component';
import { TicketService } from '../services/ticket.service';

describe('Admin management pages', () => {
  let service: {
    getCategories: ReturnType<typeof vi.fn>;
    addCategory: ReturnType<typeof vi.fn>;
    updateCategory: ReturnType<typeof vi.fn>;
    deactivateCategory: ReturnType<typeof vi.fn>;
    getManagedTickets: ReturnType<typeof vi.fn>;
    addManagedTicket: ReturnType<typeof vi.fn>;
    updateManagedTicket: ReturnType<typeof vi.fn>;
    deleteManagedTicket: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      getCategories: vi.fn(() => of({ categories: [] })),
      addCategory: vi.fn(() => of({})),
      updateCategory: vi.fn(() => of({})),
      deactivateCategory: vi.fn(() => of({
        message: 'Category deactivated successfully',
        category: { id: 1, name: 'billing', is_active: false }
      })),
      getManagedTickets: vi.fn(() => of({ tickets: [] })),
      addManagedTicket: vi.fn(() => of({})),
      updateManagedTicket: vi.fn(() => of({})),
      deleteManagedTicket: vi.fn(() => of({ message: 'Ticket deleted successfully', ticket_id: 'T-1' }))
    };
  });

  it('soft-deletes a category and reports that existing tickets retain it', async () => {
    service.getCategories.mockReturnValue(of({
      categories: [{ id: 1, name: 'billing', is_active: true }]
    }));
    await TestBed.configureTestingModule({
      imports: [CategoriesPageComponent],
      providers: [{ provide: TicketService, useValue: service }]
    }).compileComponents();

    const fixture = TestBed.createComponent(CategoriesPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('billing');
    expect(fixture.nativeElement.textContent).toContain('Active');
    fixture.componentInstance.deactivateCategory({ id: 1, name: 'billing', is_active: true });

    expect(service.deactivateCategory).toHaveBeenCalledWith(1);
    expect(fixture.componentInstance.message()).toContain('Existing tickets keep this category');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.message-dismiss') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success-message')).toBeNull();
  });

  it('shows all category content in document flow and loads names into the editable field', async () => {
    service.getCategories.mockReturnValue(of({
      categories: [{ id: 9, name: 'reporting', is_active: true }]
    }));
    await TestBed.configureTestingModule({
      imports: [CategoriesPageComponent],
      providers: [{ provide: TicketService, useValue: service }]
    }).compileComponents();

    const fixture = TestBed.createComponent(CategoriesPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.admin-list-content') as HTMLElement;
    const heading = fixture.nativeElement.querySelector('.page-heading') as HTMLElement;
    const formTab = fixture.nativeElement.querySelector('#category-form-tab') as HTMLButtonElement;
    const listTab = fixture.nativeElement.querySelector('#category-list-tab') as HTMLButtonElement;
    expect(heading.parentElement).toBe(fixture.nativeElement.querySelector('.admin-page'));
    expect(content.contains(heading)).toBe(false);
    expect(formTab.getAttribute('aria-selected')).toBe('false');
    expect(listTab.getAttribute('aria-selected')).toBe('true');
    expect(fixture.nativeElement.querySelector('#category-form-panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('#category-list-panel')).not.toBeNull();
    expect(getComputedStyle(content).overflowY).toBe('visible');
    expect(getComputedStyle(content).flexGrow).toBe('0');
    expect(fixture.nativeElement.textContent).toContain('Add Category');
    formTab.click();
    fixture.detectChanges();
    expect(formTab.getAttribute('aria-selected')).toBe('true');
    expect(listTab.getAttribute('aria-selected')).toBe('false');
    expect(fixture.nativeElement.querySelector('#category-form-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#category-list-panel')).toBeNull();
    listTab.click();
    fixture.detectChanges();
    expect(formTab.getAttribute('aria-selected')).toBe('false');
    expect(listTab.getAttribute('aria-selected')).toBe('true');
    const editButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.trim() === 'Edit') as HTMLButtonElement;
    editButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#category-name') as HTMLInputElement;
    expect(input.value).toBe('reporting');
    expect(fixture.componentInstance.categoryName).toBe('reporting');
    expect(document.activeElement).toBe(input);
    expect(formTab.getAttribute('aria-selected')).toBe('true');
    expect(listTab.getAttribute('aria-selected')).toBe('false');
    expect(fixture.nativeElement.textContent).toContain('Edit Category');
    expect(fixture.nativeElement.textContent).toContain('Save Category');

    const cancelButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.trim() === 'Cancel Edit') as HTMLButtonElement;
    cancelButton.click();
    fixture.detectChanges();
    expect(formTab.getAttribute('aria-selected')).toBe('false');
    expect(listTab.getAttribute('aria-selected')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Add Category');
  });

  it('returns to the Category List tab after saving an edit', async () => {
    service.getCategories.mockReturnValue(of({
      categories: [{ id: 9, name: 'reporting', is_active: true }]
    }));
    await TestBed.configureTestingModule({
      imports: [CategoriesPageComponent],
      providers: [{ provide: TicketService, useValue: service }]
    }).compileComponents();

    const fixture = TestBed.createComponent(CategoriesPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const category = fixture.componentInstance.categories()[0];

    fixture.componentInstance.editCategory(category);
    fixture.detectChanges();
    fixture.componentInstance.categoryName = 'reports';
    fixture.componentInstance.saveCategory();
    fixture.detectChanges();

    expect(service.updateCategory).toHaveBeenCalledWith(9, 'reports');
    expect(fixture.componentInstance.activeTab).toBe('list');
    expect(fixture.nativeElement.textContent).toContain('Add Category');
    expect(fixture.componentInstance.editingId).toBeNull();
  });

  it('renders the Ticket List tab by default and switches to the Add Ticket tab', async () => {
    await TestBed.configureTestingModule({
      imports: [TicketsPageComponent],
      providers: [{ provide: TicketService, useValue: service }]
    }).compileComponents();

    const fixture = TestBed.createComponent(TicketsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const formTab = fixture.nativeElement.querySelector('#ticket-form-tab') as HTMLButtonElement;
    const listTab = fixture.nativeElement.querySelector('#ticket-list-tab') as HTMLButtonElement;
    expect(formTab.getAttribute('aria-selected')).toBe('false');
    expect(listTab.getAttribute('aria-selected')).toBe('true');
    expect(fixture.nativeElement.querySelector('#ticket-form-panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('#ticket-list-panel')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Add Ticket');

    formTab.click();
    fixture.detectChanges();
    expect(formTab.getAttribute('aria-selected')).toBe('true');
    expect(listTab.getAttribute('aria-selected')).toBe('false');
    expect(fixture.nativeElement.querySelector('#ticket-form-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#ticket-list-panel')).toBeNull();

    listTab.click();
    fixture.detectChanges();
    expect(formTab.getAttribute('aria-selected')).toBe('false');
    expect(listTab.getAttribute('aria-selected')).toBe('true');

    listTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(formTab.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(formTab);
  });

  it('adds a ticket with its selected category and status', async () => {
    service.getCategories.mockReturnValue(of({
      categories: [{ id: 7, name: 'billing', is_active: true }]
    }));
    await TestBed.configureTestingModule({
      imports: [TicketsPageComponent],
      providers: [{ provide: TicketService, useValue: service }]
    }).compileComponents();

    const fixture = TestBed.createComponent(TicketsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('#ticket-form-tab') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.categoryOptions).toEqual([
      { id: 7, name: 'billing', is_active: true }
    ]);
    expect(fixture.nativeElement.querySelector('select[name="category"]')?.textContent).toContain('billing');
    fixture.componentInstance.form = {
      ticket_id: 'T-2',
      category_id: 7,
      subject: 'Invoice mismatch',
      description: 'Invoice total is incorrect',
      resolution_notes: 'Corrected the invoice',
      tags: 'invoice, billing',
      created_at: '2025-01-15',
      status: 'inprogress'
    };

    fixture.componentInstance.saveTicket();

    expect(service.addManagedTicket).toHaveBeenCalledWith({
      ticket_id: 'T-2',
      category_id: 7,
      subject: 'Invoice mismatch',
      description: 'Invoice total is incorrect',
      resolution_notes: 'Corrected the invoice',
      tags: ['invoice', 'billing'],
      created_at: '2025-01-15',
      status: 'inprogress'
    });
    expect(fixture.componentInstance.message()).toBe('Ticket added successfully.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"].success-message')?.textContent)
      .toContain('Ticket added successfully.');
    (fixture.nativeElement.querySelector('.message-dismiss') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success-message')).toBeNull();
  });

  it('shows a success message after editing a ticket', async () => {
    service.getCategories.mockReturnValue(of({
      categories: [{ id: 7, name: 'billing', is_active: true }]
    }));
    const existingTicket = {
      ticket_id: 'T-8',
      category_id: 7,
      category: 'billing',
      subject: 'Invoice mismatch',
      description: 'Invoice total is incorrect',
      resolution_notes: 'Corrected the invoice',
      tags: ['invoice'],
      created_at: '2025-01-15',
      status: 'resolved' as const
    };
    service.getManagedTickets.mockReturnValue(of({ tickets: [existingTicket] }));
    await TestBed.configureTestingModule({
      imports: [TicketsPageComponent],
      providers: [{ provide: TicketService, useValue: service }]
    }).compileComponents();

    const fixture = TestBed.createComponent(TicketsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const content = fixture.nativeElement.querySelector('.admin-list-content') as HTMLElement;
    const heading = fixture.nativeElement.querySelector('.page-heading') as HTMLElement;
    expect(heading.parentElement).toBe(fixture.nativeElement.querySelector('.admin-page'));
    expect(content.contains(heading)).toBe(false);
    expect(getComputedStyle(content).overflowY).toBe('visible');
    expect(fixture.componentInstance.activeTab).toBe('list');
    fixture.componentInstance.editTicket(existingTicket);
    fixture.componentInstance.form.subject = 'Updated invoice issue';

    fixture.componentInstance.saveTicket();
    fixture.detectChanges();

    expect(service.updateManagedTicket).toHaveBeenCalledWith('T-8', expect.objectContaining({
      subject: 'Updated invoice issue'
    }));
    expect(fixture.nativeElement.querySelector('[role="status"].success-message')?.textContent)
      .toContain('Ticket updated successfully.');
    expect(fixture.componentInstance.activeTab).toBe('list');
    expect(fixture.nativeElement.textContent).toContain('Add Ticket');
    expect(fixture.componentInstance.editingTicketId).toBeNull();
  });

  it('returns to the Ticket List tab when edit is cancelled', async () => {
    const existingTicket = {
      ticket_id: 'T-9',
      category_id: 7,
      category: 'billing',
      subject: 'Invoice mismatch',
      description: 'Invoice total is incorrect',
      resolution_notes: 'Corrected the invoice',
      tags: ['invoice'],
      created_at: '2025-01-15',
      status: 'resolved' as const
    };
    service.getCategories.mockReturnValue(of({
      categories: [{ id: 7, name: 'billing', is_active: true }]
    }));
    service.getManagedTickets.mockReturnValue(of({ tickets: [existingTicket] }));
    await TestBed.configureTestingModule({
      imports: [TicketsPageComponent],
      providers: [{ provide: TicketService, useValue: service }]
    }).compileComponents();

    const fixture = TestBed.createComponent(TicketsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.componentInstance.editTicket(existingTicket);
    fixture.detectChanges();

    fixture.componentInstance.cancelEdit();
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTab).toBe('list');
    expect(fixture.nativeElement.textContent).toContain('Add Ticket');
    expect(fixture.componentInstance.editingTicketId).toBeNull();
    expect(fixture.componentInstance.form.ticket_id).toBe('');
  });

  it('keeps the ticket heading fixed and retains an inactive category while editing', async () => {
    service.getCategories.mockReturnValue(of({
      categories: [{ id: 1, name: 'billing', is_active: false }]
    }));
    service.getManagedTickets.mockReturnValue(of({
      tickets: [{
        ticket_id: 'T-3',
        category_id: 1,
        category: 'billing',
        subject: 'Invoice mismatch',
        description: 'Invoice total is incorrect',
        resolution_notes: 'Corrected the invoice',
        tags: [],
        created_at: '2025-01-15',
        status: 'resolved'
      }]
    }));
    await TestBed.configureTestingModule({
      imports: [TicketsPageComponent],
      providers: [{ provide: TicketService, useValue: service }]
    }).compileComponents();

    const fixture = TestBed.createComponent(TicketsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const content = fixture.nativeElement.querySelector('.admin-list-content') as HTMLElement;
    fixture.componentInstance.editTicket(fixture.componentInstance.tickets()[0]);
    fixture.detectChanges();

    const ticketIdInput = fixture.nativeElement.querySelector('input[name="ticketId"]') as HTMLInputElement;
    expect(fixture.componentInstance.categoryOptions).toEqual([
      { id: 1, name: 'billing', is_active: false }
    ]);
    expect(getComputedStyle(content).overflowY).toBe('visible');
    expect(document.activeElement).toBe(ticketIdInput);
    expect(fixture.componentInstance.activeTab).toBe('form');
    expect(fixture.nativeElement.textContent).toContain('Edit Ticket');
    expect(fixture.nativeElement.textContent).toContain('In Progress');
    expect(fixture.nativeElement.textContent).toContain('Resolved');
  });

  it('paginates ticket records and shows full details on request', async () => {
    const tickets = Array.from({ length: 21 }, (_, index) => ({
      ticket_id: `T-${index + 1}`,
      category_id: 1,
      category: 'billing',
      subject: `Ticket subject ${index + 1}`,
      description: `Full description ${index + 1}`,
      resolution_notes: `Resolution detail ${index + 1}`,
      tags: ['invoice', 'support'],
      created_at: '2025-01-15',
      status: 'resolved' as const
    }));
    service.getManagedTickets.mockReturnValue(of({ tickets }));
    service.getCategories.mockReturnValue(of({
      categories: [{ id: 1, name: 'billing', is_active: true }]
    }));
    await TestBed.configureTestingModule({
      imports: [TicketsPageComponent],
      providers: [{ provide: TicketService, useValue: service }]
    }).compileComponents();

    const fixture = TestBed.createComponent(TicketsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.ticket-list-row').length).toBe(10);
    const pagination = fixture.nativeElement.querySelector('.ticket-pagination') as HTMLElement;
    const listPanel = fixture.nativeElement.querySelector('#ticket-list-panel') as HTMLElement;
    const listContent = fixture.nativeElement.querySelector('.admin-list-content') as HTMLElement;
    expect(pagination.parentElement).toBe(listPanel);
    expect(fixture.componentInstance.activeTab).toBe('list');
    expect(listContent.contains(pagination)).toBe(false);
    expect(pagination.querySelector('.page-size-control')).toBeTruthy();
    expect(pagination.firstElementChild?.classList.contains('page-size-control')).toBe(true);
    expect(pagination.querySelector('.ticket-pagination-controls')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.admin-list-toolbar')).toBeNull();
    expect(getComputedStyle(listContent).overflowY).toBe('visible');
    expect(getComputedStyle(listContent).minHeight).toBe('auto');
    expect(getComputedStyle(listPanel).display).toBe('flex');
    expect(getComputedStyle(listPanel).flexGrow).toBe('0');
    expect(getComputedStyle(listContent).flexGrow).toBe('0');
    fixture.componentInstance.changePage(2);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.ticket-list-row').length).toBe(10);
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 3');

    fixture.componentInstance.toggleTicketDetails('T-11');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Full description 11');
    expect(fixture.nativeElement.textContent).toContain('Resolution detail 11');

    fixture.componentInstance.setPageSize(20);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentPage()).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.ticket-list-row').length).toBe(20);
  });

  it('allows adding an in-progress ticket without resolution notes', async () => {
    service.getCategories.mockReturnValue(of({
      categories: [{ id: 7, name: 'billing', is_active: true }]
    }));
    await TestBed.configureTestingModule({
      imports: [TicketsPageComponent],
      providers: [{ provide: TicketService, useValue: service }]
    }).compileComponents();

    const fixture = TestBed.createComponent(TicketsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.form = {
      ticket_id: 'T-4',
      category_id: 7,
      subject: 'New invoice issue',
      description: 'Invoice needs review',
      resolution_notes: '',
      tags: '',
      created_at: '2025-01-15',
      status: 'inprogress'
    };

    fixture.componentInstance.saveTicket();

    expect(service.addManagedTicket).toHaveBeenCalledWith(expect.objectContaining({
      ticket_id: 'T-4',
      category_id: 7,
      resolution_notes: '',
      status: 'inprogress'
    }));
  });
});
