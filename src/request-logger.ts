/* eslint-disable @typescript-eslint/no-explicit-any */
import config from "config-dug";
import { Request, Response, ParamsDictionary } from "express-serve-static-core";
import { NextFunction } from "connect";

import { getIpAddress } from "./ip-address";

const REDACT_FIELDS = config.REDACT_FIELDS
  ? (config.REDACT_FIELDS as string)
      .split(",")
      .map((field) => field.toUpperCase())
  : [];

const LOG_HTTP_METHODS = config.LOG_HTTP_METHODS
  ? (config.LOG_HTTP_METHODS as string).split(",")
  : [];

const LOGGING_EXEMPT_ROUTE_PATTERNS = config.LOGGING_EXEMPT_ROUTE_PATTERNS
  ? (config.LOGGING_EXEMPT_ROUTE_PATTERNS as string).split(",")
  : [];

const shouldLogRequest = (req: Request<ParamsDictionary>): boolean => {
  const matchesHttpMethod = LOG_HTTP_METHODS.includes(req.method);
  const matchesExemptRoutePattern = LOGGING_EXEMPT_ROUTE_PATTERNS.find(
    (pattern) => req.originalUrl?.includes(pattern)
  );

  return matchesHttpMethod && !matchesExemptRoutePattern;
};

//TODO: crude redactor, make a logger library and move the redactor there
const redact = (input?: any): any | undefined => {
  if (!input) {
    return input;
  }

  // deep clone object
  const object = JSON.parse(JSON.stringify(input));

  Object.keys(object).forEach((key) => {
    if (REDACT_FIELDS.includes(key.toUpperCase())) {
      object[key] = "[REDACTED]";
    } else if (typeof key === "object") {
      redact(object.key);
    }
  });

  return object;
};

const requestLogger = (
  req: Request<ParamsDictionary>,
  res: Response,
  next: NextFunction
): void => {
  try {
    const caller = (res.locals.caller as any) || undefined;

    if (shouldLogRequest(req)) {
      logger.info(`request-logger - ${req.method} ${req.originalUrl}`, {
        body: redact(req.body),
        caller: caller
          ? {
              id: caller.id,
              username: caller.username,
              email: caller.email,
              organizationId: caller.organizationId,
              ipAddress: getIpAddress(req),
            }
          : {
              id: "UNAUTHENTICATED",
              ipAddress: getIpAddress(req),
            },
      });
    }
  } catch (error) {
    logger.error("request-logger failed", error);
  }

  next();
};

export default requestLogger;
