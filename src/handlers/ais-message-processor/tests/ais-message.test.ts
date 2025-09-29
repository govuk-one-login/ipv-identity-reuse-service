import { isAisMessage } from "../ais-message";

describe("isTxmaMessage", () => {
  it("should return true when required fields present", () => {
    expect(
      isAisMessage({
        user_id: "jane.smith-12345",
        timestamp: 1752755454,
        intervention_code: "12",
      })
    ).toEqual(true);
  });

  it("should return true when extra fields present", () => {
    expect(
      isAisMessage({
        user_id: "jane.smith-12345",
        timestamp: 1752755454,
        intervention_code: "12",
        event_id: 345,
      })
    ).toEqual(true);
  });

  it("should return false when user_id missing", () => {
    expect(
      isAisMessage({
        timestamp: 1752755454,
        intervention_code: "12",
      })
    ).toEqual(false);
  });

  it("should return false when timestamp missing", () => {
    expect(
      isAisMessage({
        user_id: "jane.smith-12345",
        intervention_code: "12",
      })
    ).toEqual(false);
  });

  it("should return true when intervention_code missing", () => {
    expect(
      isAisMessage({
        user_id: "jane.smith-12345",
        timestamp: 1752755454,
      })
    ).toEqual(true);
  });

  it("should return false when user_id empty", () => {
    expect(
      isAisMessage({
        user_id: "",
        timestamp: 1752755454,
        intervention_code: "12",
      })
    ).toEqual(false);
  });
});
