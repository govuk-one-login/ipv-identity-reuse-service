export default class EndPoints {
  public static BASE_URL =
    process.env.TEST_ENVIRONMENT === "dev" ? process.env.CFN_RegionalApiEndpoint : process.env.CFN_PrivateApiEndpoint;
  public static PATH_USER_IDENTITY = "/user-identity";
  public static BASE_SECRET_NAME =
    process.env.TEST_ENVIRONMENT === "dev"
      ? `/${process.env.SAM_STACK_NAME}/Config/API/Key/`
      : `/ipv-identity-reuse-service/Config/API/Key/`;
}
