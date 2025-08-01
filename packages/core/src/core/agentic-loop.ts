/**
 * Agentic Loop Core Implementation for LlamaCLI
 * Provides autonomous reasoning and tool execution capabilities
 */

import { EventEmitter } from "events";
import {
  MCPToolCallParams,
  MCPToolCallResult,
  MCPTextContent,
  MCPImageContent,
} from "../types/mcp.js";
import { ToolScheduler } from "./tool-scheduler.js";
import { ContextManager } from "./index.js";
import { BaseTool, ToolExecutor, ToolDiscovery } from "../tools/index.js";
import { LLMAdapter } from "../types/adapters.js";
import { TaskDecomposer, TaskDecomposition } from "./task-decomposer.js";
import { EnhancedContextManager } from "./enhanced-context-manager.js";
import { DynamicExecutionPlanner, ExecutionPlan } from "./dynamic-execution-planner.js";

/**
 * Agent state during execution
 */
export type AgentState =
  | "idle"
  | "thinking"
  | "planning"
  | "executing"
  | "reflecting"
  | "completed"
  | "error"
  | "paused";

/**
 * Agent execution step
 */
export interface AgentStep {
  id: string;
  type: "thought" | "plan" | "action" | "observation" | "reflection";
  content: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Agent execution plan
 */
export interface AgentPlan {
  goal: string;
  steps: Array<{
    id: string;
    description: string;
    tools: string[];
    dependencies: string[];
    estimated_duration: number;
    priority: number;
  }>;
  estimated_total_duration: number;
  confidence: number;
}

/**
 * Agent execution context
 */
export interface AgentContext {
  sessionId: string;
  userId?: string;
  goal: string;
  constraints: string[];
  preferences: Record<string, any>;
  maxSteps: number;
  maxDuration: number;
  allowedTools: string[];
  blockedTools: string[];
}

/**
 * Agent execution result
 */
export interface AgentResult {
  success: boolean;
  goal: string;
  finalAnswer: string;
  steps: AgentStep[];
  plan: AgentPlan;
  executionTime: number;
  toolsUsed: string[];
  tokensUsed: number;
  error?: string;
  metadata: Record<string, any>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  maxSteps: number;
  maxDuration: number;
  thinkingTimeout: number;
  planningTimeout: number;
  executionTimeout: number;
  reflectionTimeout: number;
  maxRetries: number;
  enableReflection: boolean;
  enablePlanning: boolean;
  verboseLogging: boolean;
  temperature: number;
  maxTokens: number;
}

/**
 * Default agent configuration
 */
const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxSteps: 20,
  maxDuration: 300000, // 5 minutes
  thinkingTimeout: 30000,
  planningTimeout: 60000,
  executionTimeout: 120000,
  reflectionTimeout: 30000,
  maxRetries: 3,
  enableReflection: true,
  enablePlanning: true,
  verboseLogging: false,
  temperature: 0.7,
  maxTokens: 2000,
};

/**
 * Agentic Loop Implementation
 */
export class AgenticLoop extends EventEmitter {
  private state: AgentState = "idle";
  private currentStep = 0;
  private startTime = 0;
  private steps: AgentStep[] = [];
  private currentPlan: AgentPlan | null = null;
  private abortController: AbortController | null = null;

  // Enhanced components
  private taskDecomposer: TaskDecomposer;
  private enhancedContextManager: EnhancedContextManager;
  private executionPlanner: DynamicExecutionPlanner;
  private currentTaskDecomposition: TaskDecomposition | null = null;
  private currentExecutionPlan: ExecutionPlan | null = null;

  constructor(
    private llmAdapter: LLMAdapter,
    private toolScheduler: ToolScheduler,
    private contextManager: ContextManager,
    private config: AgentConfig = DEFAULT_AGENT_CONFIG
  ) {
    super();

    // Initialize enhanced components
    this.taskDecomposer = new TaskDecomposer(this.llmAdapter);
    this.enhancedContextManager = new EnhancedContextManager(this.llmAdapter);
    this.executionPlanner = new DynamicExecutionPlanner(this.llmAdapter);
  }

