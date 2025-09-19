export const getBearerToken = async (sub: string): Promise<string> => {
  const response = await fetch(
    `https://mock.credential-store.${process.env.ENVIRONMENT || "dev"}.account.gov.uk/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sub }),
    }
  );

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return "Bearer " + ((await response.json()) as { token: string }).token;
};
