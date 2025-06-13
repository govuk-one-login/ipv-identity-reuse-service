import { Given, When, Then } from "@cucumber/cucumber";
import { LoginPage } from "../pages/login-page";
import assert from "assert";

type WorldDefinition = {
  loginPage?: LoginPage;
};

Given<WorldDefinition>("I have previously created a password", function () {
  this.loginPage = new LoginPage();
});

When<WorldDefinition>("I enter my password correctly", function () {
  this.loginPage.inputPassword("CorrectPassword123");
});

When<WorldDefinition>("I enter my password incorrectly", function () {
  this.loginPage.inputPassword("WrongPassword123");
});

Then<WorldDefinition>("I should be granted access", function () {
  assert(this.loginPage.isGranted());
});

Then<WorldDefinition>("I should not be granted access", function () {
  assert(this.loginPage.isNotGranted());
});
