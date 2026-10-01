export const logger = {
  info: (...args: Parameters<typeof console.info>): void => {
    console.info(...args);
  },
  warn: (...args: Parameters<typeof console.warn>): void => {
    console.warn(...args);
  },
  error: (...args: Parameters<typeof console.error>): void => {
    console.error(...args);
  },
};
