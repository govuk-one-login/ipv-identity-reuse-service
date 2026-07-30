import { SHARED_DEV_STUB, sisBaseUrl, sisStackName } from "./environment";

export default function announceTarget(): void {
  console.log(`Orchestration stub : ${SHARED_DEV_STUB}`);
  console.log(`SIS stack : ${sisStackName()}`);
  console.log(`SIS URL : ${sisBaseUrl()}`);
}
