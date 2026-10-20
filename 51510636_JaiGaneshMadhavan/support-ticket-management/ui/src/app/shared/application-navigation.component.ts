import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppPage, UserRole } from '../app.models';

@Component({
  selector: 'app-application-navigation',
  standalone: true,
  templateUrl: './application-navigation.component.html',
  styleUrl: './application-navigation.component.css'
})
export class ApplicationNavigationComponent {
  @Input({ required: true }) activePage!: AppPage;
  @Input({ required: true }) userRole!: UserRole;
  @Output() pageChange = new EventEmitter<AppPage>();
}
