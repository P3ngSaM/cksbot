/**
 * Web search tool using UAPI Pro Search
 * https://uapis.cn/api/v1/search/aggregate
 */

import type { AgentTool, ToolContext, ToolExecutionResult } from "./common.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("web-search");

/**
 * UAPI Pro Search configuration
 */
interface SearchConfig {
  apiKey?: string;
  endpoint?: string;
}

/**
 * Get search configuration from environment or config
 */
function getSearchConfig(context: ToolContext): SearchConfig {
  return {
    apiKey: context.config.services?.uapiSearch?.apiKey || process.env['UAPI_SEARCH_KEY'],
    endpoint: context.config.services?.uapiSearch?.endpoint || "https://uapis.cn/api/v1/search/aggregate",
  };
}

/**
 * Search the web using UAPI Pro Search
 */
async function searchWeb(
  query: string,
  options: {
    site?: string;
    fileType?: string;
    sort?: "relevance" | "date";
    timeRange?: "day" | "week" | "month" | "year";
  },
  config: SearchConfig
): Promise<{ success: boolean; results?: unknown; error?: string }> {
  // UAPI Search is free, no API key needed
  // If apiKey is provided, it will be used; otherwise proceed without auth

  try {
    // Add current date to query to get fresh results
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const enhancedQuery = `${query} ${dateStr}`;

    logger.debug("Searching web", { query: enhancedQuery, options });

    const requestBody: Record<string, string> = { query: enhancedQuery };
    if (options.site) requestBody['site'] = options.site;
    if (options.fileType) requestBody['filetype'] = options.fileType;
    if (options.sort) requestBody['sort'] = options.sort;
    if (options.timeRange) requestBody['time_range'] = options.timeRange;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if configured (optional)
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(config.endpoint!, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Search API error", { status: response.status, error: errorText });

      // Only fallback to browser if API completely fails
      // Don't open browser automatically - just inform the user
      return {
        success: true,
        results: {
          error: true,
          message: `搜索 API 暂时不可用 (${response.status})。`,
          suggestion: `如需查看更多结果，可以访问：https://www.bing.com/search?q=${encodeURIComponent(query)}`,
        },
      };
    }

    const data = await response.json();

    // Type the response data
    interface SearchResponse {
      results?: Array<unknown>;
    }
    const searchData = data as SearchResponse;

    logger.debug("Search completed", { resultCount: searchData.results?.length || 0 });

    return {
      success: true,
      results: searchData,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Search failed", { error: errorMessage });

    // Don't open browser automatically - just inform the user
    return {
      success: true,
      results: {
        error: true,
        message: `搜索遇到网络问题。`,
        suggestion: `如需查看更多结果，可以访问：https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      },
    };
  }
}

/**
 * Web search tool
 */
const webSearchTool: AgentTool = {
  name: "web_search",
  description: `Search the web for current information, news, facts, or data.

Returns structured search results with title, URL, snippet, and publish time.
Use the results to answer user questions directly - do NOT open URLs automatically.

Examples:
- "今天北京的天气" → web_search(query: "北京天气")
- "特斯拉股票价格" → web_search(query: "TSLA stock price")
- "人工智能最新新闻" → web_search(query: "AI news", timeRange: "week")

Note: Current date is automatically added to queries for fresh results.`,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query in Chinese or English",
      },
      site: {
        type: "string",
        description: "Optional: Limit search to specific site (e.g., 'github.com')",
      },
      fileType: {
        type: "string",
        description: "Optional: Filter by file type (e.g., 'pdf', 'doc')",
      },
      sort: {
        type: "string",
        enum: ["relevance", "date"],
        description: "Optional: Sort by relevance or date (default: relevance)",
      },
      timeRange: {
        type: "string",
        enum: ["day", "week", "month", "year"],
        description: "Optional: Limit to recent results (e.g., 'week' for past week)",
      },
    },
    required: ["query"],
  },
  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolExecutionResult> {
    const query = input['query'] as string;
    if (!query) {
      return {
        success: false,
        error: "Query is required",
      };
    }

    const options = {
      site: input['site'] as string | undefined,
      fileType: input['fileType'] as string | undefined,
      sort: input['sort'] as "relevance" | "date" | undefined,
      timeRange: input['timeRange'] as "day" | "week" | "month" | "year" | undefined,
    };

    const config = getSearchConfig(context);
    const searchResult = await searchWeb(query, options, config);

    if (!searchResult.success) {
      return {
        success: false,
        error: searchResult.error,
      };
    }

    // Format results for the AI
    interface ErrorMessage {
      error?: boolean;
      message?: string;
      suggestion?: string;
    }
    const results = searchResult.results as ErrorMessage;

    // If it's an error message
    if (results['error']) {
      return {
        success: true,
        result: `${results['message']} ${results['suggestion'] || ''}`,
      };
    }

    // Format API results
    return {
      success: true,
      result: results,
    };
  },
};

/**
 * Create web search tools
 */
export function createWebSearchTools(): AgentTool[] {
  return [webSearchTool];
}
