/**
 * Channel registry
 */

import type { ChannelPlugin } from "../plugins/types.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("channel-registry");

/**
 * Channel status
 */
export interface ChannelState {
  plugin: ChannelPlugin;
  status: "idle" | "starting" | "running" | "stopping" | "error";
  startedAt?: Date;
  error?: string;
}

/**
 * Channel registry
 */
const channels = new Map<string, ChannelState>();

/**
 * Register a channel
 */
export function registerChannel(plugin: ChannelPlugin): void {
  if (channels.has(plugin.id)) {
    logger.warn(`Channel ${plugin.id} already registered, replacing`);
  }

  channels.set(plugin.id, {
    plugin,
    status: "idle",
  });

  logger.info(`Registered channel: ${plugin.id}`);
}

/**
 * Unregister a channel
 */
export function unregisterChannel(id: string): void {
  const state = channels.get(id);
  if (state && state.status === "running") {
    logger.warn(`Unregistering running channel: ${id}`);
  }
  channels.delete(id);
  logger.info(`Unregistered channel: ${id}`);
}

/**
 * Get a channel by ID
 */
export function getChannel(id: string): ChannelState | undefined {
  return channels.get(id);
}

/**
 * Get all channels
 */
export function getAllChannels(): ChannelState[] {
  return [...channels.values()];
}

/**
 * Update channel status
 */
export function updateChannelStatus(
  id: string,
  status: ChannelState["status"],
  error?: string
): void {
  const state = channels.get(id);
  if (state) {
    state.status = status;
    state.error = error;
    if (status === "running") {
      state.startedAt = new Date();
    }
    logger.debug(`Channel ${id} status: ${status}`);
  }
}

/**
 * Check if a channel is running
 */
export function isChannelRunning(id: string): boolean {
  const state = channels.get(id);
  return state?.status === "running";
}

/**
 * Get running channels
 */
export function getRunningChannels(): ChannelState[] {
  return [...channels.values()].filter((s) => s.status === "running");
}
