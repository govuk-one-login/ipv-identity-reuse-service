import assert from "assert";
import { Given, When, Then } from "@cucumber/cucumber";

const isItFriday = (today?: string) => {
  if (today === "Friday") {
    return "Yes";
  } else {
    return "Nope";
  }
};

type TestWorld = {
  today?: string;
  actualAnswer?: string;
};

Given<TestWorld>("today is Sunday", function () {
  this.today = "Sunday";
});

When<TestWorld>("I ask whether it's Friday yet", function () {
  this.actualAnswer = isItFriday(this.today);
});

Then<TestWorld>("I should be told {string}", function (expectedAnswer: string) {
  assert.strictEqual(this.actualAnswer, expectedAnswer);
});
