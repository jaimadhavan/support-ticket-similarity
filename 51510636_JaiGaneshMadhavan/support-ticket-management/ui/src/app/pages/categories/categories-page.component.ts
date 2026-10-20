import { Component, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category, TicketService } from '../../services/ticket.service';

type AdminTab = 'form' | 'list';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories-page.component.html',
  styleUrl: '../shared/admin-pages.component.css'
})
export class CategoriesPageComponent implements OnDestroy, OnInit {
  categories = signal<Category[]>([]);
  loading = signal(false);
  error = signal('');
  message = signal('');
  categoryName = '';
  editingId: number | null = null;
  confirmingDeleteId: number | null = null;
  activeTab: AdminTab = 'list';
  private focusCategoryNameOnRender = false;
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('categoryNameInput')
  set categoryNameInput(input: ElementRef<HTMLInputElement> | undefined) {
    if (input && this.focusCategoryNameOnRender) {
      this.focusCategoryNameOnRender = false;
      input.nativeElement.focus();
    }
  }

  constructor(private ticketService: TicketService) {}

  ngOnInit() {
    this.loadCategories();
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

  loadCategories() {
    this.loading.set(true);
    this.error.set('');
    this.ticketService.getCategories().subscribe({
      next: response => {
        this.categories.set(response.categories);
        this.loading.set(false);
      },
      error: error => {
        console.error('Category list error:', error);
        this.showFeedback('error', error.error?.error || 'Unable to load categories.');
        this.loading.set(false);
      }
    });
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

  editCategory(category: Category) {
    this.focusCategoryNameOnRender = true;
    this.activeTab = 'form';
    this.editingId = category.id;
    this.categoryName = category.name;
    this.clearFeedback();
  }

  cancelEdit() {
    this.editingId = null;
    this.categoryName = '';
    this.activeTab = 'list';
  }

  saveCategory() {
    const name = this.categoryName.trim();
    if (!name) {
      this.showFeedback('error', 'Enter a category name.');
      return;
    }

    this.loading.set(true);
    this.clearFeedback();
    const request = this.editingId === null
      ? this.ticketService.addCategory(name)
      : this.ticketService.updateCategory(this.editingId, name);
    request.subscribe({
      next: () => {
        this.showFeedback('success', this.editingId === null ? 'Category added.' : 'Category updated.');
        this.cancelEdit();
        this.loadCategories();
      },
      error: error => {
        console.error('Save category error:', error);
        this.showFeedback('error', error.error?.error || 'Unable to save category.');
        this.loading.set(false);
      }
    });
  }

  deactivateCategory(category: Category) {
    this.loading.set(true);
    this.clearFeedback();
    this.ticketService.deactivateCategory(category.id).subscribe({
      next: response => {
        this.showFeedback('success', `${response.message}. Existing tickets keep this category.`);
        this.confirmingDeleteId = null;
        this.loadCategories();
      },
      error: error => {
        console.error('Deactivate category error:', error);
        this.showFeedback('error', error.error?.error || 'Unable to delete category.');
        this.loading.set(false);
      }
    });
  }
}
