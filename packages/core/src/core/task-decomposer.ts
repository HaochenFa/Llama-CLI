/**
 * Advanced Task Decomposition System for LlamaCLI
 * Provides intelligent task breakdown and dependency analysis
 */

import { LLMAdapter } from '../types/adapters.js';
import { AgentContext } from './agentic-loop.js';

/**
 * Task decomposition result
 */
export interface TaskDecomposition {
  mainGoal: string;
  subTasks: SubTask[];
  dependencies: TaskDependency[];
  estimatedComplexity: number;
  requiredCapabilities: string[];
  riskFactors: RiskFactor[];
  successCriteria: string[];
}

/**
 * Individual sub-task
 */
export interface SubTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: number;
  estimatedDuration: number;
  requiredTools: string[];
  inputs: TaskInput[];
  outputs: TaskOutput[];
  successCriteria: string[];
  fallbackStrategies: string[];
}

/**
 * Task dependency relationship
 */
export interface TaskDependency {
  fromTask: string;
  toTask: string;
  type: DependencyType;
  description: string;
  isOptional: boolean;
}

/**
 * Risk factor in task execution
 */
export interface RiskFactor {
  type: RiskType;
  description: string;
  probability: number;
  impact: number;
  mitigationStrategy: string;
}

/**
 * Task input/output definitions
 */
export interface TaskInput {
  name: string;
  type: string;
  required: boolean;
  description: string;
  source?: string;
}

export interface TaskOutput {
  name: string;
  type: string;
  description: string;
  consumers: string[];
}

/**
 * Task types
 */
export type TaskType = 
  | 'information_gathering'
  | 'data_processing'
  | 'analysis'
  | 'synthesis'
  | 'validation'
  | 'execution'
  | 'communication';

/**
 * Dependency types
 */
export type DependencyType = 
  | 'sequential'
  | 'parallel'
  | 'conditional'
  | 'resource_sharing';

/**
 * Risk types
 */
export type RiskType = 
  | 'technical'
  | 'data_availability'
  | 'time_constraint'
  | 'resource_limitation'
  | 'external_dependency';

/**
 * Task decomposition configuration
 */
export interface TaskDecomposerConfig {
  maxSubTasks: number;
  maxDepth: number;
  minTaskDuration: number;
  maxTaskDuration: number;
  enableRiskAnalysis: boolean;
  enableDependencyOptimization: boolean;
}

const DEFAULT_DECOMPOSER_CONFIG: TaskDecomposerConfig = {
  maxSubTasks: 20,
  maxDepth: 5,
  minTaskDuration: 30, // seconds
  maxTaskDuration: 1800, // 30 minutes
  enableRiskAnalysis: true,
  enableDependencyOptimization: true,
};

/**
 * Advanced Task Decomposer
 */
export class TaskDecomposer {
  constructor(
    private llmAdapter: LLMAdapter,
    private config: TaskDecomposerConfig = DEFAULT_DECOMPOSER_CONFIG
  ) {}

  /**
   * Decompose a complex goal into manageable sub-tasks
   */
  async decompose(goal: string, context: AgentContext): Promise<TaskDecomposition> {
    // Step 1: Analyze goal complexity and scope
    const complexity = await this.analyzeComplexity(goal, context);
    
    // Step 2: Generate initial task breakdown
    const initialBreakdown = await this.generateInitialBreakdown(goal, context, complexity);
    
    // Step 3: Refine and optimize task structure
    const refinedTasks = await this.refineTasks(initialBreakdown, context);
    
    // Step 4: Analyze dependencies
    const dependencies = await this.analyzeDependencies(refinedTasks, context);
    
    // Step 5: Perform risk analysis
    const riskFactors = this.config.enableRiskAnalysis 
      ? await this.analyzeRisks(refinedTasks, dependencies, context)
      : [];
    
    // Step 6: Optimize execution order
    const optimizedTasks = this.config.enableDependencyOptimization
      ? await this.optimizeExecutionOrder(refinedTasks, dependencies)
      : refinedTasks;

    // Step 7: Define success criteria
    const successCriteria = await this.defineSuccessCriteria(goal, optimizedTasks, context);

    return {
      mainGoal: goal,
      subTasks: optimizedTasks,
      dependencies,
      estimatedComplexity: complexity.score,
      requiredCapabilities: complexity.capabilities,
      riskFactors,
      successCriteria,
    };
  }

