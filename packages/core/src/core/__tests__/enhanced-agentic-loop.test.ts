/**
 * Tests for Enhanced Agentic Loop System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskDecomposer } from '../task-decomposer.js';
import { EnhancedContextManager } from '../enhanced-context-manager.js';
import { DynamicExecutionPlanner } from '../dynamic-execution-planner.js';
import { AgenticLoop } from '../agentic-loop.js';
import { LLMAdapter } from '../../types/adapters.js';
import { ToolScheduler } from '../tool-scheduler.js';
import { ContextManager } from '../context-manager.js';

// Mock LLM Adapter
class MockLLMAdapter implements Partial<LLMAdapter> {
  async chat(messages: any[]): Promise<any> {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content;

    // Mock responses based on content
    if (content.includes('complexity')) {
      return {
        content: `\`\`\`json
{
  "complexity_score": 6,
  "complexity_factors": ["multi-step", "requires_tools"],
  "required_capabilities": ["analysis", "execution"],
  "reasoning": "This is a moderately complex task"
}
\`\`\``,
        role: 'assistant',
        timestamp: Date.now(),
        id: 'mock-response'
      };
    }

    if (content.includes('sub_tasks')) {
      return {
        content: `\`\`\`json
{
  "sub_tasks": [
    {
      "id": "task_1",
      "title": "Analyze Requirements",
      "description": "Understand what needs to be done",
      "type": "analysis",
      "priority": 10,
      "estimated_duration": 60,
      "required_tools": [],
      "inputs": [],
      "outputs": [],
      "success_criteria": ["Requirements understood"],
      "fallback_strategies": ["Ask for clarification"]
    },
    {
      "id": "task_2", 
      "title": "Execute Solution",
      "description": "Implement the solution",
      "type": "execution",
      "priority": 8,
      "estimated_duration": 120,
      "required_tools": ["tool1"],
      "inputs": [],
      "outputs": [],
      "success_criteria": ["Solution implemented"],
      "fallback_strategies": ["Try alternative approach"]
    }
  ]
}
\`\`\``,
        role: 'assistant',
        timestamp: Date.now(),
        id: 'mock-response'
      };
    }

    if (content.includes('dependencies')) {
      return {
        content: `\`\`\`json
{
  "dependencies": [
    {
      "from_task": "task_1",
      "to_task": "task_2",
      "type": "sequential",
      "description": "Task 2 depends on Task 1 completion",
      "is_optional": false
    }
  ]
}
\`\`\``,
        role: 'assistant',
        timestamp: Date.now(),
        id: 'mock-response'
      };
    }

    if (content.includes('success_criteria')) {
      return {
        content: `\`\`\`json
{
  "success_criteria": [
    "Goal completed successfully",
    "All requirements met",
    "Quality standards achieved"
  ]
}
\`\`\``,
        role: 'assistant',
        timestamp: Date.now(),
        id: 'mock-response'
      };
    }

    if (content.includes('memories')) {
      return {
        content: `\`\`\`json
{
  "memories": [
    {
      "type": "factual",
      "content": "Important fact learned",
      "importance": 0.8,
      "tags": ["fact", "important"]
    }
  ]
}
\`\`\``,
        role: 'assistant',
        timestamp: Date.now(),
        id: 'mock-response'
      };
    }

    // Default response
    return {
      content: 'Mock response for: ' + content.substring(0, 50) + '...',
      role: 'assistant',
      timestamp: Date.now(),
      id: 'mock-response'
    };
  }

  getConfig() {
    return { type: 'mock' };
  }
}

describe('Enhanced Agentic Loop System', () => {
  let mockLLMAdapter: MockLLMAdapter;
  let taskDecomposer: TaskDecomposer;
  let enhancedContextManager: EnhancedContextManager;
  let dynamicExecutionPlanner: DynamicExecutionPlanner;

  beforeEach(() => {
    mockLLMAdapter = new MockLLMAdapter();
    taskDecomposer = new TaskDecomposer(mockLLMAdapter as any);
    enhancedContextManager = new EnhancedContextManager(mockLLMAdapter as any);
    dynamicExecutionPlanner = new DynamicExecutionPlanner(mockLLMAdapter as any);
  });

  describe('TaskDecomposer', () => {
    it('should decompose a complex goal into sub-tasks', async () => {
      const goal = 'Create a comprehensive project plan';
      const context = {
        goal,
        allowedTools: ['file_read', 'file_write'],
        constraints: ['time_limit'],
        maxDuration: 300000,
        sessionId: 'test-session',
        userId: 'test-user',
      };

      const decomposition = await taskDecomposer.decompose(goal, context);

      expect(decomposition).toBeDefined();
      expect(decomposition.mainGoal).toBe(goal);
      expect(decomposition.subTasks).toHaveLength(2);
      expect(decomposition.subTasks[0].id).toBe('task_1');
      expect(decomposition.subTasks[0].title).toBe('Analyze Requirements');
      expect(decomposition.dependencies).toHaveLength(1);
      expect(decomposition.successCriteria).toContain('Goal completed successfully');
    });

    it('should handle complexity analysis', async () => {
      const goal = 'Simple task';
      const context = {
        goal,
        allowedTools: [],
        constraints: [],
        maxDuration: 60000,
        sessionId: 'test-session',
        userId: 'test-user',
      };

      const decomposition = await taskDecomposer.decompose(goal, context);

      expect(decomposition.estimatedComplexity).toBe(6);
      expect(decomposition.requiredCapabilities).toContain('analysis');
    });
  });

  describe('EnhancedContextManager', () => {
    it('should add and retrieve context items', async () => {
      const contextId = enhancedContextManager.addContext(
        'goal',
        'Test goal',
        { priority: 'high' },
        ['test']
      );

      expect(contextId).toBeDefined();
      expect(contextId).toMatch(/^ctx_/);
    });

    it('should get relevant context for a goal', async () => {
      enhancedContextManager.addContext('goal', 'Create a plan', {}, ['planning']);
      enhancedContextManager.addContext('step', 'Step 1 completed', {}, ['execution']);
      enhancedContextManager.addContext('observation', 'Found important data', {}, ['data']);

      const relevantContext = await enhancedContextManager.getRelevantContext('Create a plan');

      expect(relevantContext).toBeDefined();
      expect(relevantContext.length).toBeGreaterThan(0);
    });

    it('should compress context when needed', async () => {
      // Add multiple context items
      for (let i = 0; i < 10; i++) {
        enhancedContextManager.addContext(
          'step',
          `Step ${i} completed with some detailed information`,
          {},
          ['execution']
        );
      }

      const compressionResult = await enhancedContextManager.compressContext('Test goal');

      expect(compressionResult).toBeDefined();
      expect(compressionResult.compressionRatio).toBeLessThanOrEqual(1.0);
    });

    it('should consolidate memories', async () => {
      enhancedContextManager.addContext(
        'reflection',
        'Important lesson learned',
        { important: true },
        ['learning']
      );

      const consolidation = await enhancedContextManager.consolidateMemories();

      expect(consolidation).toBeDefined();
      expect(consolidation.consolidatedMemories).toBeDefined();
    });
  });

  describe('DynamicExecutionPlanner', () => {
    it('should create execution plan from task decomposition', async () => {
      const decomposition = {
        mainGoal: 'Test goal',
        subTasks: [
          {
            id: 'task_1',
            title: 'Test Task',
            description: 'A test task',
            type: 'execution' as const,
            priority: 5,
            estimatedDuration: 60,
            requiredTools: [],
            inputs: [],
            outputs: [],
            successCriteria: ['Task completed'],
            fallbackStrategies: ['Retry'],
          }
        ],
        dependencies: [],
        estimatedComplexity: 5,
        requiredCapabilities: ['execution'],
        riskFactors: [],
        successCriteria: ['Goal achieved'],
      };

      const context = {
        goal: 'Test goal',
        allowedTools: [],
        constraints: [],
        maxDuration: 300000,
        sessionId: 'test-session',
        userId: 'test-user',
      };

      const plan = await dynamicExecutionPlanner.createPlan(decomposition, context);

      expect(plan).toBeDefined();
      expect(plan.originalGoal).toBe('Test goal');
      expect(plan.tasks).toHaveLength(1);
      expect(plan.status).toBe('created');
      expect(plan.metrics.totalTasks).toBe(1);
    });

    it('should get next task to execute', async () => {
      const decomposition = {
        mainGoal: 'Test goal',
        subTasks: [
          {
            id: 'task_1',
            title: 'Test Task',
            description: 'A test task',
            type: 'execution' as const,
            priority: 5,
            estimatedDuration: 60,
            requiredTools: [],
            inputs: [],
            outputs: [],
            successCriteria: ['Task completed'],
            fallbackStrategies: ['Retry'],
          }
        ],
        dependencies: [],
        estimatedComplexity: 5,
        requiredCapabilities: ['execution'],
        riskFactors: [],
        successCriteria: ['Goal achieved'],
      };

      const context = {
        goal: 'Test goal',
        allowedTools: [],
        constraints: [],
        maxDuration: 300000,
        sessionId: 'test-session',
        userId: 'test-user',
      };

      const plan = await dynamicExecutionPlanner.createPlan(decomposition, context);
      plan.status = 'executing';

      // Mark first task as ready
      plan.tasks[0].status = 'ready';

      const nextTask = dynamicExecutionPlanner.getNextTask();

      expect(nextTask).toBeDefined();
      expect(nextTask?.id).toBe('task_1');
    });

    it('should update task status and metrics', async () => {
      const decomposition = {
        mainGoal: 'Test goal',
        subTasks: [
          {
            id: 'task_1',
            title: 'Test Task',
            description: 'A test task',
            type: 'execution' as const,
            priority: 5,
            estimatedDuration: 60,
            requiredTools: [],
            inputs: [],
            outputs: [],
            successCriteria: ['Task completed'],
            fallbackStrategies: ['Retry'],
          }
        ],
        dependencies: [],
        estimatedComplexity: 5,
        requiredCapabilities: ['execution'],
        riskFactors: [],
        successCriteria: ['Goal achieved'],
      };

      const context = {
        goal: 'Test goal',
        allowedTools: [],
        constraints: [],
        maxDuration: 300000,
        sessionId: 'test-session',
        userId: 'test-user',
      };

      const plan = await dynamicExecutionPlanner.createPlan(decomposition, context);
      plan.status = 'executing';

      await dynamicExecutionPlanner.updateTaskStatus('task_1', 'executing');
      await dynamicExecutionPlanner.updateTaskStatus('task_1', 'completed', 'Task result');

      const progress = dynamicExecutionPlanner.getPlanProgress();

      expect(progress.overall).toBe(1.0);
      expect(plan.metrics.completedTasks).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    it('should work together in a complete workflow', async () => {
      const goal = 'Create a simple project plan';
      const context = {
        goal,
        allowedTools: ['file_read', 'file_write'],
        constraints: [],
        maxDuration: 300000,
        sessionId: 'test-session',
        userId: 'test-user',
      };

      // Step 1: Decompose task
      const decomposition = await taskDecomposer.decompose(goal, context);
      expect(decomposition.subTasks.length).toBeGreaterThan(0);

      // Step 2: Create execution plan
      const plan = await dynamicExecutionPlanner.createPlan(decomposition, context);
      expect(plan.tasks.length).toBe(decomposition.subTasks.length);

      // Step 3: Add context and get relevant information
      enhancedContextManager.addContext('goal', goal, {}, ['primary']);
      const relevantContext = await enhancedContextManager.getRelevantContext(goal);
      expect(relevantContext.length).toBeGreaterThan(0);

      // Step 4: Simulate task execution
      plan.status = 'executing';
      plan.tasks[0].status = 'ready';
      
      const nextTask = dynamicExecutionPlanner.getNextTask();
      expect(nextTask).toBeDefined();

      await dynamicExecutionPlanner.updateTaskStatus(nextTask!.id, 'completed');
      
      const progress = dynamicExecutionPlanner.getPlanProgress();
      expect(progress.overall).toBeGreaterThan(0);
    });
  });
});
