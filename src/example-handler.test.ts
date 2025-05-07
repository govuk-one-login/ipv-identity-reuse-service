import { handler } from './example-handler';

describe("example-handler", () => {
    it('should just work', () => {
        const result: string = handler();

        expect(result).toBe("Hello, world!");
    })
});