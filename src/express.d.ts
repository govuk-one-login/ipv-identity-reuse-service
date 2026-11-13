import "express";

declare global {
  namespace Express {
    interface Request {
      session: Record<string, unknown>;
    }
    interface Locals {
      cspNonce?: string;
      sessionId?: string;
    }
  }
}

declare module "node:http" {
  interface ServerResponse {
    locals: Express.Locals;
  }
}

declare module "http" {
  interface ServerResponse {
    locals: Express.Locals;
  }
}
