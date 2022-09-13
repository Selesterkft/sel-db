/* eslint-disable implicit-arrow-linebreak */
export default function constructLogger(logger) {
  const result = {
    debug: (message, caller) => ({ message, caller }),
    info: (message, caller) => ({ message, caller }),
    error: (message, caller) => ({ message, caller }),
  };
  // If no level is defined, only errors will be logged.
  const level = String(process.env.SELDB_LOGLEVEL).toUpperCase();
  // If no type is defined, logging will default to json format if a logger is
  // present.
  const type = String(process.env.SELDB_LOGTYPE).toUpperCase();

  if (logger) {
    switch (type) {
      case 'STRING':
        if (logger.error) {
          result.error = (message, caller = '') =>
            logger.error(`sel-db: ${caller}: ${message}`);
        }
        if (logger.info && (level === 'INFO' || level === 'DEBUG')) {
          result.info = (message, caller = '') =>
            logger.info(`sel-db: ${caller}: ${message}`);
        }
        if (logger.debug && level === 'DEBUG') {
          result.debug = (message, caller = '') =>
            logger.debug(`sel-db: ${caller}: ${message}`);
        }
        break;
      case 'JSON':
      default:
        if (logger.error) {
          result.error = (message, caller = '') =>
            logger.error({ module: 'sel-db', caller, message });
        }
        if (logger.info && (level === 'INFO' || level === 'DEBUG')) {
          result.info = (message, caller = '') =>
            logger.info({ module: 'sel-db', caller, message });
        }
        if (logger.debug && level === 'DEBUG') {
          result.debug = (message, caller = '') =>
            logger.debug({ module: 'sel-db', caller, message });
        }
        break;
    }
  } else {
    // eslint-disable-next-line no-console
    result.error = console.error;
    if (level === 'INFO' || level === 'DEBUG') {
      // eslint-disable-next-line no-console
      result.info = console.log;
    }
    if (level === 'DEBUG') {
      // eslint-disable-next-line no-console
      result.debug = console.log;
    }
  }

  return result;
}
