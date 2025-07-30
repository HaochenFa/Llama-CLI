/**
 * Dynamic Execution Planner for LlamaCLI
 * Provides adaptive planning with real-time adjustments based on execution results
 */

import { LLMAdapter } from '../types/adapters.js';
import { AgentContext, AgentStep } from './agentic-loop.js';
import { SubTask, TaskDependency, TaskDecomposition } from './task-decomposer.js';

/**
 * Execution plan with dynamic adjustments
 */
export interface ExecutionPlan {
  id: string;
  originalGoal: string;
  currentGoal: string;
  tasks: PlannedTask[];
  dependencies: TaskDependency[];
  currentTaskIndex: number;
  status: PlanStatus;
  adaptations: PlanAdaptation[];
  metrics: ExecutionMetrics;
  contingencies: ContingencyPlan[];
}

/**
 * Planned task with execution state
 */
export interface PlannedTask extends SubTask {
  status: TaskStatus;
  actualDuration?: number;
  actualStartTime?: number;
  actualEndTime?: number;
  attempts: number;
  errors: string[];
  adaptations: TaskAdaptation[];
  confidence: number;
}

/**
 * Plan adaptation record
 */
export interface PlanAdaptation {
  id: string;
  timestamp: number;
  type: AdaptationType;
  reason: string;
  changes: AdaptationChange[];
  impact: AdaptationImpact;
}

/**
 * Task adaptation record
 */
export interface TaskAdaptation {
  timestamp: number;
  type: TaskAdaptationType;
  description: string;
  previousValue: any;
  newValue: any;
}

/**
 * Contingency plan
 */
export interface ContingencyPlan {
  id: string;
  trigger: ContingencyTrigger;
  condition: string;
  actions: ContingencyAction[];
  priority: number;
  activated: boolean;
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  skippedTasks: number;
  totalEstimatedDuration: number;
  actualDuration: number;
  efficiencyRatio: number;
  adaptationCount: number;
  errorRate: number;
}

/**
 * Status enums
 */
export type PlanStatus = 'created' | 'executing' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type TaskStatus = 'pending' | 'ready' | 'executing' | 'completed' | 'failed' | 'skipped' | 'blocked';
export type AdaptationType = 'task_modification' | 'task_addition' | 'task_removal' | 'dependency_change' | 'goal_refinement';
export type TaskAdaptationType = 'parameter_change' | 'tool_change' | 'approach_change' | 'timeout_adjustment';
export type ContingencyTrigger = 'task_failure' | 'timeout' | 'resource_unavailable' | 'goal_change' | 'external_event';

/**
 * Adaptation change
 */
export interface AdaptationChange {
  target: string;
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
}

/**
 * Adaptation impact
 */
export interface AdaptationImpact {
  estimatedTimeChange: number;
  confidenceChange: number;
  riskChange: number;
  affectedTasks: string[];
}

/**
 * Contingency action
 */
export interface ContingencyAction {
  type: 'retry' | 'skip' | 'modify' | 'substitute' | 'escalate';
  parameters: Record<string, any>;
  description: string;
}

/**
 * Planner configuration
 */
export interface DynamicPlannerConfig {
  maxAdaptations: number;
  adaptationThreshold: number;
  maxRetries: number;
  timeoutMultiplier: number;
  enableContingencyPlanning: boolean;
  enableRealTimeOptimization: boolean;
  confidenceThreshold: number;
}

const DEFAULT_PLANNER_CONFIG: DynamicPlannerConfig = {
  maxAdaptations: 10,
  adaptationThreshold: 0.3,
  maxRetries: 3,
  timeoutMultiplier: 1.5,
  enableContingencyPlanning: true,
  enableRealTimeOptimization: true,
  confidenceThreshold: 0.7,
};

/**
 * Dynamic Execution Planner
 */
export class DynamicExecutionPlanner {
  private currentPlan: ExecutionPlan | null = null;
  private executionHistory: ExecutionPlan[] = [];

  constructor(
    private llmAdapter: LLMAdapter,
    private config: DynamicPlannerConfig = DEFAULT_PLANNER_CONFIG
  ) {}

