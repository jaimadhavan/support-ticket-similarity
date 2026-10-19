
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

  getHistoricalTicketAvailability(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/availability`);
  }

  loadHistoricalTickets(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/loadHistoricalTickets`,
      {}
    );
  }

  removeHistoricalTickets(): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/removeHistoricalTickets`
    );
  }

  searchTickets(keyword: string, resultLimit: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/search?keyword=${encodeURIComponent(keyword)}&limit=${resultLimit}`
    );
  }
}
