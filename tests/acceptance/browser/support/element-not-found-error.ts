export class ElementNotFoundError extends Error {
  constructor(selectorOrLocator: string, options?: ErrorOptions) {
    super(`Element not found: "${selectorOrLocator}"`, options);
    this.name = "ElementNotFoundError";
  }
}
