import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuditAction, writeAuditAsync } from "@/lib/audit";
import { logger } from "@/lib/logger";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export function jsonError(error: unknown, context?: { path?: string }) {
  if (error instanceof HttpError) {
    if (error.status === 401 || error.status === 403) {
      logger.warn("http.client_error", {
        status: error.status,
        message: error.message,
        path: context?.path
      });
    }

    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request payload", issues: error.flatten() },
      { status: 400 }
    );
  }

  logger.error("http.server_error", error, { path: context?.path });
  writeAuditAsync({
    action: AuditAction.SERVER_ERROR,
    metadata: {
      path: context?.path,
      message: error instanceof Error ? error.message : String(error)
    }
  });

  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}
