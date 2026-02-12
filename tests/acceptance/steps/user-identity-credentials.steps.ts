import { Given } from "@cucumber/cucumber";
import { WorldDefinition } from "./base-verbs.step";
import { evcsPatchCredentials } from "./utils/evcs-api";
import {
  createAndPostCredentials,
  createAndPostFraudCheckCredential,
  createAndPostDcmawDrivingPermitCredential,
  createAndPostFailedDcmawDrivingPermitCredential,
  createAndPostDcmawPassportCredential,
} from "./helpers/credential-helpers";

Given<WorldDefinition>("a user has {int} CURRENT credentials stored", async function (credentials: number) {
  this.credentialJwts = await createAndPostCredentials(credentials, this.userId);
});

Given<WorldDefinition>("an extra CURRENT credential is stored for the user", async function () {
  await createAndPostCredentials(1, this.userId);
});

Given<WorldDefinition>("an existing CURRENT credential is marked as HISTORIC for the user", async function () {
  if (!this.credentialJwts?.length) {
    throw new Error("The step expects to be able to access credentials from the WorldDefinition");
  }

  const signatureOfCredentialToUpdate = this.credentialJwts!.at(0)?.split(".").at(-1) as string;
  await evcsPatchCredentials(this.userId, [{ signature: signatureOfCredentialToUpdate, state: "HISTORIC" }]);
});

Given<WorldDefinition>(
  "the user has a fraud check credential with nbf {int} months ago",
  async function (months: number) {
    const nbfDate = new Date();
    nbfDate.setDate(nbfDate.getDate() - months * 30);
    const fraudCheckJwt = await createAndPostFraudCheckCredential(this.userId, nbfDate);
    this.credentialJwts.push(fraudCheckJwt);
  }
);

Given<WorldDefinition>(
  "the user has a fraud check credential with nbf {int} months ago and failed fraudCheck {string}",
  async function (months: number, fraudCheckType: string) {
    const nbfDate = new Date();
    nbfDate.setDate(nbfDate.getDate() - months * 30);
    const fraudCheckJwt = await createAndPostFraudCheckCredential(this.userId, nbfDate, fraudCheckType);
    this.credentialJwts.push(fraudCheckJwt);
  }
);

Given<WorldDefinition>(
  "the user has a DCMAW driving permit credential with licence expiry in the future and VC nbf {int} months ago",
  async function (months: number) {
    const vcNbfDate = new Date();
    vcNbfDate.setDate(vcNbfDate.getDate() - months * 30);

    const licenceExpiryDate = new Date();
    licenceExpiryDate.setFullYear(licenceExpiryDate.getFullYear() + 2);
    const licenceExpiryString = licenceExpiryDate.toISOString().split("T")[0];

    const dcmawJwt = await createAndPostDcmawDrivingPermitCredential(this.userId, vcNbfDate, licenceExpiryString);
    this.credentialJwts.push(dcmawJwt);
  }
);

Given<WorldDefinition>(
  "the user has a DCMAW passport credential with VC nbf {int} months ago",
  async function (months: number) {
    const vcNbfDate = new Date();
    vcNbfDate.setDate(vcNbfDate.getDate() - months * 30);

    const dcmawJwt = await createAndPostDcmawPassportCredential(this.userId, vcNbfDate);
    this.credentialJwts.push(dcmawJwt);
  }
);

Given<WorldDefinition>(
  "the user has a DCMAW driving permit credential with licence expired before VC issuance and VC nbf {int} months ago",
  async function (months: number) {
    const vcNbfDate = new Date();
    vcNbfDate.setDate(vcNbfDate.getDate() - months * 30);

    // Licence expired 1 month before VC was issued
    const licenceExpiryDate = new Date(vcNbfDate);
    licenceExpiryDate.setDate(licenceExpiryDate.getDate() - 30);
    const licenceExpiryString = licenceExpiryDate.toISOString().split("T")[0];

    const dcmawJwt = await createAndPostDcmawDrivingPermitCredential(this.userId, vcNbfDate, licenceExpiryString);
    this.credentialJwts.push(dcmawJwt);
  }
);

Given<WorldDefinition>(
  "the user has a failed DCMAW driving permit credential with licence expired before VC issuance and VC nbf {int} months ago",
  async function (months: number) {
    const vcNbfDate = new Date();
    vcNbfDate.setDate(vcNbfDate.getDate() - months * 30);

    const licenceExpiryDate = new Date(vcNbfDate);
    licenceExpiryDate.setDate(licenceExpiryDate.getDate() - 30);
    const licenceExpiryString = licenceExpiryDate.toISOString().split("T")[0];

    const dcmawJwt = await createAndPostFailedDcmawDrivingPermitCredential(this.userId, vcNbfDate, licenceExpiryString);
    this.credentialJwts.push(dcmawJwt);
  }
);
