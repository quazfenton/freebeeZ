// Stagehand Workflow Definitions
import { AutomationStep, BrowserProfile, CaptchaConfig } from '../browser-automation';
import { ProxyConfig } from '../types';

export enum StagehandStepType {
  NAVIGATE = 'navigate',
  CLICK = 'click',
  TYPE = 'type',
  WAIT = 'wait',
  EXTRACT = 'extract',
  SCREENSHOT = 'screenshot',
  SOLVE_CAPTCHA = 'solveCaptcha',
  VERIFY_EMAIL = 'verifyEmail',
  CUSTOM_SCRIPT = 'customScript',
  LOOP = 'loop',
  CONDITIONAL = 'conditional',
  PARALLEL = 'parallel',
}

export interface StagehandStep {
  id: string;
  type: StagehandStepType;
  name?: string;
  description?: string;
  selector?: string;
  value?: string | Record<string, any>; // Can be a string for type/navigate, or object for form fill
  timeout?: number;
  condition?: string; // For conditional steps
  steps?: StagehandStep[]; // For loop, conditional, parallel
  iterations?: number; // For loop
  parallelLimit?: number; // For parallel
  customScript?: string; // Path to a Python or JS script
  onSuccess?: StagehandStep[];
  onFailure?: StagehandStep[];
}

export interface StagehandWorkflow {
  id: string;
  name: string;
  description: string;
  initialUrl: string;
  steps: StagehandStep[];
  defaultProfile?: BrowserProfile;
  defaultCaptchaConfig?: CaptchaConfig;
  defaultProxy?: ProxyConfig;
  retries?: number;
  timeout?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StagehandExecutionResult {
  success: boolean;
  workflowId: string;
  logs: string[];
  screenshots: string[];
  data?: any;
  error?: string;
  duration: number;
  completedSteps: string[];
  failedStep?: string;
}

export class StagehandEngine {
  private browserEngine: any; // Will be injected
  private pythonBridge: any; // Will be injected
  private activeWorkflows: Map<string, StagehandWorkflow> = new Map();
  private executionContext: Map<string, any> = new Map();

  constructor(browserEngine?: any, pythonBridge?: any) {
    this.browserEngine = browserEngine;
    this.pythonBridge = pythonBridge;
  }

  setBrowserEngine(browserEngine: any): void {
    this.browserEngine = browserEngine;
  }

  setPythonBridge(pythonBridge: any): void {
    this.pythonBridge = pythonBridge;
  }

  async executeWorkflow(workflow: StagehandWorkflow): Promise<StagehandExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const screenshots: string[] = [];
    const completedSteps: string[] = [];
    let failedStep: string | undefined;
    let extractedData: any = {};