  /**
   * Analyze goal complexity
   */
  private async analyzeComplexity(goal: string, context: AgentContext): Promise<{
    score: number;
    factors: string[];
    capabilities: string[];
  }> {
    const prompt = `Analyze the complexity of this goal and identify required capabilities:

**Goal:** ${goal}

**Context:**
- Available tools: ${context.allowedTools.join(', ')}
- Constraints: ${context.constraints.join(', ')}
- Max duration: ${Math.round(context.maxDuration / 1000)} seconds

Provide analysis in JSON format:
\`\`\`json
{
  "complexity_score": 1-10,
  "complexity_factors": ["factor1", "factor2"],
  "required_capabilities": ["capability1", "capability2"],
  "reasoning": "Explanation of complexity assessment"
}
\`\`\``;

    const response = await this.llmAdapter.chat([{
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      id: `complexity-${Date.now()}`
    }]);

    try {
      const analysis = this.parseJsonFromResponse(response.content);
      return {
        score: analysis.complexity_score || 5,
        factors: analysis.complexity_factors || [],
        capabilities: analysis.required_capabilities || [],
      };
    } catch (error) {
      // Fallback to default complexity
      return {
        score: 5,
        factors: ['unknown'],
        capabilities: ['general'],
      };
    }
  }

  /**
   * Generate initial task breakdown
   */
  private async generateInitialBreakdown(
    goal: string, 
    context: AgentContext, 
    complexity: { score: number; capabilities: string[] }
  ): Promise<SubTask[]> {
    const prompt = `Break down this goal into manageable sub-tasks:

**Goal:** ${goal}
**Complexity Score:** ${complexity.score}/10
**Required Capabilities:** ${complexity.capabilities.join(', ')}
**Available Tools:** ${context.allowedTools.join(', ')}

Create a detailed breakdown with 3-${this.config.maxSubTasks} sub-tasks in JSON format:
\`\`\`json
{
  "sub_tasks": [
    {
      "id": "task_1",
      "title": "Brief task title",
      "description": "Detailed description of what this task accomplishes",
      "type": "information_gathering|data_processing|analysis|synthesis|validation|execution|communication",
      "priority": 1-10,
      "estimated_duration": 60,
      "required_tools": ["tool1", "tool2"],
      "inputs": [
        {
          "name": "input_name",
          "type": "string|number|object|file",
          "required": true,
          "description": "What this input provides",
          "source": "user|previous_task|external"
        }
      ],
      "outputs": [
        {
          "name": "output_name", 
          "type": "string|number|object|file",
          "description": "What this output provides",
          "consumers": ["task_2", "final_result"]
        }
      ],
      "success_criteria": ["criterion1", "criterion2"],
      "fallback_strategies": ["strategy1", "strategy2"]
    }
  ]
}
\`\`\`

Ensure tasks are:
- Specific and actionable
- Between ${this.config.minTaskDuration}-${this.config.maxTaskDuration} seconds each
- Logically ordered
- Have clear success criteria`;

    const response = await this.llmAdapter.chat([{
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      id: `breakdown-${Date.now()}`
    }]);

    try {
      const breakdown = this.parseJsonFromResponse(response.content);
      return breakdown.sub_tasks || [];
    } catch (error) {
      // Fallback to simple breakdown
      return this.createFallbackBreakdown(goal);
    }
  }

  /**
   * Refine and validate tasks
   */
  private async refineTasks(tasks: SubTask[], context: AgentContext): Promise<SubTask[]> {
    // Validate task structure
    const validatedTasks = tasks.filter(task => this.validateTask(task));
    
    // Ensure task IDs are unique
    const uniqueTasks = this.ensureUniqueIds(validatedTasks);
    
    // Adjust durations to fit constraints
    const adjustedTasks = this.adjustTaskDurations(uniqueTasks, context);
    
    return adjustedTasks;
  }

