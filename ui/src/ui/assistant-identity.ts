/**
 * Assistant Identity - 助手身份管理
 * Based on ClawBot's identity pattern
 */

const MAX_ASSISTANT_NAME = 50;
const MAX_ASSISTANT_AVATAR = 200;

export const DEFAULT_ASSISTANT_NAME = "AI 助手";
export const DEFAULT_ASSISTANT_AVATAR = "F";

export interface AssistantIdentity {
  agentId?: string | null;
  name: string;
  avatar: string | null;
}

export interface UserIdentity {
  userId?: string | null;
  name: string;
  avatar: string | null;
}

declare global {
  interface Window {
    __FEISHUPILOT_ASSISTANT_NAME__?: string;
    __FEISHUPILOT_ASSISTANT_AVATAR__?: string;
  }
}

function coerceIdentityValue(value: string | undefined, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength);
}

export function normalizeAssistantIdentity(
  input?: Partial<AssistantIdentity> | null,
): AssistantIdentity {
  const name =
    coerceIdentityValue(input?.name, MAX_ASSISTANT_NAME) ?? DEFAULT_ASSISTANT_NAME;
  const avatar = coerceIdentityValue(input?.avatar ?? undefined, MAX_ASSISTANT_AVATAR) ?? null;
  const agentId =
    typeof input?.agentId === "string" && input.agentId.trim()
      ? input.agentId.trim()
      : null;
  return { agentId, name, avatar };
}

export function normalizeUserIdentity(
  input?: Partial<UserIdentity> | null,
): UserIdentity {
  const name =
    coerceIdentityValue(input?.name, MAX_ASSISTANT_NAME) ?? "";
  const avatar = coerceIdentityValue(input?.avatar ?? undefined, MAX_ASSISTANT_AVATAR) ?? null;
  const userId =
    typeof input?.userId === "string" && input.userId.trim()
      ? input.userId.trim()
      : null;
  return { userId, name, avatar };
}

export function resolveInjectedAssistantIdentity(): AssistantIdentity {
  if (typeof window === "undefined") {
    return normalizeAssistantIdentity({});
  }
  return normalizeAssistantIdentity({
    name: window.__FEISHUPILOT_ASSISTANT_NAME__,
    avatar: window.__FEISHUPILOT_ASSISTANT_AVATAR__,
  });
}

/**
 * Check if identity is configured (not default)
 */
export function isIdentityConfigured(identity: AssistantIdentity): boolean {
  return identity.name !== DEFAULT_ASSISTANT_NAME || identity.avatar !== null;
}
