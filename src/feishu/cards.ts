/**
 * Feishu interactive card message utilities
 */

import type * as lark from "@larksuiteoapi/node-sdk";
import { sendMessage, type ReceiveIdType, type SendMessageResult } from "./messages.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("feishu-cards");

/**
 * Card element types
 */
export interface CardHeader {
  title: {
    tag: "plain_text";
    content: string;
  };
  template?: "blue" | "wathet" | "turquoise" | "green" | "yellow" | "orange" | "red" | "carmine" | "violet" | "purple" | "indigo" | "grey";
}

export interface TextElement {
  tag: "div";
  text: {
    tag: "plain_text" | "lark_md";
    content: string;
  };
}

export interface MarkdownElement {
  tag: "markdown";
  content: string;
}

export interface ButtonAction {
  tag: "button";
  text: {
    tag: "plain_text";
    content: string;
  };
  type?: "default" | "primary" | "danger";
  value?: Record<string, unknown>;
  confirm?: {
    title: { tag: "plain_text"; content: string };
    text: { tag: "plain_text"; content: string };
  };
}

export interface ActionElement {
  tag: "action";
  actions: ButtonAction[];
}

export interface HrElement {
  tag: "hr";
}

export interface NoteElement {
  tag: "note";
  elements: Array<{
    tag: "plain_text" | "lark_md";
    content: string;
  }>;
}

export type CardElement = TextElement | MarkdownElement | ActionElement | HrElement | NoteElement;

export interface InteractiveCard {
  config?: {
    wide_screen_mode?: boolean;
    enable_forward?: boolean;
  };
  header?: CardHeader;
  elements: CardElement[];
}

/**
 * Build a simple text card
 */
export function buildTextCard(
  title: string,
  content: string,
  template: CardHeader["template"] = "blue"
): InteractiveCard {
  return {
    config: {
      wide_screen_mode: true,
      enable_forward: true,
    },
    header: {
      title: { tag: "plain_text", content: title },
      template,
    },
    elements: [
      {
        tag: "markdown",
        content,
      },
    ],
  };
}

/**
 * Build a card with actions
 */
export function buildActionCard(
  title: string,
  content: string,
  actions: Array<{
    text: string;
    type?: "default" | "primary" | "danger";
    value?: Record<string, unknown>;
  }>,
  template: CardHeader["template"] = "blue"
): InteractiveCard {
  return {
    config: {
      wide_screen_mode: true,
      enable_forward: true,
    },
    header: {
      title: { tag: "plain_text", content: title },
      template,
    },
    elements: [
      {
        tag: "markdown",
        content,
      },
      {
        tag: "action",
        actions: actions.map((action) => ({
          tag: "button",
          text: { tag: "plain_text", content: action.text },
          type: action.type ?? "default",
          value: action.value,
        })),
      },
    ],
  };
}

/**
 * Build a status card (success/error/warning/info)
 */
export function buildStatusCard(
  status: "success" | "error" | "warning" | "info",
  title: string,
  content: string
): InteractiveCard {
  const templateMap: Record<string, CardHeader["template"]> = {
    success: "green",
    error: "red",
    warning: "orange",
    info: "blue",
  };

  const iconMap: Record<string, string> = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  return {
    config: {
      wide_screen_mode: true,
      enable_forward: true,
    },
    header: {
      title: { tag: "plain_text", content: `${iconMap[status]} ${title}` },
      template: templateMap[status],
    },
    elements: [
      {
        tag: "markdown",
        content,
      },
    ],
  };
}

/**
 * Send an interactive card message
 */
export async function sendCardMessage(
  client: lark.Client,
  receiveId: string,
  card: InteractiveCard,
  receiveIdType: ReceiveIdType = "chat_id"
): Promise<SendMessageResult> {
  const content = JSON.stringify(card);
  return sendMessage(client, {
    receiveId,
    receiveIdType,
    msgType: "interactive",
    content,
  });
}

/**
 * Update a card message
 */
export async function updateCardMessage(
  client: lark.Client,
  messageId: string,
  card: InteractiveCard
): Promise<boolean> {
  try {
    const response = await client.im.message.patch({
      path: { message_id: messageId },
      data: {
        content: JSON.stringify(card),
      },
    });

    if (response.code === 0) {
      logger.debug("Card updated successfully", { messageId });
      return true;
    }

    logger.error("Failed to update card", { code: response.code, msg: response.msg });
    return false;
  } catch (error) {
    logger.error("Failed to update card", { messageId, error });
    return false;
  }
}
