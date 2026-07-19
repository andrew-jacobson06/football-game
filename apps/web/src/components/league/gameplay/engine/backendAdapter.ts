export async function savePlayAndGameWithRetry<T>(
  save: () => Promise<T>,
  retries = 2,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await save();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
