export const getRequiredEnvironment = (name: keyof NodeJS.ProcessEnv | (string & {})): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} must be defined`);
  }
  return value;
};
