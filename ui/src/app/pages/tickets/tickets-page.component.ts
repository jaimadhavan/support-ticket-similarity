import { Component, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category, ManagedTicket, TicketService, TicketStatus } from '../../services/ticket.service';

type TicketForm = Omit<ManagedTicket, 'tags' | 'status' | 'category' | 'category_id'> & {
  category_id: number | null;
  tags: string;
  status: TicketStatus;
};

type AdminTab = 'form' | 'list';

@Component({
  selector: 'app-tickets-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tickets-page.component.html',
  styleUrl: '../shared/admin-pages.component.css'
})
export class TicketsPageComponent implements OnDestroy, OnInit {
  tickets = signal<ManagedTicket[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(false);
  error = signal('');
  message = signal('');
  editingTicketId: string | null = null;
  confirmingDeleteId: string | null = null;
  expandedTicketId = signal<string | null>(null);
  currentPage = signal(1);
  pageSize = signal(10);
  form: TicketForm = createEmptyForm();
  activeTab: AdminTab = 'list';
  private focusTicketIdOnRender = false;
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('ticketIdInput')
  set ticketIdInput(input: ElementRef<HTMLInputElement> | undefined) {
    if (input && this.focusTicketIdOnRender) {
      this.focusTicketIdOnRender = false;
      input.nativeElement.focus();
    }
  }

  constructor(private ticketService: TicketService) {}

  ngOnInit() {
    this.refreshData();
  }

  ngOnDestroy() {
    this.clearFeedbackTimer();
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
    this.message.set('');
  }

  private showFeedback(type: 'error' | 'success', text: string) {
    this.clearFeedback();
    if (type === 'error') {
      this.error.set(text);
    } else {
      this.message.set(text);
    }
    this.feedbackTimer = setTimeout(() => this.clearFeedback(), 5000);
  }

  refreshData() {
    this.loading.set(true);
    this.error.set('');
    let pending = 2;
    const complete = () => {
      pending--;
      if (pending === 0) {
        this.loading.set(false);
      }
    };
    this.ticketService.getManagedTickets().subscribe({
      next: response => {
        this.tickets.set(response.tickets);
        this.currentPage.set(Math.min(this.currentPage(), this.totalPages));
        complete();
      },
      error: error => {
        console.error('Ticket list error:', error);
        this.showFeedback('error', error.error?.error || 'Unable to load tickets.');
        complete();
      }
    });
    this.ticketService.getCategories().subscribe({
      next: response => {
        this.categories.set(response.categories);
        complete();
      },
      error: error => {
        console.error('Category options error:', error);
        this.showFeedback('error', error.error?.error || 'Unable to load ticket categories.');
        complete();
      }
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.tickets().length / this.pageSize()));
  }

  get paginatedTickets(): ManagedTicket[] {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.tickets().slice(start, start + this.pageSize());
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  changePage(page: number) {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages));
  }

  toggleTicketDetails(ticketId: string) {
    this.expandedTicketId.set(this.expandedTicketId() === ticketId ? null : ticketId);
  }

  selectTab(tab: AdminTab) {
    this.activeTab = tab;
  }

  onTabKeydown(event: KeyboardEvent) {
    let nextTab: AdminTab;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      nextTab = this.activeTab === 'form' ? 'list' : 'form';
    } else if (event.key === 'End') {
      nextTab = 'list';
    } else if (event.key === 'Home') {
      nextTab = 'form';
    } else {
      return;
    }
    event.preventDefault();
    this.activeTab = nextTab;
    const nextButton = (event.currentTarget as HTMLElement).parentElement
      ?.querySelector<HTMLButtonElement>(`[data-admin-tab="${nextTab}"]`);
    nextButton?.focus();
  }

  get categoryOptions(): Category[] {
    const active = this.categories().filter(category => category.is_active);
    if (this.editingTicketId) {
      const existingCategoryId = this.tickets().find(ticket => ticket.ticket_id === this.editingTicketId)?.category_id;
      if (existingCategoryId && !active.some(category => category.id === existingCategoryId)) {
        const inactive = this.categories().find(category => category.id === existingCategoryId);
        if (inactive) {
          return [...active, inactive];
        }
      }
    }
    return active;
  }

  startAdd() {
    this.editingTicketId = null;
    this.form = createEmptyForm();
    this.clearFeedback();
    this.activeTab = 'list';
  }

  editTicket(ticket: ManagedTicket, content?: HTMLElement) {
    this.editingTicketId = ticket.ticket_id;
    this.focusTicketIdOnRender = true;
    this.activeTab = 'form';
    this.form = {
      ticket_id: ticket.ticket_id,
      category_id: ticket.category_id,
      subject: ticket.subject,
      description: ticket.description,
      resolution_notes: ticket.resolution_notes,
      status: ticket.status,
      created_at: ticket.created_at.slice(0, 10),
      tags: ticket.tags.join(', ')
    };
    this.clearFeedback();
    if (content) {
      content.scrollTop = 0;
    }
  }

  cancelEdit() {
    this.startAdd();
  }

  saveTicket() {
    if (this.form.category_id === null) {
      this.showFeedback('error', 'Select a category before saving the ticket.');
      return;
    }
    if (this.form.status === 'resolved' && !this.form.resolution_notes.trim()) {
      this.showFeedback('error', 'Add resolution notes before marking the ticket as resolved.');
      return;
    }

    const ticket: ManagedTicket = {
      category_id: this.form.category_id,
      ticket_id: this.form.ticket_id.trim(),
      status: this.form.status,
      created_at: this.form.created_at,
      subject: this.form.subject.trim(),
      description: this.form.description.trim(),
      resolution_notes: this.form.resolution_notes.trim(),
      tags: this.form.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };
    this.loading.set(true);
    this.clearFeedback();
    const request = this.editingTicketId
      ? this.ticketService.updateManagedTicket(this.editingTicketId, ticket)
      : this.ticketService.addManagedTicket(ticket);
    request.subscribe({
      next: () => {
        const successMessage = this.editingTicketId ? 'Ticket updated successfully.' : 'Ticket added successfully.';
        this.startAdd();
        this.showFeedback('success', successMessage);
        this.refreshData();
      },
      error: error => {
        console.error('Save ticket error:', error);
        this.showFeedback('error', error.error?.error || 'Unable to save ticket.');
        this.loading.set(false);
      }
    });
  }

  deleteTicket(ticket: ManagedTicket) {
    this.loading.set(true);
    this.clearFeedback();
    this.ticketService.deleteManagedTicket(ticket.ticket_id).subscribe({
      next: response => {
        this.showFeedback('success', `${response.message}: ${response.ticket_id}`);
        this.confirmingDeleteId = null;
        this.expandedTicketId.set(null);
        this.refreshData();
      },
      error: error => {
        console.error('Delete ticket error:', error);
        this.showFeedback('error', error.error?.error || 'Unable to delete ticket.');
        this.loading.set(false);
      }
    });
  }
}

function createEmptyForm(): TicketForm {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  return {
    ticket_id: '',
    category_id: null,
    subject: '',
    description: '',
    resolution_notes: '',
    tags: '',
    created_at: localDate,
    status: 'new'
  };
}
