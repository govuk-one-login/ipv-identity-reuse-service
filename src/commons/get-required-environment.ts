export const getRequiredEnvironment = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} must be defined`);
  }
  return value;
};
