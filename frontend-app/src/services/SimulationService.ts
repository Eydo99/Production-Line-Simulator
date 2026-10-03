import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { tap, switchMap, takeWhile, map } from 'rxjs/operators';

export interface SimulationStatus {
  isRunning: boolean;
  isPaused: boolean;
  totalGenerated: number;
  totalProcessed: number;
  duration: number;
  avgQueueLength: number;
  queueCount: number;
  machineCount: number;
  connectionCount: number;
}

export interface SimulationStatistics {
  totalGenerated: number;
  totalProcessed: number;
  duration: number;
  avgQueueLength: number;
  isRunning: boolean;
  isPaused: boolean;
}

export interface ReplayStatus {
  isReplayMode: boolean;
  totalProducts: number;
  replayIndex: number;
  productsReplayed: number;
  productsRemaining: number;
  isRunning: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SimulationService {

  private readonly apiUrl = 'http://localhost:8080/api/simulation';

  // State management with BehaviorSubjects
  private isRunningSubject = new BehaviorSubject<boolean>(false);
  private isPausedSubject = new BehaviorSubject<boolean>(false);
  private isReplayingSubject = new BehaviorSubject<boolean>(false);
  private statisticsSubject = new BehaviorSubject<SimulationStatistics>({
    totalGenerated: 0,
    totalProcessed: 0,
    duration: 0,
    avgQueueLength: 0,
    isRunning: false,
    isPaused: false
  });

  // Public observables
  public isRunning$ = this.isRunningSubject.asObservable();
  public isPaused$ = this.isPausedSubject.asObservable();
  public isReplaying$ = this.isReplayingSubject.asObservable();
  public statistics$ = this.statisticsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Initialize with current status
    this.loadStatus();
  }

  /**
   * Start the simulation
   */
  startSimulation(): Observable<any> {
    return this.http.post(`${this.apiUrl}/start`, {}).pipe(
      tap(response => {
        console.log('▶️  Simulation started:', response);
        this.isRunningSubject.next(true);
        this.isPausedSubject.next(false);
        this.isReplayingSubject.next(false);
      })
    );
  }

  /**
   * Stop the simulation
   */
  stopSimulation(): Observable<any> {
    return this.http.post(`${this.apiUrl}/stop`, {}).pipe(
      tap(response => {
        console.log('⏹️  Simulation stopped:', response);
        this.isRunningSubject.next(false);
        this.isPausedSubject.next(false);
        this.isReplayingSubject.next(false);
      })
    );
  }

  /**
   * Pause the simulation
   */
  pauseSimulation(): Observable<any> {
    return this.http.post(`${this.apiUrl}/pause`, {}).pipe(
      tap(response => {
        console.log('⏸️  Simulation paused:', response);
        this.isPausedSubject.next(true);
      })
    );
  }

  /**
   * Resume the simulation
   */
  resumeSimulation(): Observable<any> {
    return this.http.post(`${this.apiUrl}/resume`, {}).pipe(
      tap(response => {
        console.log('▶️  Simulation resumed:', response);
        this.isPausedSubject.next(false);
      })
    );
  }

  /**
   * Clear/Reset simulation
   */
  clearSimulation(): Observable<any> {
    return this.http.post(`${this.apiUrl}/clear`, {}).pipe(
      tap(response => {
        console.log('🧹 Simulation cleared:', response);
        this.isRunningSubject.next(false);
        this.isPausedSubject.next(false);
        this.isReplayingSubject.next(false);
        this.statisticsSubject.next({
          totalGenerated: 0,
          totalProcessed: 0,
          duration: 0,
          avgQueueLength: 0,
          isRunning: false,
          isPaused: false
        });
      })
    );
  }

  /**
   * Get current simulation status
   */
  getStatus(): Observable<SimulationStatus> {
    return this.http.get<SimulationStatus>(`${this.apiUrl}/status`).pipe(
      tap(status => {
        this.isRunningSubject.next(status.isRunning);
        this.isPausedSubject.next(status.isPaused);
        this.statisticsSubject.next({
          totalGenerated: status.totalGenerated,
          totalProcessed: status.totalProcessed,
          duration: status.duration,
          avgQueueLength: status.avgQueueLength,
          isRunning: status.isRunning,
          isPaused: status.isPaused
        });
      })
    );
  }

  /**
   * Replay simulation from last snapshot
   */
  replaySimulation(): Observable<any> {
    return this.http.post(`${this.apiUrl}/replay`, {}).pipe(
      tap(response => {
        console.log('🔁 Simulation replaying:', response);
        this.isRunningSubject.next(true);
        this.isPausedSubject.next(false);
        this.isReplayingSubject.next(true);

        // Poll replay status every second
        this.startReplayStatusPolling();
      })
    );
  }

  /**
   * Poll replay status during replay
   */
  private startReplayStatusPolling(): void {
    interval(1000).pipe(
      switchMap(() => this.getReplayStatus()),
      takeWhile(status => {
        // Stop polling if we manually stop or if backend reports it's not running
        if (!status.isRunning) {
          // Sync frontend state immediately
          this.isRunningSubject.next(false);
          this.isReplayingSubject.next(false);
          return false;
        }
        return this.isReplayingSubject.value; // Continue while frontend thinks we are replaying
      }, true)
    ).subscribe({
      next: (status) => {
        console.log('🔁 Replay status:', status);
      },
      complete: () => {
        console.log('✅ Replay completed or stopped');
        this.isReplayingSubject.next(false);
        this.isRunningSubject.next(false);
      },
      error: (err) => console.error('❌ Replay polling error:', err)
    });
  }

  /**
   * Get replay status
   */
  getReplayStatus(): Observable<ReplayStatus> {
    return this.http.get<ReplayStatus>(`${this.apiUrl}/replay/status`);
  }

  /**
   * Check if a snapshot exists
   */
  checkSnapshot(): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}/snapshot`).pipe(
      tap(response => {
        console.log('📸 Snapshot check response:', response);
      }),
      map(response => {
        // Extract hasSnapshot boolean from response
        const hasSnapshot = response?.hasSnapshot === true;
        return hasSnapshot;
      })
    );
  }

  /**
   * Create a snapshot
   */
  createSnapshot(): Observable<any> {
    return this.http.post(`${this.apiUrl}/snapshot`, {}).pipe(
      tap(response => {
        console.log('📸 Snapshot created:', response);
      })
    );
  }

  /**
   * Get simulation statistics
   */
  getStatistics(): Observable<SimulationStatistics> {
    return this.http.get<SimulationStatistics>(`${this.apiUrl}/statistics`).pipe(
      tap(stats => {
        this.statisticsSubject.next(stats);
      })
    );
  }

  /**
   * Load current status on initialization
   */
  private loadStatus(): void {
    this.getStatus().subscribe({
      next: (status) => {
        console.log('📊 Initial simulation status loaded:', status);
      },
      error: (err) => {
        console.error('❌ Failed to load simulation status:', err);
      }
    });
  }

  /**
   * Get current running state (synchronous)
   */
  isRunning(): boolean {
    return this.isRunningSubject.value;
  }

  /**
   * Get current paused state (synchronous)
   */
  isPaused(): boolean {
    return this.isPausedSubject.value;
  }

  /**
   * Get current replaying state (synchronous)
   */
  isReplaying(): boolean {
    return this.isReplayingSubject.value;
  }

  /**
   * Get current statistics (synchronous)
   */
  getCurrentStatistics(): SimulationStatistics {
    return this.statisticsSubject.value;
  }
}
