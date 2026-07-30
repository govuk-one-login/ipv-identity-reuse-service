export class PolicyGenerationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "PolicyGenerationError";
  }
}
