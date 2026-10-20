import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-historical-page',
  standalone: true,
  templateUrl: './historical-page.component.html',
  styleUrl: './historical-page.component.css'
})
export class HistoricalPageComponent {
  @Input({ required: true }) historicalTicketCount!: number | null;
  @Input({ required: true }) availabilityLoading!: boolean;
  @Input({ required: true }) availabilityError!: string;
  @Input({ required: true }) loading!: boolean;
  @Input({ required: true }) removing!: boolean;
  @Input({ required: true }) removeConfirmationOpen!: boolean;
  @Input({ required: true }) error!: string;
  @Input({ required: true }) successMessage!: string;

  @Output() loadTickets = new EventEmitter<void>();
  @Output() requestRemoveTickets = new EventEmitter<void>();
  @Output() cancelRemoveTickets = new EventEmitter<void>();
  @Output() confirmRemoveTickets = new EventEmitter<void>();
  @Output() refreshAvailability = new EventEmitter<void>();
  @Output() dismissFeedback = new EventEmitter<void>();
}
