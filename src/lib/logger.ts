type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function emit(level: LogLevel, message: string, payload?: LogPayload) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...payload
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info(message: string, payload?: LogPayload) {
    emit("info", message, payload);
  },
  warn(message: string, payload?: LogPayload) {
    emit("warn", message, payload);
  },
  error(message: string, error: unknown, payload?: LogPayload) {
    const errorPayload =
      error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : { errorValue: String(error) };

    emit("error", message, { ...payload, ...errorPayload });
  }
};
