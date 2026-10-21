import { CalculatedVectorOfTrust, StoredIdentityRecord } from "../stored-identity/stored-identity-types.js";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { hasIdentityExpired } from "../verifiable-credential/identity-expiry-service.js";
import { MetricDimension, MetricName } from "../../utilities/metric-enum.js";
import logger from "../../utilities/logger.js";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { getJwtBody } from "../../utilities/jwt-utilities.js";
import { calculateVot } from "../stored-identity/calculate-vot.js";
import type { Configuration } from "../../configuration/configuration.js";

const metrics = new Metrics();

export interface ReuseDecision {
  isReusable: boolean;
  reason: {
    expired: boolean;
    fraudExpired: boolean;
    drivingLicenceExpired: boolean;
    votSufficient: boolean;
  };
  rawData: {
    vot: CalculatedVectorOfTrust;
  };
}

export const getReuseDecision = (
  storedIdentityJwt: string,
  storedIdentityVcJwts: string[],
  unsignedVot: IdentityVectorOfTrust,
  vtr: IdentityVectorOfTrust[],
  configuration: Configuration
): ReuseDecision => {
  const content = getJwtBody<StoredIdentityRecord>(storedIdentityJwt);
  const vot = calculateVot(content, unsignedVot, vtr);

  const { expired, fraudExpired, drivingLicenceExpired } = hasIdentityExpired(storedIdentityVcJwts, configuration);
  const votSufficient = vot !== "P0";

  const reuseDecision: ReuseDecision = {
    isReusable: !fraudExpired && !drivingLicenceExpired && votSufficient,
    reason: { expired, fraudExpired, drivingLicenceExpired, votSufficient },
    rawData: { vot },
  };

  publishReuseMetrics(reuseDecision, vtr);
  return reuseDecision;
};

const publishReuseMetrics = (reuseDecision: ReuseDecision, vtr: IdentityVectorOfTrust[]): void => {
  metrics.addDimensions({
    [MetricDimension.FraudCheckExpired]: reuseDecision.reason.fraudExpired ? "fail" : "pass",
    [MetricDimension.DrivingLicenceExpired]: reuseDecision.reason.drivingLicenceExpired ? "fail" : "pass",
    [MetricDimension.VotSufficient]: reuseDecision.reason.votSufficient ? "pass" : "fail",
  });
  metrics.addMetric(MetricName.IdentityReuseValidation, "Count", 1);
  metrics.publishStoredMetrics();

  if (reuseDecision.reason.expired) {
    logger.error("User identity expired");
  }
  if (!reuseDecision.reason.votSufficient) {
    logger.error("Identity does not meet required level of confidence", { vtr });
  }
};
