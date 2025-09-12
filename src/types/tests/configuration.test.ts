import { Configuration } from "../configuration";
import { getFraudValidityPeriod } from "../configuration";
describe("Configuration tests", () => {
    const testConfig :Configuration ={
        evcsApiUrl: "https://evcs-api",
        interventionCodesToInvalidate: ["5", "4"],
        fraudIssuer: "fraudCRI",
        fraudValidityPeriod: [{levelOfConfidence:"P2", value:4318},{levelOfConfidence:"P2", value:4318}],
    }
    it("Should get fraud validity period for correct level of confidence", () => {
        const validityPeriod = getFraudValidityPeriod(testConfig, "P2")
        expect(validityPeriod).toBe(4318);
      });

      it("Should get undefined for incorrect level of confidence", () => {
        const validityPeriod = getFraudValidityPeriod(testConfig, "P3")
        expect(validityPeriod).toBe(undefined);
      }); 

});