
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  loadHistoricalTickets(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/loadHistoricalTickets`,
      {}
    );
  }
}