  /**
   * Analyze task dependencies
   */
  private async analyzeDependencies(tasks: SubTask[], context: AgentContext): Promise<TaskDependency[]> {
    if (tasks.length <= 1) return [];

    const prompt = `Analyze dependencies between these tasks:

**Tasks:**
${tasks.map(task => `- ${task.id}: ${task.title} (${task.type})`).join('\n')}

Identify dependencies in JSON format:
\`\`\`json
{
  "dependencies": [
    {
      "from_task": "task_1",
      "to_task": "task_2", 
      "type": "sequential|parallel|conditional|resource_sharing",
      "description": "Why task_2 depends on task_1",
      "is_optional": false
    }
  ]
}
\`\`\`

Consider:
- Data flow between tasks
- Logical prerequisites
- Resource sharing
- Timing constraints`;

    const response = await this.llmAdapter.chat([{
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      id: `dependencies-${Date.now()}`
    }]);

    try {
      const analysis = this.parseJsonFromResponse(response.content);
      return (analysis.dependencies || []).map((dep: any) => ({
        fromTask: dep.from_task,
        toTask: dep.to_task,
        type: dep.type as DependencyType,
        description: dep.description,
        isOptional: dep.is_optional || false,
      }));
    } catch (error) {
      // Fallback to sequential dependencies
      return this.createSequentialDependencies(tasks);
    }
  }

  /**
   * Analyze execution risks
   */
  private async analyzeRisks(
    tasks: SubTask[], 
    dependencies: TaskDependency[], 
    context: AgentContext
  ): Promise<RiskFactor[]> {
    const prompt = `Analyze potential risks in executing these tasks:

**Tasks:** ${tasks.length} tasks with ${dependencies.length} dependencies
**Time Constraint:** ${Math.round(context.maxDuration / 1000)} seconds
**Available Tools:** ${context.allowedTools.join(', ')}

Identify risks in JSON format:
\`\`\`json
{
  "risks": [
    {
      "type": "technical|data_availability|time_constraint|resource_limitation|external_dependency",
      "description": "Description of the risk",
      "probability": 0.1-1.0,
      "impact": 0.1-1.0,
      "mitigation_strategy": "How to mitigate this risk"
    }
  ]
}
\`\`\``;

    const response = await this.llmAdapter.chat([{
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      id: `risks-${Date.now()}`
    }]);

    try {
      const analysis = this.parseJsonFromResponse(response.content);
      return (analysis.risks || []).map((risk: any) => ({
        type: risk.type as RiskType,
        description: risk.description,
        probability: Math.max(0.1, Math.min(1.0, risk.probability || 0.5)),
        impact: Math.max(0.1, Math.min(1.0, risk.impact || 0.5)),
        mitigationStrategy: risk.mitigation_strategy || 'Monitor and adapt',
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Optimize execution order
   */
  private async optimizeExecutionOrder(
    tasks: SubTask[], 
    dependencies: TaskDependency[]
  ): Promise<SubTask[]> {
    // Implement topological sort for dependency-aware ordering
    const sorted = this.topologicalSort(tasks, dependencies);
    
    // Adjust priorities based on critical path
    return this.adjustPriorities(sorted, dependencies);
  }

  /**
   * Define success criteria for the overall goal
   */
  private async defineSuccessCriteria(
    goal: string, 
    tasks: SubTask[], 
    context: AgentContext
  ): Promise<string[]> {
    const prompt = `Define clear success criteria for achieving this goal:

**Goal:** ${goal}
**Sub-tasks:** ${tasks.map(t => t.title).join(', ')}

Provide 3-5 specific, measurable success criteria in JSON format:
\`\`\`json
{
  "success_criteria": [
    "Specific criterion that can be verified",
    "Another measurable outcome"
  ]
}
\`\`\``;

    const response = await this.llmAdapter.chat([{
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      id: `criteria-${Date.now()}`
    }]);

    try {
      const analysis = this.parseJsonFromResponse(response.content);
      return analysis.success_criteria || ['Goal completed successfully'];
    } catch (error) {
      return ['Goal completed successfully'];
    }
  }

  // Helper methods
  private parseJsonFromResponse(content: string): any {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('No JSON found in response');
  }

  private validateTask(task: SubTask): boolean {
    return !!(task.id && task.title && task.description && task.type);
  }

  private ensureUniqueIds(tasks: SubTask[]): SubTask[] {
    const seen = new Set<string>();
    return tasks.map((task, index) => {
      if (seen.has(task.id)) {
        task.id = `${task.id}_${index}`;
      }
      seen.add(task.id);
      return task;
    });
  }

  private adjustTaskDurations(tasks: SubTask[], context: AgentContext): SubTask[] {
    const totalDuration = tasks.reduce((sum, task) => sum + task.estimatedDuration, 0);
    const maxAllowed = context.maxDuration / 1000;
    
    if (totalDuration > maxAllowed) {
      const scaleFactor = maxAllowed / totalDuration;
      tasks.forEach(task => {
        task.estimatedDuration = Math.max(
          this.config.minTaskDuration,
          Math.round(task.estimatedDuration * scaleFactor)
        );
      });
    }
    
    return tasks;
  }

  private createFallbackBreakdown(goal: string): SubTask[] {
    return [
      {
        id: 'analyze_goal',
        title: 'Analyze Goal',
        description: `Understand and analyze the goal: ${goal}`,
        type: 'analysis',
        priority: 10,
        estimatedDuration: 60,
        requiredTools: [],
        inputs: [],
        outputs: [],
        successCriteria: ['Goal is clearly understood'],
        fallbackStrategies: ['Ask for clarification'],
      },
      {
        id: 'execute_goal',
        title: 'Execute Goal',
        description: 'Take action to achieve the goal',
        type: 'execution',
        priority: 8,
        estimatedDuration: 300,
        requiredTools: [],
        inputs: [],
        outputs: [],
        successCriteria: ['Goal is achieved'],
        fallbackStrategies: ['Try alternative approach'],
      },
    ];
  }

  private createSequentialDependencies(tasks: SubTask[]): TaskDependency[] {
    const dependencies: TaskDependency[] = [];
    for (let i = 0; i < tasks.length - 1; i++) {
      dependencies.push({
        fromTask: tasks[i].id,
        toTask: tasks[i + 1].id,
        type: 'sequential',
        description: `${tasks[i + 1].title} depends on completion of ${tasks[i].title}`,
        isOptional: false,
      });
    }
    return dependencies;
  }

  private topologicalSort(tasks: SubTask[], dependencies: TaskDependency[]): SubTask[] {
    // Simple topological sort implementation
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize graph
    tasks.forEach(task => {
      graph.set(task.id, []);
      inDegree.set(task.id, 0);
    });
    
    // Build graph
    dependencies.forEach(dep => {
      graph.get(dep.fromTask)?.push(dep.toTask);
      inDegree.set(dep.toTask, (inDegree.get(dep.toTask) || 0) + 1);
    });
    
    // Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];
    
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) queue.push(taskId);
    });
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      graph.get(current)?.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      });
    }
    
