import { handler } from "./example-handler";

describe("example-handler", () => {
  it("should just work", async () => {
    const result: string = await handler();

    expect(result).toBe("Hello, world!");
  });
});