  /**
   * Create initial execution plan from task decomposition
   */
  async createPlan(
    decomposition: TaskDecomposition,
    context: AgentContext
  ): Promise<ExecutionPlan> {
    const planId = this.generatePlanId();
    
    // Convert sub-tasks to planned tasks
    const plannedTasks: PlannedTask[] = decomposition.subTasks.map(task => ({
      ...task,
      status: 'pending',
      attempts: 0,
      errors: [],
      adaptations: [],
      confidence: 0.8,
    }));

    // Generate contingency plans
    const contingencies = this.config.enableContingencyPlanning
      ? await this.generateContingencyPlans(plannedTasks, context)
      : [];

    const plan: ExecutionPlan = {
      id: planId,
      originalGoal: decomposition.mainGoal,
      currentGoal: decomposition.mainGoal,
      tasks: plannedTasks,
      dependencies: decomposition.dependencies,
      currentTaskIndex: 0,
      status: 'created',
      adaptations: [],
      metrics: this.initializeMetrics(plannedTasks),
      contingencies,
    };

    this.currentPlan = plan;
    return plan;
  }

  /**
   * Get next task to execute
   */
  getNextTask(): PlannedTask | null {
    if (!this.currentPlan || this.currentPlan.status !== 'executing') {
      return null;
    }

    // Find next ready task
    const readyTasks = this.currentPlan.tasks.filter(task => 
      task.status === 'ready' || (task.status === 'pending' && this.areTaskDependenciesMet(task))
    );

    if (readyTasks.length === 0) {
      return null;
    }

    // Select highest priority ready task
    return readyTasks.reduce((highest, current) => 
      current.priority > highest.priority ? current : highest
    );
  }

  /**
   * Update task status and adapt plan if needed
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    result?: any,
    error?: string
  ): Promise<void> {
    if (!this.currentPlan) return;

    const task = this.currentPlan.tasks.find(t => t.id === taskId);
    if (!task) return;

    const previousStatus = task.status;
    task.status = status;

    // Update timing information
    if (status === 'executing' && !task.actualStartTime) {
      task.actualStartTime = Date.now();
    } else if (['completed', 'failed', 'skipped'].includes(status) && task.actualStartTime) {
      task.actualEndTime = Date.now();
      task.actualDuration = task.actualEndTime - task.actualStartTime;
    }

    // Handle errors
    if (error) {
      task.errors.push(error);
    }

    // Update attempts
    if (status === 'executing') {
      task.attempts++;
    }

    // Update plan metrics
    this.updatePlanMetrics();

    // Check if adaptation is needed
    if (await this.shouldAdaptPlan(task, previousStatus, status)) {
      await this.adaptPlan(task, result, error);
    }

    // Update dependent tasks
    this.updateDependentTasks(taskId, status);

    // Check contingency triggers
    await this.checkContingencyTriggers(task, status, error);
  }

  /**
   * Adapt plan based on execution results
   */
  async adaptPlan(task: PlannedTask, result?: any, error?: string): Promise<void> {
    if (!this.currentPlan || this.currentPlan.adaptations.length >= this.config.maxAdaptations) {
      return;
    }

    const adaptations = await this.generateAdaptations(task, result, error);
    
    for (const adaptation of adaptations) {
      await this.applyAdaptation(adaptation);
      this.currentPlan.adaptations.push(adaptation);
    }
  }

  /**
   * Get plan progress summary
   */
  getPlanProgress(): {
    overall: number;
    currentTask: string;
    estimatedTimeRemaining: number;
    confidence: number;
  } {
    if (!this.currentPlan) {
      return {
        overall: 0,
        currentTask: 'No active plan',
        estimatedTimeRemaining: 0,
        confidence: 0,
      };
    }

    const completedTasks = this.currentPlan.tasks.filter(t => t.status === 'completed').length;
    const totalTasks = this.currentPlan.tasks.length;
    const overall = totalTasks > 0 ? completedTasks / totalTasks : 0;

    const currentTask = this.getNextTask();
    const remainingTasks = this.currentPlan.tasks.filter(t => 
      ['pending', 'ready', 'executing'].includes(t.status)
    );
    const estimatedTimeRemaining = remainingTasks.reduce((sum, task) => 
      sum + (task.estimatedDuration || 0), 0
    );

    const avgConfidence = this.currentPlan.tasks.reduce((sum, task) => 
      sum + task.confidence, 0
    ) / totalTasks;

    return {
      overall,
      currentTask: currentTask?.title || 'No task ready',
      estimatedTimeRemaining,
      confidence: avgConfidence,
    };
  }

  /**
   * Complete current plan
   */
  completePlan(success: boolean): void {
    if (!this.currentPlan) return;

    this.currentPlan.status = success ? 'completed' : 'failed';
    this.updatePlanMetrics();
    
    // Archive plan
    this.executionHistory.push({ ...this.currentPlan });
    
    // Learn from execution
    this.learnFromExecution(this.currentPlan);
  }

