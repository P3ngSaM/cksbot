/**
 * Feishu calendar tools
 */

import type { AgentTool, ToolContext, ToolExecutionResult } from "./common.js";
import { getFeishuClient } from "../../feishu/client.js";

/**
 * Create calendar tools
 */
export function createCalendarTools(): AgentTool[] {
  return [
    createListEventsTools(),
    createCreateEventTool(),
    createGetEventTool(),
  ];
}

/**
 * List calendar events tool
 */
function createListEventsTools(): AgentTool {
  return {
    name: "feishu_list_events",
    description: "获取日历事件列表。可以查看指定时间范围内的日程安排。",
    inputSchema: {
      type: "object",
      properties: {
        calendar_id: {
          type: "string",
          description: "日历ID，默认为主日历。可以使用'primary'表示主日历。",
        },
        start_time: {
          type: "string",
          description: "开始时间，ISO 8601格式，如 2024-01-01T00:00:00+08:00",
        },
        end_time: {
          type: "string",
          description: "结束时间，ISO 8601格式",
        },
        page_size: {
          type: "number",
          description: "每页返回的事件数量，默认20，最大50",
        },
      },
      required: ["start_time", "end_time"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const feishuConfig = context.config.channels.feishu;
      if (!feishuConfig) {
        return { success: false, error: "Feishu not configured" };
      }

      const calendarId = (input["calendar_id"] as string) ?? "primary";
      const startTime = input["start_time"] as string;
      const endTime = input["end_time"] as string;
      const pageSize = (input["page_size"] as number) ?? 20;

      try {
        const client = getFeishuClient(feishuConfig);

        const response = await client.calendar.calendarEvent.list({
          path: { calendar_id: calendarId },
          params: {
            start_time: startTime,
            end_time: endTime,
            page_size: pageSize,
          },
        });

        if (response.code === 0 && response.data?.items) {
          const events = response.data.items.map((event) => ({
            eventId: event.event_id,
            summary: event.summary,
            description: event.description,
            startTime: event.start_time?.timestamp,
            endTime: event.end_time?.timestamp,
            location: event.location?.name,
            status: event.status,
          }));

          return {
            success: true,
            result: { events, total: events.length },
          };
        }

        return {
          success: false,
          error: response.msg ?? "Failed to list events",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };
}

/**
 * Create calendar event tool
 */
function createCreateEventTool(): AgentTool {
  return {
    name: "feishu_create_event",
    description: "创建日历事件。可以创建会议、提醒等日程。",
    inputSchema: {
      type: "object",
      properties: {
        calendar_id: {
          type: "string",
          description: "日历ID，默认为主日历",
        },
        summary: {
          type: "string",
          description: "事件标题",
        },
        description: {
          type: "string",
          description: "事件描述",
        },
        start_time: {
          type: "string",
          description: "开始时间，Unix时间戳（秒）",
        },
        end_time: {
          type: "string",
          description: "结束时间，Unix时间戳（秒）",
        },
        location: {
          type: "string",
          description: "地点",
        },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "参会人员的open_id列表",
        },
      },
      required: ["summary", "start_time", "end_time"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const feishuConfig = context.config.channels.feishu;
      if (!feishuConfig) {
        return { success: false, error: "Feishu not configured" };
      }

      const calendarId = (input["calendar_id"] as string) ?? "primary";
      const summary = input["summary"] as string;
      const description = input["description"] as string | undefined;
      const startTime = input["start_time"] as string;
      const endTime = input["end_time"] as string;
      const location = input["location"] as string | undefined;
      const attendees = input["attendees"] as string[] | undefined;

      try {
        const client = getFeishuClient(feishuConfig);

        const response = await client.calendar.calendarEvent.create({
          path: { calendar_id: calendarId },
          data: {
            summary,
            description,
            start_time: { timestamp: startTime },
            end_time: { timestamp: endTime },
            location: location ? { name: location } : undefined,
            attendee_ability: attendees ? "can_modify_event" : undefined,
          },
        });

        if (response.code === 0 && response.data?.event) {
          return {
            success: true,
            result: {
              eventId: response.data.event.event_id,
              summary: response.data.event.summary,
              status: "created",
            },
          };
        }

        return {
          success: false,
          error: response.msg ?? "Failed to create event",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };
}

/**
 * Get calendar event tool
 */
function createGetEventTool(): AgentTool {
  return {
    name: "feishu_get_event",
    description: "获取日历事件详情。",
    inputSchema: {
      type: "object",
      properties: {
        calendar_id: {
          type: "string",
          description: "日历ID，默认为主日历",
        },
        event_id: {
          type: "string",
          description: "事件ID",
        },
      },
      required: ["event_id"],
    },
    execute: async (input, context): Promise<ToolExecutionResult> => {
      const feishuConfig = context.config.channels.feishu;
      if (!feishuConfig) {
        return { success: false, error: "Feishu not configured" };
      }

      const calendarId = (input["calendar_id"] as string) ?? "primary";
      const eventId = input["event_id"] as string;

      try {
        const client = getFeishuClient(feishuConfig);

        const response = await client.calendar.calendarEvent.get({
          path: {
            calendar_id: calendarId,
            event_id: eventId,
          },
        });

        if (response.code === 0 && response.data?.event) {
          const event = response.data.event;
          return {
            success: true,
            result: {
              eventId: event.event_id,
              summary: event.summary,
              description: event.description,
              startTime: event.start_time?.timestamp,
              endTime: event.end_time?.timestamp,
              location: event.location?.name,
              status: event.status,
              organizer: event.organizer_calendar_id,
            },
          };
        }

        return {
          success: false,
          error: response.msg ?? "Failed to get event",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  };
}
