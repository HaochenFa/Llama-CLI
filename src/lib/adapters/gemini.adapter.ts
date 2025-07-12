// src/lib/adapters/gemini.adapter.ts

import axios, { AxiosResponse } from 'axios';
import { ChatMessage, ToolCallPayload, ToolDefinition } from '../../types/context.js';
import { LLMAdapter } from './base.adapter.js';

/**
 * GeminiAdapter 实现了 LLMAdapter 接口，用于与 Google Gemini API 进行交互。
 * 支持 Gemini Pro、Gemini Pro Vision 等模型，以及流式响应和工具调用。
 */
export class GeminiAdapter implements LLMAdapter {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private debug: boolean;

  constructor(
    apiKey: string, 
    debug: boolean = false, 
    model: string = 'gemini-pro',
    baseURL: string = 'https://generativelanguage.googleapis.com'
  ) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.model = model;
    this.debug = debug;
  }

  /**
   * 以流式方式与 Gemini API 进行聊天交互。
   * @param messages 聊天消息数组，包含对话历史。
   * @param tools 可用的工具定义数组。
   * @returns 一个异步可迭代对象，每次迭代返回 LLM 生成的文本片段或工具调用负载。
   */
  public async* chatStream(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<string | ToolCallPayload> {
    try {
      // 转换消息格式为 Gemini 格式
      const geminiMessages = this.convertMessages(messages);
      
      // 构建 Gemini API 请求负载
      const payload: any = {
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      };

      // 添加工具定义（如果提供）
      if (tools && tools.length > 0) {
        payload.tools = [{
          functionDeclarations: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters || tool.schema,
          }))
        }];
      }

      if (this.debug) {
        console.log('Gemini Request Payload:', JSON.stringify(payload, null, 2));
      }

      // 发送请求到 Gemini API
      const endpoint = `${this.baseURL}/v1beta/models/${this.model}:streamGenerateContent`;
      const response: AxiosResponse = await axios.post(
        endpoint,
        payload,
        {
          responseType: 'stream',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
            'Accept': 'text/event-stream'
          },
          params: {
            alt: 'sse'
          }
        }
      );

      const reader = response.data;
      let buffer = '';

      for await (const chunk of reader) {
        buffer += chunk.toString();
        let newlineIndex;

        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (this.debug) {
                console.log('Gemini Response Chunk:', parsed);
              }

              const candidate = parsed.candidates?.[0];
              if (!candidate) continue;

              const content = candidate.content;
              if (!content) continue;

              // 处理内容部分
              for (const part of content.parts || []) {
                // 处理文本内容
                if (part.text) {
                  yield part.text;
                }

                // 处理工具调用
                if (part.functionCall) {
                  yield {
                    type: 'tool_call',
                    tool_call_id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: part.functionCall.name,
                    arguments: part.functionCall.args || {}
                  } as ToolCallPayload;
                }
              }

            } catch (e) {
              if (this.debug) {
                console.warn('Failed to parse Gemini response chunk:', data);
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (this.debug) {
        console.error('Gemini API Error:', error.response?.data || error.message);
      }
      throw new Error(`Gemini API request failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * 转换消息格式为 Gemini 格式
   */
  private convertMessages(messages: ChatMessage[]): any[] {
    const geminiMessages: any[] = [];
    
    for (const msg of messages) {
      switch (msg.role) {
        case 'system':
          // Gemini 将系统消息作为第一条用户消息的前缀
          if (geminiMessages.length === 0) {
            geminiMessages.push({
              role: 'user',
              parts: [{ text: msg.content }]
            });
          }
          break;
        
        case 'user':
          geminiMessages.push({
            role: 'user',
            parts: [{ text: msg.content }]
          });
          break;
        
        case 'assistant':
          const parts: any[] = [{ text: msg.content }];
          
          // 添加工具调用
          if (msg.tool_calls) {
            for (const toolCall of msg.tool_calls) {
              parts.push({
                functionCall: {
                  name: toolCall.function.name,
                  args: JSON.parse(toolCall.function.arguments || '{}')
                }
              });
            }
          }
          
          geminiMessages.push({
            role: 'model',
            parts
          });
          break;
        
        case 'tool':
          // 工具响应消息
          geminiMessages.push({
            role: 'function',
            parts: [{
              functionResponse: {
                name: msg.tool_call_id, // 使用 tool_call_id 作为函数名
                response: {
                  content: msg.content
                }
              }
            }]
          });
          break;
      }
    }
    
    return geminiMessages;
  }

  /**
   * 测试与 Gemini API 的连接。
   * @returns Promise<{success: boolean, error?: string, models?: string[]}> 连接测试结果
   */
  public async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      // 尝试获取可用模型列表来测试连接
      const response = await axios.get(`${this.baseURL}/v1beta/models`, {
        timeout: 10000,
        headers: {
          'x-goog-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data && response.data.models) {
        const models = response.data.models
          .filter((model: any) => model.name.includes('gemini'))
          .map((model: any) => model.name.split('/').pop())
          .slice(0, 10);
        
        return { 
          success: true, 
          models: models.length > 0 ? models : ['gemini-pro', 'gemini-pro-vision']
        };
      } else {
        return { 
          success: false, 
          error: 'Invalid response from Gemini API' 
        };
      }
    } catch (error: any) {
      // 如果模型列表获取失败，尝试简单的生成测试
      try {
        const testPayload = {
          contents: [{
            parts: [{ text: 'Hello' }]
          }],
          generationConfig: {
            maxOutputTokens: 5
          }
        };

        await axios.post(
          `${this.baseURL}/v1beta/models/${this.model}:generateContent`,
          testPayload,
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': this.apiKey
            }
          }
        );

        return {
          success: true,
          models: ['gemini-pro', 'gemini-pro-vision']
        };
      } catch (testError: any) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        return { 
          success: false, 
          error: `Gemini API connection failed: ${errorMessage}` 
        };
      }
    }
  }

  /**
   * 获取当前配置的模型名称
   */
  public getModel(): string {
    return this.model;
  }

  /**
   * 设置模型名称
   */
  public setModel(model: string): void {
    this.model = model;
  }
}
