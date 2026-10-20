import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserRole } from '../app.models';

@Component({
  selector: 'app-application-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './application-header.component.html',
  styleUrl: './application-header.component.css'
})
export class ApplicationHeaderComponent {
  @Input({ required: true }) userRole!: UserRole;
  @Output() userRoleChange = new EventEmitter<UserRole>();
}
