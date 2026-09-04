import { SHARED_DEV_STUB, sisBaseUrl, sisPrivateApiUrl, sisStackName } from "./environment";

export default async function announceTarget(): Promise<void> {
  console.log(`Orchestration stub : ${SHARED_DEV_STUB}`);
  console.log(`SIS stack : ${sisStackName()}`);
  console.log(`SIS URL : ${await sisBaseUrl()}`);
  console.log(`SIS Private URL : ${await sisPrivateApiUrl()}`);
}