  /**
   * Execute the agentic loop for a given goal
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    this.startTime = Date.now();
    this.currentStep = 0;
    this.steps = [];
    this.currentPlan = null;
    this.currentTaskDecomposition = null;
    this.currentExecutionPlan = null;
    this.abortController = new AbortController();

    try {
      this.setState("thinking");
      this.emit("started", { context });

      // Add initial context
      this.enhancedContextManager.addContext("goal", context.goal, { priority: "high" }, [
        "primary",
      ]);

      // Enhanced task decomposition phase
      this.setState("planning");
      this.currentTaskDecomposition = await this.taskDecomposer.decompose(context.goal, context);
      this.enhancedContextManager.addContext(
        "step",
        `Task decomposition completed: ${this.currentTaskDecomposition.subTasks.length} sub-tasks identified`,
        { decomposition: this.currentTaskDecomposition },
        ["planning", "decomposition"]
      );

      // Create dynamic execution plan
      this.currentExecutionPlan = await this.executionPlanner.createPlan(
        this.currentTaskDecomposition,
        context
      );
      this.currentExecutionPlan.status = "executing";

      // Main execution loop with enhanced planning
      this.setState("executing");
      let finalAnswer = "";
      let completed = false;

      while (!completed && this.currentStep < this.config.maxSteps) {
        // Check timeout
        if (Date.now() - this.startTime > this.config.maxDuration) {
          throw new Error("Agent execution timeout");
        }

        // Check abort signal
        if (this.abortController.signal.aborted) {
          throw new Error("Agent execution aborted");
        }

        // Get next task from execution planner
        const nextTask = this.executionPlanner.getNextTask();

        if (!nextTask) {
          // No more tasks available, check if we can complete
          const progress = this.executionPlanner.getPlanProgress();
          if (progress.overall >= 0.8) {
            // Most tasks completed, try to generate final answer
            finalAnswer = await this.generateFinalAnswer(context);
            completed = true;
          } else {
            // Not enough progress, continue with traditional step execution
            const stepResult = await this.executeStep(context);
            if (stepResult.completed) {
              finalAnswer = stepResult.answer;
              completed = true;
            }
          }
        } else {
          // Execute the planned task
          const taskResult = await this.executeTask(nextTask, context);

          // Update task status in planner
          await this.executionPlanner.updateTaskStatus(
            nextTask.id,
            taskResult.success ? "completed" : "failed",
            taskResult.result,
            taskResult.error
          );

          // Add task result to context
          this.enhancedContextManager.addContext(
            "tool_result",
            `Task "${nextTask.title}" ${taskResult.success ? "completed" : "failed"}: ${taskResult.result || taskResult.error}`,
            { taskId: nextTask.id, success: taskResult.success },
            ["execution", "task_result"]
          );

          // Check if goal is achieved
          if (taskResult.goalAchieved) {
            finalAnswer = taskResult.result || "Goal achieved successfully";
            completed = true;
          }
        }

        this.currentStep++;

        // Periodic memory consolidation
        if (this.currentStep % 5 === 0) {
          await this.enhancedContextManager.consolidateMemories();
        }
      }

      // Reflection phase (if enabled)
      if (this.config.enableReflection && completed) {
        this.setState("reflecting");
        await this.reflect(context.goal, finalAnswer, context);
      }

      this.setState("completed");

      const result: AgentResult = {
        success: true,
        goal: context.goal,
        finalAnswer,
        steps: this.steps,
        plan: this.currentPlan!,
        executionTime: Date.now() - this.startTime,
        toolsUsed: this.getUsedTools(),
        tokensUsed: this.getTotalTokensUsed(),
        metadata: {
          stepsExecuted: this.currentStep,
          maxStepsReached: this.currentStep >= this.config.maxSteps,
          planningEnabled: this.config.enablePlanning,
          reflectionEnabled: this.config.enableReflection,
        },
      };

      this.emit("completed", result);
      return result;
    } catch (error) {
      this.setState("error");
      const errorResult: AgentResult = {
        success: false,
        goal: context.goal,
        finalAnswer: "",
        steps: this.steps,
        plan: this.currentPlan!,
        executionTime: Date.now() - this.startTime,
        toolsUsed: this.getUsedTools(),
        tokensUsed: this.getTotalTokensUsed(),
        error: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          stepsExecuted: this.currentStep,
          errorStep: this.currentStep,
        },
      };

      this.emit("error", errorResult);
      return errorResult;
    }
  }

  /**
   * Initial thinking phase
   */
  private async think(goal: string, context: AgentContext): Promise<void> {
    const stepId = this.generateStepId();
    const startTime = Date.now();

    try {
      const prompt = this.buildThinkingPrompt(goal, context);
      const response = await this.llmAdapter.chat(
        [
          {
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            id: `plan-${Date.now()}`,
          },
        ],
        {
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }
      );

      const step: AgentStep = {
        id: stepId,
        type: "thought",
        content: response.content,
        timestamp: startTime,
        duration: Date.now() - startTime,
        metadata: {
          tokensUsed: 0, // Will be updated when usage tracking is implemented
          model: "unknown",
        },
      };

      this.steps.push(step);
      this.emit("step", step);
    } catch (error) {
      throw new Error(
        `Thinking phase failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Planning phase
   */
  private async plan(goal: string, context: AgentContext): Promise<void> {
    const stepId = this.generateStepId();
    const startTime = Date.now();

    try {
      const availableTools = this.getAvailableTools(context);
      const prompt = this.buildPlanningPrompt(goal, context, availableTools);

      const response = await this.llmAdapter.chat(
        [
          {
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            id: `plan-${Date.now()}`,
          },
        ],
        {
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature * 0.8, // Lower temperature for planning
        }
      );

      // Parse the plan from the response
      this.currentPlan = this.parsePlan(response.content, goal);

      const step: AgentStep = {
        id: stepId,
        type: "plan",
        content: response.content,
        timestamp: startTime,
        duration: Date.now() - startTime,
        metadata: {
          tokensUsed: 0, // Will be updated when usage tracking is implemented
          model: "unknown",
          plan: this.currentPlan,
        },
      };

      this.steps.push(step);
      this.emit("step", step);
      this.emit("plan", this.currentPlan);
    } catch (error) {
      throw new Error(
        `Planning phase failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Execute a single step in the agentic loop
   */
  private async executeStep(
    context: AgentContext
  ): Promise<{ completed: boolean; answer: string }> {
    const stepId = this.generateStepId();
    const startTime = Date.now();

    try {
      // Determine next action
      const actionPrompt = this.buildActionPrompt(context);
      const response = await this.llmAdapter.chat(
        [
          {
            role: "user",
            content: actionPrompt,
            timestamp: Date.now(),
            id: `action-${Date.now()}`,
          },
        ],
        {
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }
      );

      // Parse action from response
      const action = this.parseAction(response.content);

      const actionStep: AgentStep = {
        id: stepId,
        type: "action",
        content: response.content,
        timestamp: startTime,
        duration: Date.now() - startTime,
        metadata: {
          tokensUsed: 0, // Will be updated when usage tracking is implemented
          action,
        },
      };

      this.steps.push(actionStep);
      this.emit("step", actionStep);

      // Execute action if it's a tool call
      if (action.type === "tool_call") {
        const observationStep = await this.executeToolCall(action.toolName, action.parameters);
        this.steps.push(observationStep);
        this.emit("step", observationStep);
      }

      // Check if task is completed
      if (action.type === "final_answer") {
        return {
          completed: true,
          answer: action.answer,
        };
      }

      return {
        completed: false,
        answer: "",
      };
    } catch (error) {
      throw new Error(
        `Step execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Execute a tool call and return observation
   */
  private async executeToolCall(toolName: string, parameters: any): Promise<AgentStep> {
    const stepId = this.generateStepId();
    const startTime = Date.now();

    try {
      const result = await this.toolScheduler.executeToolCall({
        id: `tool-${Date.now()}`,
        name: toolName,
        arguments: parameters,
        timestamp: Date.now(),
      });

      return {
        id: stepId,
        type: "observation",
        content: this.formatToolResult(result),
        timestamp: startTime,
        duration: Date.now() - startTime,
        metadata: {
          toolName,
          parameters,
          result,
        },
      };
    } catch (error) {
      return {
        id: stepId,
        type: "observation",
        content: `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: startTime,
        duration: Date.now() - startTime,
        metadata: {
          toolName,
          parameters,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Reflection phase
   */
  private async reflect(goal: string, answer: string, context: AgentContext): Promise<void> {
    const stepId = this.generateStepId();
    const startTime = Date.now();

    try {
      const prompt = this.buildReflectionPrompt(goal, answer, context);
      const response = await this.llmAdapter.chat(
        [
          {
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            id: `reflect-${Date.now()}`,
          },
        ],
        {
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature * 0.6, // Lower temperature for reflection
        }
      );

      const step: AgentStep = {
        id: stepId,
        type: "reflection",
        content: response.content,
        timestamp: startTime,
        duration: Date.now() - startTime,
        metadata: {
          tokensUsed: 0, // Will be updated when usage tracking is implemented
          model: "unknown",
        },
      };

      this.steps.push(step);
      this.emit("step", step);
    } catch (error) {
      // Reflection failure is not critical
      console.warn(
        `Reflection phase failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Build thinking prompt
   */
  private buildThinkingPrompt(goal: string, context: AgentContext): string {
    return `You are an AI assistant tasked with achieving the following goal:

**Goal:** ${goal}

**Context:**
- Session ID: ${context.sessionId}
- Max steps allowed: ${context.maxSteps}
- Max duration: ${Math.round(context.maxDuration / 1000)} seconds
- Constraints: ${context.constraints.join(", ") || "None"}

Please think through this problem step by step. Consider:
1. What information do you need to gather?
2. What tools might be helpful?
3. What are the potential challenges?
4. How will you know when you've succeeded?

Provide your initial thoughts and approach.`;
  }

  /**
   * Build planning prompt
   */
  private buildPlanningPrompt(
    goal: string,
    context: AgentContext,
    availableTools: string[]
  ): string {
    return `Based on your initial thinking, create a detailed plan to achieve this goal:

**Goal:** ${goal}

**Available Tools:** ${availableTools.join(", ")}

Create a step-by-step plan in JSON format with the following structure:
\`\`\`json
{
  "goal": "${goal}",
  "steps": [
    {
      "id": "step_1",
      "description": "Description of what this step accomplishes",
      "tools": ["tool_name"],
      "dependencies": [],
      "estimated_duration": 30,
      "priority": 1
    }
  ],
  "estimated_total_duration": 120,
  "confidence": 0.8
}
\`\`\`

Make sure your plan is realistic and achievable within the constraints.`;
  }

  /**
   * Build action prompt
   */
  private buildActionPrompt(context: AgentContext): string {
    const recentSteps = this.steps.slice(-5); // Last 5 steps for context
    const stepHistory = recentSteps
      .map((step) => `${step.type.toUpperCase()}: ${step.content.substring(0, 200)}...`)
      .join("\n\n");

    return `You are working towards this goal: ${context.goal}

**Recent Steps:**
${stepHistory}

**Current Step:** ${this.currentStep + 1}/${this.config.maxSteps}

Based on your progress so far, what should you do next?

Respond in one of these formats:

1. To use a tool:
\`\`\`json
{
  "type": "tool_call",
  "toolName": "tool_name",
  "parameters": { "param": "value" },
  "reasoning": "Why you're using this tool"
}
\`\`\`

2. To provide final answer:
\`\`\`json
{
  "type": "final_answer",
  "answer": "Your complete answer to the goal",
  "reasoning": "Why this completes the task"
}
\`\`\`

Choose the most appropriate action to make progress towards your goal.`;
  }

  /**
   * Build reflection prompt
   */
  private buildReflectionPrompt(goal: string, answer: string, context: AgentContext): string {
    return `You have completed the task with the following result:

**Goal:** ${goal}
**Answer:** ${answer}
**Steps taken:** ${this.currentStep}
**Execution time:** ${Math.round((Date.now() - this.startTime) / 1000)} seconds

Reflect on your performance:
1. Did you achieve the goal effectively?
2. Were there any inefficiencies in your approach?
3. What could be improved for similar tasks in the future?
4. Are there any concerns about the quality or accuracy of your answer?

Provide a brief reflection on your performance and suggestions for improvement.`;
  }

  /**
   * Parse plan from LLM response
   */
  private parsePlan(response: string, goal: string): AgentPlan {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/{[\s\S]*}/);
      if (jsonMatch) {
        const planData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return {
          goal: planData.goal || goal,
          steps: planData.steps || [],
          estimated_total_duration: planData.estimated_total_duration || 120,
          confidence: planData.confidence || 0.5,
        };
      }
    } catch (error) {
      console.warn("Failed to parse plan JSON, using fallback");
    }

    // Fallback plan
    return {
      goal,
      steps: [
        {
          id: "step_1",
          description: "Analyze the problem and gather information",
          tools: ["web_search"],
          dependencies: [],
          estimated_duration: 60,
          priority: 1,
        },
      ],
      estimated_total_duration: 120,
      confidence: 0.3,
    };
  }

  /**
   * Parse action from LLM response
   */
  private parseAction(response: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/{[\s\S]*}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
    } catch (error) {
      console.warn("Failed to parse action JSON");
    }

    // Fallback action
    return {
      type: "final_answer",
      answer:
        "I was unable to determine the next action. Please provide more specific instructions.",
      reasoning: "Failed to parse action from response",
    };
  }

  /**
   * Format tool result for observation
   */
  private formatToolResult(result: MCPToolCallResult): string {
    if (!result.content || result.content.length === 0) {
      return "Tool execution completed with no output.";
    }

    return result.content
      .map((content) => {
        if (content.type === "text") {
          return (content as MCPTextContent).text;
        } else if (content.type === "image") {
          const imageContent = content as MCPImageContent;
          return `[Image: ${imageContent.data.substring(0, 50)}...]`;
        }
        return "[Unknown content type]";
      })
      .join("\n");
  }

  /**
   * Get available tools for the context
   */
  private getAvailableTools(context: AgentContext): string[] {
    const allTools = ToolDiscovery.findByTags(["network", "search", "download"]);
    return allTools
      .filter((tool) => {
        if (context.allowedTools.length > 0) {
          return context.allowedTools.includes(tool.name);
        }
        return !context.blockedTools.includes(tool.name);
      })
      .map((tool) => tool.name);
  }

  /**
   * Get tools used during execution
   */
  private getUsedTools(): string[] {
    const toolSteps = this.steps.filter((step) => step.type === "observation");
    return [...new Set(toolSteps.map((step) => step.metadata?.toolName).filter(Boolean))];
  }

  /**
   * Get total tokens used
   */
  private getTotalTokensUsed(): number {
    return this.steps.reduce((total, step) => {
      return total + (step.metadata?.tokensUsed || 0);
    }, 0);
  }

  /**
   * Execute a specific planned task
   */
  private async executeTask(
    task: any,
    context: AgentContext
  ): Promise<{
    success: boolean;
    result?: string;
    error?: string;
    goalAchieved: boolean;
  }> {
    try {
      // Update task status to executing
      await this.executionPlanner.updateTaskStatus(task.id, "executing");

      // Get relevant context for this task
      const relevantContext = await this.enhancedContextManager.getRelevantContext(
        `${context.goal} - ${task.description}`,
        1024
      );

      // Build task execution prompt
      const contextSummary = relevantContext
        .map((item) => `${item.type}: ${item.content}`)
        .join("\n");

      const prompt = `Execute this task to help achieve the goal:

**Main Goal:** ${context.goal}
**Current Task:** ${task.title}
**Task Description:** ${task.description}
**Required Tools:** ${task.requiredTools.join(", ")}

**Relevant Context:**
${contextSummary}

**Available Tools:** ${context.allowedTools.join(", ")}

Execute this task step by step. If you need to use tools, specify them clearly.
If this task completes the main goal, indicate that in your response.

Respond in JSON format:
\`\`\`json
{
  "action": "tool_call|final_answer",
  "tool_name": "tool_name_if_using_tool",
  "parameters": {"param": "value"},
  "reasoning": "Why you're taking this action",
  "goal_achieved": false,
  "result": "Description of what was accomplished"
}
\`\`\``;

      const response = await this.llmAdapter.chat([
        {
          role: "user",
          content: prompt,
          timestamp: Date.now(),
          id: `task-${task.id}-${Date.now()}`,
        },
      ]);

      // Parse response
      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const taskResponse = JSON.parse(jsonMatch[1]);

        if (taskResponse.action === "tool_call" && taskResponse.tool_name) {
          // Execute tool call
          const toolResult = await this.executeTool(
            taskResponse.tool_name,
            taskResponse.parameters || {},
            context
          );

          return {
            success: !toolResult.error,
            result: toolResult.result || taskResponse.result,
            error: toolResult.error,
            goalAchieved: taskResponse.goal_achieved || false,
          };
        } else {
          // Direct result
          return {
            success: true,
            result: taskResponse.result || response.content,
            goalAchieved: taskResponse.goal_achieved || false,
          };
        }
      } else {
        // Fallback to content
        return {
          success: true,
          result: response.content,
          goalAchieved: false,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        goalAchieved: false,
      };
    }
  }

  /**
   * Generate final answer based on accumulated context
   */
  private async generateFinalAnswer(context: AgentContext): Promise<string> {
    const contextSummary = await this.enhancedContextManager.getContextSummary(context.goal);
    const progress = this.executionPlanner.getPlanProgress();

    const prompt = `Based on the work completed so far, provide a final answer to the goal:

**Goal:** ${context.goal}

**Progress Summary:**
${contextSummary}

**Execution Progress:** ${Math.round(progress.overall * 100)}% complete
**Tasks Completed:** ${progress.currentTask}

Provide a comprehensive final answer that addresses the original goal based on all the work completed.`;

    const response = await this.llmAdapter.chat([
      {
        role: "user",
        content: prompt,
        timestamp: Date.now(),
        id: `final-answer-${Date.now()}`,
      },
    ]);

    return response.content;
  }

  /**
   * Execute a tool with error handling
   */
  private async executeTool(
    toolName: string,
    parameters: Record<string, any>,
    context: AgentContext
  ): Promise<{ result?: string; error?: string }> {
    try {
      // This would integrate with the existing tool execution system
      // For now, return a placeholder
      return {
        result: `Tool ${toolName} executed with parameters: ${JSON.stringify(parameters)}`,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Tool execution failed",
      };
    }
  }

  /**
   * Generate unique step ID
   */
  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set agent state and emit event
   */
  private setState(state: AgentState): void {
    const previousState = this.state;
    this.state = state;
    this.emit("stateChange", { from: previousState, to: state });
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return this.state;
  }

  /**
   * Pause agent execution
   */
  pause(): void {
    if (this.state === "executing") {
      this.setState("paused");
      this.emit("paused");
    }
  }

  /**
   * Resume agent execution
   */
  resume(): void {
    if (this.state === "paused") {
      this.setState("executing");
      this.emit("resumed");
    }
  }

  /**
   * Abort agent execution
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.setState("error");
      this.emit("aborted");
    }
  }

  /**
   * Get execution statistics
   */
  getStats() {
    return {
      state: this.state,
      currentStep: this.currentStep,
      totalSteps: this.steps.length,
      executionTime: this.startTime > 0 ? Date.now() - this.startTime : 0,
      tokensUsed: this.getTotalTokensUsed(),
      toolsUsed: this.getUsedTools(),
    };
  }
}

/**
 * Factory function to create an agentic loop instance
 */
export function createAgenticLoop(
  llmAdapter: LLMAdapter,
  toolScheduler: ToolScheduler,
  contextManager: ContextManager,
  config?: Partial<AgentConfig>
): AgenticLoop {
  const finalConfig = { ...DEFAULT_AGENT_CONFIG, ...config };
  return new AgenticLoop(llmAdapter, toolScheduler, contextManager, finalConfig);
}
