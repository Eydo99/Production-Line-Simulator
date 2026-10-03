import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import("../components/canvas/simulation-canvas.component")
        .then(m => m.SimulationCanvasComponent)
  }
];
 