import { defineFeature, DefineStepFunction, loadFeature } from "jest-cucumber";

const feature = loadFeature("tests/features/example.feature");

const givenIhavePreviouslyCreatedAPassword = (given: DefineStepFunction) =>
  given("I have previously created a password", () => {});

const whenIEnterMyPasswordCorrectly = (when: DefineStepFunction) => when("I enter my password correctly", () => {});

const whenIEnterMyPasswordIncorrectly = (when: DefineStepFunction) => when("I enter my password incorrectly", () => {});

const thenIShouldBeGrantedAccess = (then: DefineStepFunction) => then("I should be granted access", () => {});

const thenIShouldNotBeGrantedAccess = (then: DefineStepFunction) => then("I should not be granted access", () => {});

defineFeature(feature, (test) => {
  test("Entering a correct password", ({ given, when, then }) => {
    givenIhavePreviouslyCreatedAPassword(given);

    whenIEnterMyPasswordCorrectly(when);

    thenIShouldBeGrantedAccess(then);
  });

  test("Entering a incorrect password", ({ given, when, then }) => {
    givenIhavePreviouslyCreatedAPassword(given);

    whenIEnterMyPasswordIncorrectly(when);

    thenIShouldNotBeGrantedAccess(then);
  });
});