    try {
      logs.push(`Starting Stagehand workflow: ${workflow.name}`);
      this.activeWorkflows.set(workflow.id, workflow);
      
      // Initialize browser with profile and proxy if specified
      if (!this.browserEngine) {
        throw new Error('Browser engine not initialized');
      }

      const automationTask = {
        id: `stagehand_${workflow.id}`,
        name: workflow.name,
        url: workflow.initialUrl,
        steps: [], // Will be converted from Stagehand steps
        profile: workflow.defaultProfile,
        captchaConfig: workflow.defaultCaptchaConfig,
        proxy: workflow.defaultProxy,
        retries: workflow.retries || 3,
        timeout: workflow.timeout || 60000
      };

      // Execute workflow steps
      for (const step of workflow.steps) {
        try {
          logs.push(`Executing step: ${step.name || step.id} (${step.type})`);
          
          const stepResult = await this.executeStep(step, workflow, logs, screenshots, extractedData);
          
          if (stepResult.success) {
            completedSteps.push(step.id);
            if (stepResult.data) {
              extractedData[step.id] = stepResult.data;
            }
          } else {
            failedStep = step.id;
            logs.push(`Step ${step.id} failed: ${stepResult.error}`);
            
            // Execute onFailure steps if defined
            if (step.onFailure) {
              logs.push(`Executing failure recovery steps for ${step.id}`);
              for (const failureStep of step.onFailure) {
                await this.executeStep(failureStep, workflow, logs, screenshots, extractedData);
              }
            }
            
            // If no failure recovery or recovery failed, break workflow
            if (!stepResult.recovered) {
              break;
            }
          }

          // Execute onSuccess steps if defined
          if (stepResult.success && step.onSuccess) {
            logs.push(`Executing success steps for ${step.id}`);
            for (const successStep of step.onSuccess) {
              await this.executeStep(successStep, workflow, logs, screenshots, extractedData);
            }
          }

        } catch (error) {
          failedStep = step.id;
          logs.push(`Step ${step.id} threw exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
          break;
        }
      }

      const success = !failedStep;
      const duration = Date.now() - startTime;

      logs.push(`Workflow ${workflow.name} ${success ? 'completed successfully' : 'failed'} in ${duration}ms`);

      return {
        success,
        workflowId: workflow.id,
        logs,
        screenshots,
        data: extractedData,
        duration,
        completedSteps,
        failedStep
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logs.push(`Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        workflowId: workflow.id,
        logs,
        screenshots,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        completedSteps,
        failedStep: failedStep || 'unknown'
      };
    } finally {
      this.activeWorkflows.delete(workflow.id);
      this.executionContext.delete(workflow.id);
    }
  }

  private async executeStep(
    step: StagehandStep, 
    workflow: StagehandWorkflow, 
    logs: string[], 
    screenshots: string[], 
    context: any
  ): Promise<{ success: boolean; data?: any; error?: string; recovered?: boolean }> {
    
    try {
      switch (step.type) {
        case StagehandStepType.NAVIGATE:
          return await this.executeNavigateStep(step, logs);
          
        case StagehandStepType.CLICK:
          return await this.executeClickStep(step, logs);
          
        case StagehandStepType.TYPE:
          return await this.executeTypeStep(step, logs, context);
          
        case StagehandStepType.WAIT:
          return await this.executeWaitStep(step, logs);
          
        case StagehandStepType.EXTRACT:
          return await this.executeExtractStep(step, logs);
          
        case StagehandStepType.SCREENSHOT:
          return await this.executeScreenshotStep(step, logs, screenshots);
          
        case StagehandStepType.SOLVE_CAPTCHA:
          return await this.executeSolveCaptchaStep(step, logs, workflow.defaultCaptchaConfig);
          
        case StagehandStepType.VERIFY_EMAIL:
          return await this.executeVerifyEmailStep(step, logs);
          
        case StagehandStepType.CUSTOM_SCRIPT:
          return await this.executeCustomScriptStep(step, logs);
          
        case StagehandStepType.LOOP:
          return await this.executeLoopStep(step, workflow, logs, screenshots, context);
          
        case StagehandStepType.CONDITIONAL:
          return await this.executeConditionalStep(step, workflow, logs, screenshots, context);
          
        case StagehandStepType.PARALLEL:
          return await this.executeParallelStep(step, workflow, logs, screenshots, context);
          
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeNavigateStep(step: StagehandStep, logs: string[]): Promise<{ success: boolean; error?: string }> {
    if (!step.value) {
      return { success: false, error: 'Navigate step requires a URL value' };
    }
    
    logs.push(`Navigating to: ${step.value}`);
    // Implementation would use browser engine
    return { success: true };
  }

  private async executeClickStep(step: StagehandStep, logs: string[]): Promise<{ success: boolean; error?: string }> {
    if (!step.selector) {
      return { success: false, error: 'Click step requires a selector' };
    }
    
    logs.push(`Clicking element: ${step.selector}`);
    // Implementation would use browser engine
    return { success: true };
  }

  private async executeTypeStep(step: StagehandStep, logs: string[], context: any): Promise<{ success: boolean; error?: string }> {
    if (!step.selector || !step.value) {
      return { success: false, error: 'Type step requires selector and value' };
    }
    
    // Support dynamic values from context
    let valueToType = step.value;
    if (typeof step.value === 'string' && step.value.startsWith('{{') && step.value.endsWith('}}')) {
      const contextKey = step.value.slice(2, -2);
      valueToType = context[contextKey] || step.value;
    }
    
    logs.push(`Typing into ${step.selector}: ${valueToType}`);
    // Implementation would use browser engine
    return { success: true };
  }

  private async executeWaitStep(step: StagehandStep, logs: string[]): Promise<{ success: boolean; error?: string }> {
    const timeout = step.timeout || 5000;
    
    if (step.selector) {
      logs.push(`Waiting for element: ${step.selector} (timeout: ${timeout}ms)`);
    } else {
      const waitTime = parseInt(step.value as string) || timeout;
      logs.push(`Waiting for ${waitTime}ms`);
    }
    
    // Implementation would use browser engine
    return { success: true };
  }

  private async executeExtractStep(step: StagehandStep, logs: string[]): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!step.selector) {
      return { success: false, error: 'Extract step requires a selector' };
    }
    
    logs.push(`Extracting data from: ${step.selector}`);
    // Implementation would use browser engine to extract data
    const extractedData = `extracted_data_from_${step.selector}`;
    
    return { success: true, data: extractedData };
  }

  private async executeScreenshotStep(step: StagehandStep, logs: string[], screenshots: string[]): Promise<{ success: boolean; error?: string }> {
    logs.push('Taking screenshot');
    // Implementation would use browser engine
    const screenshot = `screenshot_${Date.now()}`;
    screenshots.push(screenshot);
    
    return { success: true };
  }

  private async executeSolveCaptchaStep(step: StagehandStep, logs: string[], captchaConfig?: CaptchaConfig): Promise<{ success: boolean; error?: string }> {
    logs.push('Attempting to solve CAPTCHA');
    
    if (!captchaConfig) {
      return { success: false, error: 'CAPTCHA configuration not provided' };
    }
    
    // Implementation would use CAPTCHA solving service
    return { success: true };
  }

  private async executeVerifyEmailStep(step: StagehandStep, logs: string[]): Promise<{ success: boolean; error?: string }> {
    logs.push('Verifying email');
    
    // Implementation would use email manager and Python bridge
    if (this.pythonBridge) {
      // Use Python script to extract verification link
    }
    
    return { success: true };
  }

  private async executeCustomScriptStep(step: StagehandStep, logs: string[]): Promise<{ success: boolean; error?: string }> {
    if (!step.customScript) {
      return { success: false, error: 'Custom script step requires script path' };
    }
    
    logs.push(`Executing custom script: ${step.customScript}`);
    
    if (this.pythonBridge) {
      const result = await this.pythonBridge.runScript({
        script: step.customScript,
        args: step.value ? [JSON.stringify(step.value)] : []
      });
      
      return { success: result.success, error: result.stderr };
    }
    
    return { success: true };
  }

  private async executeLoopStep(
    step: StagehandStep, 
    workflow: StagehandWorkflow, 
    logs: string[], 
    screenshots: string[], 
    context: any
  ): Promise<{ success: boolean; error?: string }> {
    if (!step.steps || !step.iterations) {
      return { success: false, error: 'Loop step requires steps and iterations' };
    }
    
    logs.push(`Starting loop with ${step.iterations} iterations`);
    
    for (let i = 0; i < step.iterations; i++) {
      logs.push(`Loop iteration ${i + 1}/${step.iterations}`);
      
      for (const loopStep of step.steps) {
        const result = await this.executeStep(loopStep, workflow, logs, screenshots, context);
        if (!result.success) {
          return { success: false, error: `Loop failed at iteration ${i + 1}: ${result.error}` };
        }
      }
    }
    
    return { success: true };
  }

  private async executeConditionalStep(
    step: StagehandStep, 
    workflow: StagehandWorkflow, 
    logs: string[], 
    screenshots: string[], 
    context: any
  ): Promise<{ success: boolean; error?: string }> {
    if (!step.condition || !step.steps) {
      return { success: false, error: 'Conditional step requires condition and steps' };
    }
    
    logs.push(`Evaluating condition: ${step.condition}`);
    
    // Simple condition evaluation (can be enhanced)
    const conditionMet = this.evaluateCondition(step.condition, context);
    
    if (conditionMet) {
      logs.push('Condition met, executing steps');
      for (const conditionalStep of step.steps) {
        const result = await this.executeStep(conditionalStep, workflow, logs, screenshots, context);
        if (!result.success) {
          return result;
        }
      }
    } else {
      logs.push('Condition not met, skipping steps');
    }
    
    return { success: true };
  }

  private async executeParallelStep(
    step: StagehandStep, 
    workflow: StagehandWorkflow, 
    logs: string[], 
    screenshots: string[], 
    context: any
  ): Promise<{ success: boolean; error?: string }> {
    if (!step.steps) {
      return { success: false, error: 'Parallel step requires steps' };
    }
    
    const limit = step.parallelLimit || step.steps.length;
    logs.push(`Executing ${step.steps.length} steps in parallel (limit: ${limit})`);
    
    // Execute steps in parallel with concurrency limit
    const results = await this.executeStepsInParallel(step.steps, workflow, logs, screenshots, context, limit);
    
    const failed = results.find(r => !r.success);
    if (failed) {
      return { success: false, error: failed.error };
    }
    
    return { success: true };
  }

  private async executeStepsInParallel(
    steps: StagehandStep[], 
    workflow: StagehandWorkflow, 
    logs: string[], 
    screenshots: string[], 
    context: any, 
    limit: number
  ): Promise<{ success: boolean; error?: string }[]> {
    const results: { success: boolean; error?: string }[] = [];
    
    // Simple parallel execution (can be enhanced with proper concurrency control)
    const promises = steps.map(step => 
      this.executeStep(step, workflow, logs, screenshots, context)
    );
    
    const parallelResults = await Promise.all(promises);
    return parallelResults;
  }

  private evaluateCondition(condition: string, context: any): boolean {
    // Simple condition evaluation - can be enhanced with a proper expression parser
    try {
      // Replace context variables in condition
      let evaluatedCondition = condition;
      Object.keys(context).forEach(key => {
        evaluatedCondition = evaluatedCondition.replace(
          new RegExp(`{{${key}}}`, 'g'), 
          JSON.stringify(context[key])
        );
      });
      
      // Basic condition evaluation (unsafe - should use a proper parser in production)
      return eval(evaluatedCondition);
    } catch (error) {
      return false;
    }
  }

  async pauseWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      // Implementation for pausing workflow
      return true;
    }
    return false;
  }

  async resumeWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      // Implementation for resuming workflow
      return true;
    }
    return false;
  }

  async cancelWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      this.activeWorkflows.delete(workflowId);
      this.executionContext.delete(workflowId);
      return true;
    }
    return false;
  }

  getActiveWorkflows(): StagehandWorkflow[] {
    return Array.from(this.activeWorkflows.values());
  }
}