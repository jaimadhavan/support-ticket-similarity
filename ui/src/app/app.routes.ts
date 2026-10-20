import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'search' },
  { path: 'search', children: [] },
  { path: 'categories', children: [] },
  { path: 'tickets', children: [] },
  { path: 'historical', children: [] },
  { path: '**', redirectTo: 'search' }
];