  // Private helper methods

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMetrics(tasks: PlannedTask[]): ExecutionMetrics {
    return {
      totalTasks: tasks.length,
      completedTasks: 0,
      failedTasks: 0,
      skippedTasks: 0,
      totalEstimatedDuration: tasks.reduce((sum, task) => sum + task.estimatedDuration, 0),
      actualDuration: 0,
      efficiencyRatio: 1.0,
      adaptationCount: 0,
      errorRate: 0,
    };
  }

  private areTaskDependenciesMet(task: PlannedTask): boolean {
    if (!this.currentPlan) return false;

    const dependencies = this.currentPlan.dependencies.filter(dep => dep.toTask === task.id);
    
    return dependencies.every(dep => {
      const dependentTask = this.currentPlan!.tasks.find(t => t.id === dep.fromTask);
      return dependentTask?.status === 'completed' || dep.isOptional;
    });
  }

  private updatePlanMetrics(): void {
    if (!this.currentPlan) return;

    const metrics = this.currentPlan.metrics;
    const tasks = this.currentPlan.tasks;

    metrics.completedTasks = tasks.filter(t => t.status === 'completed').length;
    metrics.failedTasks = tasks.filter(t => t.status === 'failed').length;
    metrics.skippedTasks = tasks.filter(t => t.status === 'skipped').length;
    
    const completedWithDuration = tasks.filter(t => t.status === 'completed' && t.actualDuration);
    if (completedWithDuration.length > 0) {
      const totalActual = completedWithDuration.reduce((sum, t) => sum + (t.actualDuration || 0), 0);
      const totalEstimated = completedWithDuration.reduce((sum, t) => sum + t.estimatedDuration, 0);
      metrics.efficiencyRatio = totalEstimated / totalActual;
    }

    metrics.adaptationCount = this.currentPlan.adaptations.length;
    
    const totalAttempts = tasks.reduce((sum, t) => sum + t.attempts, 0);
    metrics.errorRate = totalAttempts > 0 ? metrics.failedTasks / totalAttempts : 0;
  }

  private async shouldAdaptPlan(
    task: PlannedTask,
    previousStatus: TaskStatus,
    currentStatus: TaskStatus
  ): Promise<boolean> {
    if (!this.config.enableRealTimeOptimization) return false;

    // Adapt on failures
    if (currentStatus === 'failed') return true;

    // Adapt if task took significantly longer than expected
    if (currentStatus === 'completed' && task.actualDuration && task.estimatedDuration) {
      const ratio = task.actualDuration / task.estimatedDuration;
      return ratio > this.config.timeoutMultiplier;
    }

    // Adapt if confidence drops below threshold
    if (task.confidence < this.config.confidenceThreshold) return true;

    return false;
  }

  private async generateAdaptations(
    task: PlannedTask,
    result?: any,
    error?: string
  ): Promise<PlanAdaptation[]> {
    const prompt = `Analyze this task execution and suggest plan adaptations:

**Task:** ${task.title}
**Status:** ${task.status}
**Attempts:** ${task.attempts}
**Estimated Duration:** ${task.estimatedDuration}s
**Actual Duration:** ${task.actualDuration || 'N/A'}s
**Error:** ${error || 'None'}

**Remaining Tasks:** ${this.currentPlan?.tasks.filter(t => 
  ['pending', 'ready'].includes(t.status)
).map(t => t.title).join(', ')}

Suggest adaptations in JSON format:
\`\`\`json
{
  "adaptations": [
    {
      "type": "task_modification|task_addition|task_removal|dependency_change|goal_refinement",
      "reason": "Why this adaptation is needed",
      "changes": [
        {
          "target": "task_id or plan",
          "field": "field_name",
          "old_value": "current_value",
          "new_value": "proposed_value",
          "reason": "Why this change helps"
        }
      ],
      "impact": {
        "estimated_time_change": 30,
        "confidence_change": 0.1,
        "risk_change": -0.2,
        "affected_tasks": ["task_1", "task_2"]
      }
    }
  ]
}
\`\`\``;

    try {
      const response = await this.llmAdapter.chat([{
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
        id: `adapt-${Date.now()}`
      }]);

      const result = this.parseJsonFromResponse(response.content);
      return (result.adaptations || []).map((adapt: any) => ({
        id: this.generatePlanId(),
        timestamp: Date.now(),
        type: adapt.type as AdaptationType,
        reason: adapt.reason,
        changes: adapt.changes || [],
        impact: adapt.impact || {
          estimatedTimeChange: 0,
          confidenceChange: 0,
          riskChange: 0,
          affectedTasks: [],
        },
      }));
    } catch (error) {
      return [];
    }
  }

