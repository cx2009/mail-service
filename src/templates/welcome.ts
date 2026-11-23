export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function welcomeTemplate(data: Record<string, unknown>): EmailContent {
  const rawName = typeof data.name === "string" ? data.name.trim() : "";
  const name = rawName.length > 0 ? rawName.slice(0, 64) : "你好";
  const rawCode = typeof data.code === "string" ? data.code.trim() : "";
  const code = rawCode.length > 0 ? rawCode.slice(0, 32) : "";

  const subject = "欢迎加入元步科技";

  const textLines = [
    `${name}，欢迎加入元步科技。`,
    code.length > 0 ? `你的验证码是：${code}（10 分钟内有效）` : "",
    "如非本人操作，请忽略本邮件。",
  ].filter((line) => line.length > 0);

  const codeBlock =
    code.length > 0
      ? `<p style="font-size:28px;letter-spacing:6px;font-weight:600;margin:24px 0">${escapeHtml(code)}</p>`
      : "";

  const html = `<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;padding:24px;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2329">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <h1 style="font-size:20px;margin:0 0 16px">欢迎加入元步科技</h1>
      <p style="margin:0 0 16px;line-height:1.7">${escapeHtml(name)}，感谢你的注册。请使用下方验证码完成验证。</p>
      ${codeBlock}
      <p style="margin:0;color:#8a8f99;font-size:12px;line-height:1.6">验证码 10 分钟内有效。如非本人操作，请忽略本邮件。</p>
    </div>
  </body>
</html>`;

  return { subject, html, text: textLines.join("\n\n") };
}