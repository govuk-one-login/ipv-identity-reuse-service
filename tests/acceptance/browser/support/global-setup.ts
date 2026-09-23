import { sisBaseUrl, sisPrivateApiUrl, sisStackName } from "./environment.js";
import { getOrchestrationStubUrl } from "../../shared/utils/ssm-utilities.js";

export default async function announceTarget(): Promise<void> {
  console.log(`Orchestration stub : ${await getOrchestrationStubUrl()}`);
  console.log(`SIS stack : ${sisStackName()}`);
  console.log(`SIS URL : ${await sisBaseUrl()}`);
  console.log(`SIS Private URL : ${await sisPrivateApiUrl()}`);
}
