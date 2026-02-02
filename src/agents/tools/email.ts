/**
 * Email tool - 邮件发送工具
 * 支持 SMTP 发送邮件
 */

import * as nodemailer from "nodemailer";
import type { AgentTool, ToolContext, ToolExecutionResult } from "./common.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("email-tools");

/**
 * Email configuration from context
 */
interface EmailConfig {
  email: string;
  authCode: string;  // 授权码
  smtpHost?: string;
  smtpPort?: number;
  secure?: boolean;
}

/**
 * Get email config from context
 */
function getEmailConfig(context: ToolContext): EmailConfig | null {
  const services = context.config.services as Record<string, unknown> | undefined;
  const emailConfig = services?.["email"] as EmailConfig | undefined;

  if (!emailConfig?.email || !emailConfig?.authCode) {
    return null;
  }

  return emailConfig;
}

/**
 * Auto-detect SMTP settings based on email domain
 */
function getSmtpSettings(email: string): { host: string; port: number; secure: boolean } {
  const domain = email.split("@")[1]?.toLowerCase() || "";

  const smtpSettings: Record<string, { host: string; port: number; secure: boolean }> = {
    "qq.com": { host: "smtp.qq.com", port: 465, secure: true },
    "163.com": { host: "smtp.163.com", port: 465, secure: true },
    "126.com": { host: "smtp.126.com", port: 465, secure: true },
    "sina.com": { host: "smtp.sina.com", port: 465, secure: true },
    "gmail.com": { host: "smtp.gmail.com", port: 465, secure: true },
    "outlook.com": { host: "smtp.office365.com", port: 587, secure: false },
    "hotmail.com": { host: "smtp.office365.com", port: 587, secure: false },
    "yahoo.com": { host: "smtp.mail.yahoo.com", port: 465, secure: true },
    "icloud.com": { host: "smtp.mail.me.com", port: 587, secure: false },
    "foxmail.com": { host: "smtp.qq.com", port: 465, secure: true },
    "aliyun.com": { host: "smtp.aliyun.com", port: 465, secure: true },
  };

  return smtpSettings[domain] || { host: `smtp.${domain}`, port: 465, secure: true };
}

/**
 * Send email tool
 */
const sendEmailTool: AgentTool = {
  name: "send_email",
  description: `发送电子邮件。

参数：
- to: 收件人邮箱地址（必需）
- subject: 邮件主题（必需）
- body: 邮件正文内容（必需）
- cc: 抄送地址（可选，多个用逗号分隔）
- isHtml: 是否为 HTML 格式（可选，默认 false）

示例：
- send_email(to="example@qq.com", subject="会议通知", body="明天上午10点开会")
- send_email(to="a@qq.com,b@163.com", subject="项目报告", body="请查收附件")`,
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        description: "收件人邮箱地址，多个地址用逗号分隔",
      },
      subject: {
        type: "string",
        description: "邮件主题",
      },
      body: {
        type: "string",
        description: "邮件正文内容",
      },
      cc: {
        type: "string",
        description: "抄送地址（可选），多个用逗号分隔",
      },
      isHtml: {
        type: "boolean",
        description: "是否为 HTML 格式（可选，默认 false）",
      },
    },
    required: ["to", "subject", "body"],
  },
  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolExecutionResult> {
    const to = input["to"] as string;
    const subject = input["subject"] as string;
    const body = input["body"] as string;
    const cc = input["cc"] as string | undefined;
    const isHtml = input["isHtml"] as boolean | undefined;

    if (!to || !subject || !body) {
      return {
        success: false,
        error: "缺少必需参数：to, subject, body",
      };
    }

    const emailConfig = getEmailConfig(context);
    if (!emailConfig) {
      return {
        success: false,
        error: "邮箱未配置。请在设置中配置邮箱地址和授权码。",
      };
    }

    try {
      logger.info("Sending email", { to, subject, from: emailConfig.email });

      // Get SMTP settings
      const smtpSettings = emailConfig.smtpHost
        ? { host: emailConfig.smtpHost, port: emailConfig.smtpPort || 465, secure: emailConfig.secure ?? true }
        : getSmtpSettings(emailConfig.email);

      logger.debug("SMTP settings", smtpSettings);

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.secure,
        auth: {
          user: emailConfig.email,
          pass: emailConfig.authCode,
        },
      });

      // Send email
      const mailOptions: nodemailer.SendMailOptions = {
        from: emailConfig.email,
        to: to,
        subject: subject,
        ...(isHtml ? { html: body } : { text: body }),
        ...(cc ? { cc: cc } : {}),
      };

      const info = await transporter.sendMail(mailOptions);

      logger.info("Email sent successfully", { messageId: info.messageId });

      return {
        success: true,
        result: {
          message: `邮件已发送给 ${to}`,
          subject: subject,
          messageId: info.messageId,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      logger.error("Failed to send email", { error: errorMessage });

      // Provide helpful error messages
      let hint = "";
      if (errorMessage.includes("Invalid login") || errorMessage.includes("authentication")) {
        hint = "请检查邮箱授权码是否正确。注意：需要使用邮箱的授权码，而不是登录密码。";
      } else if (errorMessage.includes("connect")) {
        hint = "无法连接到邮件服务器，请检查网络连接。";
      }

      return {
        success: false,
        error: `发送邮件失败: ${errorMessage}${hint ? ` (${hint})` : ""}`,
      };
    }
  },
};

/**
 * Create email tools
 */
export function createEmailTools(): AgentTool[] {
  return [sendEmailTool];
}
