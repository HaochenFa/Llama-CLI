/**
 * Mock Service Worker handlers for API testing
 */

import { http, HttpResponse } from 'msw';

// Mock LLM API responses
export const llmHandlers = [
  // OpenAI API mock
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a mock response from OpenAI API',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    });
  }),

  // Claude API mock
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'This is a mock response from Claude API',
        },
      ],
      model: 'claude-3-sonnet-20240229',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 10,
        output_tokens: 20,
      },
    });
  }),

  // Gemini API mock
  http.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent', () => {
    return HttpResponse.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'This is a mock response from Gemini API',
              },
            ],
            role: 'model',
          },
          finishReason: 'STOP',
          index: 0,
        },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 20,
        totalTokenCount: 30,
      },
    });
  }),

  // Ollama API mock
  http.post('http://localhost:11434/api/chat', () => {
    return HttpResponse.json({
      model: 'llama2',
      created_at: new Date().toISOString(),
      message: {
        role: 'assistant',
        content: 'This is a mock response from Ollama API',
      },
      done: true,
    });
  }),
];

// Mock network request handlers
export const networkHandlers = [
  // Generic HTTP request mock
  http.get('https://httpbin.org/get', () => {
    return HttpResponse.json({
      args: {},
      headers: {
        'User-Agent': 'LlamaCLI/1.0.0',
      },
      origin: '127.0.0.1',
      url: 'https://httpbin.org/get',
    });
  }),

  // Error response mock
  http.get('https://httpbin.org/status/500', () => {
    return new HttpResponse(null, { status: 500 });
  }),
];

// All handlers combined
export const handlers = [...llmHandlers, ...networkHandlers];
