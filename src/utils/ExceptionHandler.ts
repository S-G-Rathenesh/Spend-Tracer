import { Logger } from './Logger';

export const setGlobalExceptionHandler = () => {
  const defaultErrorHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    Logger.error('GlobalExceptionHandler', `Fatal: ${isFatal}`, error);
    
    // Fallback to the default handler after logging (which typically shows the RedBox in dev or crashes in prod)
    defaultErrorHandler(error, isFatal);
  });
};