  private async applyAdaptation(adaptation: PlanAdaptation): Promise<void> {
    if (!this.currentPlan) return;

    for (const change of adaptation.changes) {
      if (change.target === 'plan') {
        // Apply plan-level changes
        (this.currentPlan as any)[change.field] = change.newValue;
      } else {
        // Apply task-level changes
        const task = this.currentPlan.tasks.find(t => t.id === change.target);
        if (task) {
          (task as any)[change.field] = change.newValue;
          task.adaptations.push({
            timestamp: Date.now(),
            type: 'parameter_change' as TaskAdaptationType,
            description: change.reason,
            previousValue: change.oldValue,
            newValue: change.newValue,
          });
        }
      }
    }
  }

  private updateDependentTasks(taskId: string, status: TaskStatus): void {
    if (!this.currentPlan) return;

    if (status === 'completed') {
      // Mark dependent tasks as ready
      const dependentTasks = this.currentPlan.dependencies
        .filter(dep => dep.fromTask === taskId)
        .map(dep => this.currentPlan!.tasks.find(t => t.id === dep.toTask))
        .filter(Boolean) as PlannedTask[];

      dependentTasks.forEach(task => {
        if (task.status === 'pending' && this.areTaskDependenciesMet(task)) {
          task.status = 'ready';
        }
      });
    }
  }

  private async generateContingencyPlans(
    tasks: PlannedTask[],
    context: AgentContext
  ): Promise<ContingencyPlan[]> {
    // Generate basic contingency plans for common failure scenarios
    const contingencies: ContingencyPlan[] = [];

    // Task failure contingency
    contingencies.push({
      id: `contingency_${Date.now()}_failure`,
      trigger: 'task_failure',
      condition: 'task.attempts >= maxRetries',
      actions: [
        {
          type: 'retry',
          parameters: { maxRetries: this.config.maxRetries },
          description: 'Retry task with modified parameters',
        },
        {
          type: 'skip',
          parameters: {},
          description: 'Skip task and continue with plan',
        },
      ],
      priority: 8,
      activated: false,
    });

    // Timeout contingency
    contingencies.push({
      id: `contingency_${Date.now()}_timeout`,
      trigger: 'timeout',
      condition: 'actualDuration > estimatedDuration * timeoutMultiplier',
      actions: [
        {
          type: 'modify',
          parameters: { timeoutMultiplier: this.config.timeoutMultiplier * 1.5 },
          description: 'Increase timeout for remaining tasks',
        },
      ],
      priority: 6,
      activated: false,
    });

    return contingencies;
  }

  private async checkContingencyTriggers(
    task: PlannedTask,
    status: TaskStatus,
    error?: string
  ): Promise<void> {
    if (!this.currentPlan) return;

    for (const contingency of this.currentPlan.contingencies) {
      if (contingency.activated) continue;

      let triggered = false;

      switch (contingency.trigger) {
        case 'task_failure':
          triggered = status === 'failed' && task.attempts >= this.config.maxRetries;
          break;
        case 'timeout':
          triggered = task.actualDuration !== undefined && 
                     task.actualDuration > task.estimatedDuration * this.config.timeoutMultiplier;
          break;
      }

      if (triggered) {
        await this.activateContingency(contingency, task);
      }
    }
  }

  private async activateContingency(contingency: ContingencyPlan, task: PlannedTask): Promise<void> {
    contingency.activated = true;

    // Execute contingency actions
    for (const action of contingency.actions) {
      switch (action.type) {
        case 'retry':
          task.status = 'ready';
          task.attempts = 0;
          break;
        case 'skip':
          task.status = 'skipped';
          break;
        case 'modify':
          // Apply modifications based on parameters
          Object.entries(action.parameters).forEach(([key, value]) => {
            if (key in task) {
              (task as any)[key] = value;
            }
          });
          break;
      }
    }
  }

  private learnFromExecution(plan: ExecutionPlan): void {
    // Extract lessons learned for future planning
    // This would be implemented to improve future plan generation
    console.log(`Plan ${plan.id} completed with ${plan.metrics.completedTasks}/${plan.metrics.totalTasks} tasks`);
  }

  private parseJsonFromResponse(content: string): any {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('No JSON found in response');
  }
}
