import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MachineModel {
  name: string;           // Machine ID (e.g., "M1", "M2")
  id: string;             // Numeric ID
  x: number;
  y: number;
  status: 'idle' | 'processing' | 'FLASHING';  // ✅ Added FLASHING status
  serviceTime: number;    // Processing time in milliseconds
  color: string;          // Current color
  defaultColor: string;   // Default blue color
  ready: boolean;         // Is machine ready to process
  currentProduct?: any;   // Current product being processed (if any)
  inputQueue?: any;       // Input queue reference
  outputQueue?: any;      // Output queue reference
}

export interface MachineStatus {
  id: string;
  status: 'idle' | 'processing' | 'FLASHING';  // ✅ Added FLASHING status
  isReady: boolean;
  color: string;
  serviceTime: number;
  hasCurrentProduct: boolean;
}

@Injectable({ providedIn: 'root' })
export class MachineService {

  private api = 'http://localhost:8080/api/machine';

  constructor(private http: HttpClient) {}

  /**
   * Create new machine at position
   */
  createMachine(x: number, y: number): Observable<MachineModel> {
    return this.http.post<MachineModel>(this.api, { x, y });
  }

  /**
   * Get all machines
   */
  getMachines(): Observable<MachineModel[]> {
    return this.http.get<MachineModel[]>(this.api);
  }

  /**
   * Get machine by ID
   */
  getMachine(id: string): Observable<MachineModel> {
    return this.http.get<MachineModel>(`${this.api}/${id}`);
  }

  /**
   * Update machine position
   */
  updatePosition(id: string, x: number, y: number): Observable<MachineModel> {
    return this.http.put<MachineModel>(`${this.api}/${id}/position`, { x, y });
  }

  /**
   * Update machine service time
   */
  updateServiceTime(id: string, serviceTime: number): Observable<MachineModel> {
    return this.http.put<MachineModel>(`${this.api}/${id}/servicetime`, { serviceTime });
  }

  /**
   * Get machine status
   */
  getMachineStatus(id: string): Observable<MachineStatus> {
    return this.http.get<MachineStatus>(`${this.api}/${id}/status`);
  }

  /**
   * Delete machine
   */
  deleteMachine(id: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.api}/${id}`);
  }
}
