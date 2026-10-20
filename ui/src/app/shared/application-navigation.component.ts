import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppPage, UserRole } from '../app.models';

@Component({
  selector: 'app-application-navigation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './application-navigation.component.html',
  styleUrl: './application-navigation.component.css'
})
export class ApplicationNavigationComponent {
  @Input({ required: true }) activePage!: AppPage;
  @Input({ required: true }) userRole!: UserRole;
}
