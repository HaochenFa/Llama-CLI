// src/lib/adapters/ollama.adapter.ts

import axios, {AxiosResponse} from 'axios';
import {LLMAdapter} from './base.adapter.js';
import {ChatMessage} from '../../types/context.js';

/**
 * OllamaAdapter 实现了 LLMAdapter 接口，用于与 Ollama 后端进行交互。
 * 它处理与 Ollama API 的 HTTP 通信，并以流式方式返回 LLM 生成的文本。
 */
export class OllamaAdapter implements LLMAdapter {
  private ollamaEndpoint: string;

  constructor(endpoint: string) {
    this.ollamaEndpoint = endpoint;
  }

  /**
   * 以流式方式与 Ollama LLM 进行聊天交互。
   * @param messages 聊天消息数组，包含对话历史。
   * @returns 一个异步可迭代对象，每次迭代返回 LLM 生成的文本片段。
   */
  public async* chatStream(messages: ChatMessage[]): AsyncIterable<string> {
    try {
      const payload = {
        model: 'qwen3:0.6b', // 默认使用 qwen3:0.6b 模型，方便本地测试
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      };

      const response: AxiosResponse = await axios.post(
        `${this.ollamaEndpoint}/api/chat`,
        payload,
        {
          responseType: 'stream',
        }
      );

      const reader = response.data;
      let buffer = '';

      for await (const chunk of reader) {
        buffer += chunk.toString();
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.substring(0, newlineIndex).trim();
          buffer = buffer.substring(newlineIndex + 1);

          if (line) {
            try {
              const data = JSON.parse(line);
              if (data.done === false && data.message?.content) {
                yield data.message.content;
              } else if (data.done === true) {
                // 结束标志，可以处理最终的统计信息等
                break; // 退出循环
              }
            } catch (parseError) {
              console.error('Error parsing Ollama stream chunk:', parseError);
              // 可以在这里选择抛出错误或继续处理下一行
            }
          }
        }
      }
    } catch (error) {
      console.error('Error communicating with Ollama API:', (error as Error).message);
      throw new Error(`Failed to connect to Ollama: ${(error as Error).message}`);
    }
  }
}
