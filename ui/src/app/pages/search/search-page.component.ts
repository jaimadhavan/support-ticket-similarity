import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatchStatus, Ticket } from '../../app.models';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.css'
})
export class SearchPageComponent {
  @Input({ required: true }) availabilityLoading!: boolean;
  @Input({ required: true }) availabilityError!: string;
  @Input({ required: true }) resolvedTicketCount!: number | null;
  @Input({ required: true }) loading!: boolean;
  @Input({ required: true }) removing!: boolean;
  @Input({ required: true }) keyword!: string;
  @Input({ required: true }) resultLimit!: number;
  @Input({ required: true }) error!: string;
  @Input({ required: true }) searchPerformed!: boolean;
  @Input({ required: true }) matchStatus!: MatchStatus;
  @Input({ required: true }) tickets!: Ticket[];
  @Input({ required: true }) copiedTicketId!: string;

  @Output() keywordChange = new EventEmitter<string>();
  @Output() resultLimitChange = new EventEmitter<number>();
  @Output() search = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() retryAvailability = new EventEmitter<void>();
  @Output() dismissFeedback = new EventEmitter<void>();
  @Output() copyResolution = new EventEmitter<{ text: string; event: Event }>();
}
