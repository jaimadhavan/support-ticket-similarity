import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category, TicketService } from '../services/ticket.service';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories-page.component.html',
  styleUrl: './admin-pages.component.css'
})
export class CategoriesPageComponent implements OnInit {
  categories = signal<Category[]>([]);
  loading = signal(false);
  error = signal('');
  message = signal('');
  categoryName = '';
  editingId: number | null = null;
  confirmingDeleteId: number | null = null;

  constructor(private ticketService: TicketService) {}

  ngOnInit() {
    this.loadCategories();
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
        this.error.set(error.error?.error || 'Unable to load categories.');
        this.loading.set(false);
      }
    });
  }

  editCategory(category: Category, page?: HTMLElement, accordion?: HTMLDetailsElement, nameInput?: HTMLInputElement) {
    this.editingId = category.id;
    this.categoryName = category.name;
    this.message.set('');
    this.error.set('');
    if (accordion) {
      accordion.open = true;
    }
    if (page) {
      page.scrollTop = 0;
    }
    nameInput?.focus();
  }

  cancelEdit(accordion?: HTMLDetailsElement) {
    this.editingId = null;
    this.categoryName = '';
    if (accordion) {
      accordion.open = false;
    }
  }

  saveCategory(accordion?: HTMLDetailsElement) {
    const name = this.categoryName.trim();
    if (!name) {
      this.error.set('Enter a category name.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    const request = this.editingId === null
      ? this.ticketService.addCategory(name)
      : this.ticketService.updateCategory(this.editingId, name);
    request.subscribe({
      next: () => {
        this.message.set(this.editingId === null ? 'Category added.' : 'Category updated.');
        this.cancelEdit(accordion);
        this.loadCategories();
      },
      error: error => {
        console.error('Save category error:', error);
        this.error.set(error.error?.error || 'Unable to save category.');
        this.loading.set(false);
      }
    });
  }

  deactivateCategory(category: Category) {
    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    this.ticketService.deactivateCategory(category.id).subscribe({
      next: response => {
        this.message.set(`${response.message}. Existing tickets keep this category.`);
        this.confirmingDeleteId = null;
        this.loadCategories();
      },
      error: error => {
        console.error('Deactivate category error:', error);
        this.error.set(error.error?.error || 'Unable to delete category.');
        this.loading.set(false);
      }
    });
  }
}
