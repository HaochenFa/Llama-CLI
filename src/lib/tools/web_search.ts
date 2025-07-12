import { ToolDefinition } from "../../types/context.js";
import axios from "axios";

export const web_search_tool: ToolDefinition = {
  type: "native",
  name: "web_search",
  description:
    "Searches the web for information using a search query. Returns a list of search results with titles, URLs, and snippets.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "The search query to execute (e.g., 'TypeScript best practices', 'how to fix npm install error').",
      },
      num_results: {
        type: "number",
        description: "Optional: Number of search results to return (default: 5, max: 10).",
        default: 5,
        minimum: 1,
        maximum: 10,
      },
      safe_search: {
        type: "boolean",
        description: "Optional: Enable safe search filtering (default: true).",
        default: true,
      },
    },
    required: ["query"],
  },
  invoke: async (args: { query: string; num_results?: number; safe_search?: boolean }) => {
    const { query, num_results = 5, safe_search = true } = args;

    if (!query.trim()) {
      throw new Error("Search query cannot be empty.");
    }

    try {
      // For this implementation, we'll use DuckDuckGo's instant answer API
      // which doesn't require API keys and respects privacy
      const searchUrl = "https://api.duckduckgo.com/";

      const params = {
        q: query.trim(),
        format: "json",
        no_html: "1",
        skip_disambig: "1",
        safe_search: safe_search ? "strict" : "moderate",
      };

      const response = await axios.get(searchUrl, {
        params,
        timeout: 10000, // 10 second timeout
        headers: {
          "User-Agent": "LlamaCLI/1.0 (Educational Tool)",
        },
      });

      const data = response.data;

      // Format the results
      let results = [];

      // Add instant answer if available
      if (data.Abstract && data.Abstract.trim()) {
        results.push({
          title: data.Heading || "Instant Answer",
          url: data.AbstractURL || "",
          snippet: data.Abstract,
          type: "instant_answer",
        });
      }

      // Add related topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        const topics = data.RelatedTopics.filter((topic: any) => topic.Text && topic.FirstURL)
          .slice(0, Math.max(0, num_results - results.length))
          .map((topic: any) => ({
            title: topic.Text.split(" - ")[0] || "Related Topic",
            url: topic.FirstURL,
            snippet: topic.Text,
            type: "related_topic",
          }));

        results.push(...topics);
      }

      // If we don't have enough results, try to get more from the answer
      if (results.length === 0) {
        // Fallback: Use a simple web search approach
        // Note: In a production environment, you would use a proper search API
        // like Google Custom Search, Bing Search API, or SerpAPI

        return `Search completed for "${query}". 

Note: This is a basic search implementation. For better results, consider:
1. Using Google Custom Search API
2. Using Bing Search API  
3. Using SerpAPI or similar services

The current implementation uses DuckDuckGo's instant answer API, which provides limited results but respects privacy and doesn't require API keys.

To improve web search functionality, you can:
- Set up a Google Custom Search Engine and API key
- Configure environment variables for search API credentials
- Implement more sophisticated result parsing and ranking

Search query: "${query}"
Results: Limited instant answers and related topics available.`;
      }

      // Format the final output
      const formattedResults = results
        .slice(0, num_results)
        .map((result, index) => {
          return `${index + 1}. **${result.title}**
   URL: ${result.url}
   ${result.snippet}
   Type: ${result.type}`;
        })
        .join("\n\n");

      return `Web search results for "${query}":\n\n${formattedResults}\n\nNote: Results provided by DuckDuckGo instant answer API. For more comprehensive search results, consider configuring a dedicated search API.`;
    } catch (error: any) {
      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        return `Error: Unable to connect to search service. Please check your internet connection.`;
      } else if (error.code === "ETIMEDOUT") {
        return `Error: Search request timed out. Please try again with a simpler query.`;
      } else {
        return `Error performing web search: ${(error as Error).message}`;
      }
    }
  },
};
