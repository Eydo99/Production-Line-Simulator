import { Injectable } from '@angular/core';
import { QueueModel } from './queue.service';
import { MachineModel } from './machine.service';
import { ConnectionModel } from './connection.service';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface NodeValidation {
  nodeId: string;
  nodeType: 'queue' | 'machine';
  hasInput: boolean;
  hasOutput: boolean;
  isIsolated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  /**
   * Comprehensive validation before starting simulation
   */
  validateSimulation(
    queues: QueueModel[],
    machines: MachineModel[],
    connections: ConnectionModel[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check if there are any nodes at all
    if (queues.length === 0 && machines.length === 0) {
      errors.push('❌ No nodes exist. Add at least one queue and one machine.');
      return { isValid: false, errors, warnings };
    }

    // 2. Check minimum requirements
    if (queues.length === 0) {
      errors.push('❌ No queues exist. Add at least one queue to hold products.');
    }

    if (machines.length === 0) {
      errors.push('❌ No machines exist. Add at least one machine to process products.');
    }

    if (connections.length === 0) {
      errors.push('❌ No connections exist. Connect queues to machines (Q→M→Q pattern).');
    }

    // Return early if basic requirements aren't met
    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // 3. Validate all nodes have proper connections
    const nodeValidations = this.validateNodeConnections(queues, machines, connections);
    
    // Find isolated nodes (no input AND no output)
    const isolatedNodes = nodeValidations.filter(n => n.isIsolated);
    if (isolatedNodes.length > 0) {
      isolatedNodes.forEach(node => {
        errors.push(`❌ ${node.nodeType.toUpperCase()} "${node.nodeId}" is isolated (no connections)`);
      });
    }

    // Find machines with only input (dead-end)
    const deadEndMachines = nodeValidations.filter(
      n => n.nodeType === 'machine' && n.hasInput && !n.hasOutput
    );
    if (deadEndMachines.length > 0) {
      deadEndMachines.forEach(node => {
        errors.push(`❌ Machine "${node.nodeId}" has input but no output queue (products will be stuck)`);
      });
    }

    // Find machines with only output (no source)
    const sourcelessMachines = nodeValidations.filter(
      n => n.nodeType === 'machine' && !n.hasInput && n.hasOutput
    );
    if (sourcelessMachines.length > 0) {
      sourcelessMachines.forEach(node => {
        errors.push(`❌ Machine "${node.nodeId}" has output but no input queue (will never receive products)`);
      });
    }

    // 4. Check for at least one entry point (queue with no input = source queue)
    const sourceQueues = nodeValidations.filter(
      n => n.nodeType === 'queue' && !n.hasInput && n.hasOutput
    );
    if (sourceQueues.length === 0) {
      errors.push('❌ No source queue found. At least one queue must have no input (entry point for products).');
    }

    // 5. Validate at least one complete Q→M→Q path exists
    const hasCompletePath = this.hasCompleteProductionPath(queues, machines, connections);
    if (!hasCompletePath) {
      errors.push('❌ No complete production path (Q→M→Q) exists. Products need a full journey from source to destination.');
    }

    // 6. Check for circular dependencies (warning, not error)
    const cycles = this.detectCycles(connections);
    if (cycles.length > 0) {
      warnings.push(`⚠️ Detected ${cycles.length} circular path(s). Products may loop indefinitely.`);
    }

    // 7. Validate connection pattern (Q→M or M→Q only)
    const invalidConnections = this.validateConnectionPatterns(connections);
    if (invalidConnections.length > 0) {
      invalidConnections.forEach(conn => {
        errors.push(`❌ Invalid connection: ${conn.fromId} → ${conn.toId}. Must follow Q→M or M→Q pattern.`);
      });
    }

    // 8. Check for orphaned queues (queues with no machines in path)
    const orphanedQueues = this.findOrphanedQueues(queues, machines, connections);
    if (orphanedQueues.length > 0) {
      orphanedQueues.forEach(queueId => {
        warnings.push(`⚠️ Queue "${queueId}" has no reachable machines. Consider adding connections.`);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate connections for each node
   */
  private validateNodeConnections(
    queues: QueueModel[],
    machines: MachineModel[],
    connections: ConnectionModel[]
  ): NodeValidation[] {
    const validations: NodeValidation[] = [];

    // Validate all queues
    queues.forEach(queue => {
      const hasInput = connections.some(c => c.toId === queue.id);
      const hasOutput = connections.some(c => c.fromId === queue.id);
      validations.push({
        nodeId: queue.id,
        nodeType: 'queue',
        hasInput,
        hasOutput,
        isIsolated: !hasInput && !hasOutput
      });
    });

    // Validate all machines
    machines.forEach(machine => {
      const hasInput = connections.some(c => c.toId === machine.name);
      const hasOutput = connections.some(c => c.fromId === machine.name);
      validations.push({
        nodeId: machine.name,
        nodeType: 'machine',
        hasInput,
        hasOutput,
        isIsolated: !hasInput && !hasOutput
      });
    });

    return validations;
  }

  /**
   * Check if at least one complete Q→M→Q path exists
   */
  private hasCompleteProductionPath(
    queues: QueueModel[],
    machines: MachineModel[],
    connections: ConnectionModel[]
  ): boolean {
    // Build adjacency list
    const graph = new Map<string, string[]>();
    connections.forEach(conn => {
      if (!graph.has(conn.fromId)) {
        graph.set(conn.fromId, []);
      }
      graph.get(conn.fromId)!.push(conn.toId);
    });

    // Check if any queue can reach a machine and then another queue
    for (const queue of queues) {
      // Find machines reachable from this queue
      const reachableMachines = graph.get(queue.id) || [];
      
      for (const machineId of reachableMachines) {
        // Check if this machine connects to any queue
        const outputQueues = graph.get(machineId) || [];
        if (outputQueues.length > 0) {
          // Found a Q→M→Q path!
          console.log(`✅ Valid path found: ${queue.id} → ${machineId} → ${outputQueues[0]}`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Detect circular paths in the connection graph
   */
  private detectCycles(connections: ConnectionModel[]): string[][] {
    const graph = new Map<string, string[]>();
    connections.forEach(conn => {
      if (!graph.has(conn.fromId)) {
        graph.set(conn.fromId, []);
      }
      graph.get(conn.fromId)!.push(conn.toId);
    });

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycles.push([...cycle, neighbor]);
        }
      }

      recursionStack.delete(node);
    };

    Array.from(graph.keys()).forEach(node => {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    });

    return cycles;
  }

  /**
   * Validate connection patterns (must be Q→M or M→Q)
   */
  private validateConnectionPatterns(connections: ConnectionModel[]): ConnectionModel[] {
    return connections.filter(conn => {
      const fromType = conn.fromId.charAt(0);
      const toType = conn.toId.charAt(0);
      
      // Valid: Q→M or M→Q
      // Invalid: Q→Q or M→M
      return fromType === toType;
    });
  }

  /**
   * Find queues that have no reachable machines
   */
  private findOrphanedQueues(
    queues: QueueModel[],
    machines: MachineModel[],
    connections: ConnectionModel[]
  ): string[] {
    const orphaned: string[] = [];

    // Build adjacency list
    const graph = new Map<string, string[]>();
    connections.forEach(conn => {
      if (!graph.has(conn.fromId)) {
        graph.set(conn.fromId, []);
      }
      graph.get(conn.fromId)!.push(conn.toId);
    });

    // Check each queue
    for (const queue of queues) {
      const reachable = this.getReachableNodes(queue.id, graph);
      const hasMachine = machines.some(m => reachable.has(m.name));
      
      if (!hasMachine) {
        orphaned.push(queue.id);
      }
    }

    return orphaned;
  }

  /**
   * Get all reachable nodes from a starting node (BFS)
   */
  private getReachableNodes(startNode: string, graph: Map<string, string[]>): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [startNode];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node)) continue;
      
      visited.add(node);
      reachable.add(node);

      const neighbors = graph.get(node) || [];
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      });
    }

    return reachable;
  }

  /**
   * Get a summary of the validation for display
   */
  getValidationSummary(result: ValidationResult): string {
    if (result.isValid) {
      let summary = '✅ Configuration is valid and ready to run!';
      if (result.warnings.length > 0) {
        summary += '\n\nWarnings:\n' + result.warnings.join('\n');
      }
      return summary;
    } else {
      return '❌ Configuration has errors:\n\n' + 
             result.errors.join('\n') + 
             (result.warnings.length > 0 ? '\n\nWarnings:\n' + result.warnings.join('\n') : '');
    }
  }
}