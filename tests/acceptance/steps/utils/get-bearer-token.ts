const getMockCredentialStorePath = () => {
  return process.env.ENVIRONMENT === "local" || process.env.ENVIRONMENT === "dev"
    ? "credential-store.reuse.dev.stubs.account.gov.uk"
    : "credential-store.reuse.stubs.account.gov.uk";
};

export const getBearerToken = async (sub: string): Promise<string> => {
  const response = await fetch(`https://${getMockCredentialStorePath()}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sub }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return "Bearer " + ((await response.json()) as { token: string }).token;
};
