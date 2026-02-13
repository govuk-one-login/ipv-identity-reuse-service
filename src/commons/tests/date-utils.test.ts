import { normaliseToStartOfDay, hasNbfExpired } from "../date-utils";

describe("date-utils", () => {
  describe("normaliseToStartOfDay", () => {
    it("should set hours, minutes, seconds and milliseconds to zero", () => {
      const date = new Date("2026-06-15T14:30:45.123Z");
      const result = normaliseToStartOfDay(date);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });

    it("should preserve the date", () => {
      const date = new Date("2026-06-15T14:30:45.123Z");
      const result = normaliseToStartOfDay(date);
      expect(result.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    });

    it("should handle a date already at midnight", () => {
      const date = new Date("2026-06-15T00:00:00.000Z");
      const result = normaliseToStartOfDay(date);
      expect(result.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    });
  });

  describe("hasNbfExpired", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return false when nbf is within the validity period", () => {
      jest.setSystemTime(new Date("2026-08-01T12:00:00Z"));
      const nbf = new Date("2026-06-01T10:00:00Z").getTime() / 1000;
      expect(hasNbfExpired(nbf, 180)).toBe(false);
    });

    it("should return true when nbf is beyond the validity period", () => {
      jest.setSystemTime(new Date("2026-12-15T12:00:00Z"));
      const nbf = new Date("2026-06-01T10:00:00Z").getTime() / 1000;
      expect(hasNbfExpired(nbf, 180)).toBe(true);
    });

    it("should return true when exactly at the validity boundary", () => {
      jest.setSystemTime(new Date("2026-08-24T12:00:00Z"));
      const nbf = new Date("2026-02-25T15:35:58Z").getTime() / 1000;
      expect(hasNbfExpired(nbf, 180)).toBe(true);
    });

    it("should normalise nbf to start of day before calculating expiry", () => {
      jest.setSystemTime(new Date("2026-08-23T23:59:59Z"));
      const nbf = new Date("2026-02-25T23:59:59Z").getTime() / 1000;
      expect(hasNbfExpired(nbf, 180)).toBe(false);
    });
  });
});
