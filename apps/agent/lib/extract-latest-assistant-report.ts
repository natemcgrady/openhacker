type MessagePart = {
  type: string;
  text?: string;
  stepIndex?: number;
};

type AssistantMessage = {
  role: string;
  parts?: readonly MessagePart[];
};

export function extractLatestAssistantReport(
  messages: readonly AssistantMessage[],
): string {
  let reply: AssistantMessage | undefined;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "assistant") {
      reply = messages[i];
      break;
    }
  }

  const parts = reply?.parts ?? [];
  let lastStep: number | undefined;

  for (const part of parts) {
    if (typeof part.stepIndex !== "number") continue;
    lastStep =
      lastStep === undefined
        ? part.stepIndex
        : Math.max(lastStep, part.stepIndex);
  }

  let result = "";
  for (const part of parts) {
    if (part.type !== "text" || !part.text) continue;
    if (lastStep !== undefined && part.stepIndex !== lastStep) continue;
    result += part.text;
  }

  return result;
}
