import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConnectionModel {
  id?: string;
  fromId: string;
  toId: string;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  // Animation properties (will be used in Week 2)
  animating?: boolean;
  animX?: number;
  animY?: number;
  productColor?: string;
}

@Injectable({ providedIn: 'root' })
export class ConnectionService {

  private api = 'http://localhost:8080/api/connection';

  constructor(private http: HttpClient) {}

  createConnection(fromId: string, toId: string): Observable<ConnectionModel> {
    return this.http.post<ConnectionModel>(this.api, { fromId, toId });
  }

  getConnections(): Observable<ConnectionModel[]> {
    return this.http.get<ConnectionModel[]>(this.api);
  }

  deleteConnection(id: string): Observable<any> {
    return this.http.delete(`${this.api}/${id}`); // Fixed: Added parentheses
  }

  // Validate connection follows Q→M→Q pattern
  validateConnection(fromId: string, toId: string): boolean {
    const fromType = fromId.charAt(0); // 'Q' or 'M'
    const toType = toId.charAt(0);
    
    // Only allow Q→M or M→Q
    return (fromType === 'Q' && toType === 'M') || 
           (fromType === 'M' && toType === 'Q');
  }
}