    // Return tasks in sorted order
    const taskMap = new Map(tasks.map(task => [task.id, task]));
    return result.map(id => taskMap.get(id)!).filter(Boolean);
  }

  private adjustPriorities(tasks: SubTask[], dependencies: TaskDependency[]): SubTask[] {
    // Adjust priorities based on critical path and dependencies
    const criticalPath = this.findCriticalPath(tasks, dependencies);
    
    tasks.forEach(task => {
      if (criticalPath.includes(task.id)) {
        task.priority = Math.min(10, task.priority + 2);
      }
    });
    
    return tasks;
  }

  private findCriticalPath(tasks: SubTask[], dependencies: TaskDependency[]): string[] {
    // Simplified critical path finding
    // In a real implementation, this would use proper CPM algorithm
    const taskMap = new Map(tasks.map(task => [task.id, task]));
    const longestPath: string[] = [];
    let maxDuration = 0;
    
    // For now, just return the path with highest total duration
    const visited = new Set<string>();
    
    const dfs = (taskId: string, currentPath: string[], currentDuration: number) => {
      if (visited.has(taskId)) return;
      
      visited.add(taskId);
      const task = taskMap.get(taskId);
      if (!task) return;
      
      const newPath = [...currentPath, taskId];
      const newDuration = currentDuration + task.estimatedDuration;
      
      if (newDuration > maxDuration) {
        maxDuration = newDuration;
        longestPath.splice(0, longestPath.length, ...newPath);
      }
      
      // Continue to dependent tasks
      dependencies
        .filter(dep => dep.fromTask === taskId)
        .forEach(dep => dfs(dep.toTask, newPath, newDuration));
      
      visited.delete(taskId);
    };
    
    // Start DFS from tasks with no dependencies
    const startTasks = tasks.filter(task => 
      !dependencies.some(dep => dep.toTask === task.id)
    );
    
    startTasks.forEach(task => dfs(task.id, [], 0));
    
    return longestPath;
  }
}
