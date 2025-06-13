import { autoBindSteps, loadFeature, StepDefinitions } from "jest-cucumber";

const loginSteps: StepDefinitions = ({ given, when, then }) => {
  given("I have previously created a password", () => {});

  when("I enter my password correctly", () => {});

  when("I enter my password incorrectly", () => {});

  then("I should be granted access", () => {});

  then("I should not be granted access", () => {});
};

const feature = loadFeature("tests/features/example.feature");
autoBindSteps(feature, [loginSteps]);
