/* eslint-disable operator-linebreak */
import { Connection, Request } from 'tedious';
import constructLogger from './logging/constructLogger';

export default class DB {
  constructor(logger) {
    this.config = {};
    this.connection = {};
    this.logger = constructLogger(logger);
  }

  async initiateConnection(sqlConfig) {
    this.config = sqlConfig;
    this.connection = new Connection(this.config);
    this.checkSqlConfig();
    return this.openConnection();
  }

  dropConnection() {
    this.connection.close();
    this.connection = {};
  }

  getState() {
    return this.connection?.state?.name;
  }

  resetConnection() {
    return new Promise((resolve, reject) => {
      this.logger.debug('Resetting connection.', 'resetConnection');
      this.dropConnection();

      this.connection = new Connection(this.config);
      this.connection.connect((err) => {
        if (err) {
          this.logger.error(
            `Failed to reopen connection: ${err.message}`,
            'resetConnection',
          );
          reject(err);
        } else {
          this.logger.debug(
            'Database connection successfully reset.',
            'resetConnection',
          );
          resolve(this.getState());
        }
      });

      this.registerListeners('resetConnection');
    });
  }

  openConnection() {
    return new Promise((resolve, reject) => {
      const state = this.getState();

      switch (state) {
        case 'LoggedIn':
          this.logger.info('Already logged in.', 'openConnection');
          resolve(this.getState());
          break;
        case 'Connecting':
          this.logger.info(
            'Already connecting, waiting for completion.',
            'openConnection',
          );
          this.connection.on('connect', (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(this.getState());
            }
          });
          break;
        case 'Final':
          this.logger.info(
            'State is Final. Resetting connection.',
            'openConnection',
          );
          this.resetConnection()
            .then(() => {
              this.logger.info(
                'Connection successfully reset.',
                'openConnection',
              );
              resolve(this.getState());
            })
            .catch((e) => {
              reject(e);
            });
          break;
        default:
          this.connection.connect((err) => {
            if (err) {
              reject(err);
            } else {
              this.logger.info(
                'Database successfully connected.',
                'openConnection',
              );
              resolve(this.getState());
            }
          });
          this.registerListeners('openConnection');
      }
    });
  }

  registerListeners(caller) {
    this.connection.on('error', (err) => {
      this.logger.error(err, caller);
    });
  }

  retardedCall(sp) {
    return new Promise((resolve, reject) => {
      const output = {};
      let columns = [];
      const recordset = [];

      let isRejected = false;
      const request = new Request(sp.procName, (err) => {
        if (err) {
          reject(err);
          isRejected = true;
        }
      });

      if (isRejected) return;

      request.setTimeout = sp.timeOut;

      sp.params.forEach((param) => {
        if (param.direction === 'input') {
          request.addParameter(
            param.name,
            param.type,
            param.value,
            param.options,
          );
        } else {
          request.addOutputParameter(
            param.name,
            param.type,
            param.value,
            param.options,
          );
        }
      });

      request.on('requestCompleted', () => {
        resolve({ output, columns, recordset });
      });

      request.on('returnValue', (name, value) => {
        output[name] = value;
      });

      request.on('columnMetadata', (columnsMetadata) => {
        columns = columnsMetadata.map((colData) => ({
          name: colData.colName,
          type: colData.type.name,
        }));
      });

      request.on('row', (xxxcolumns) => {
        const record = {};

        xxxcolumns.forEach((column) => {
          record[column.metadata.colName] = column.value;
        });

        recordset.push(record);
      });

      this.connection.callProcedure(request);
    });
  }

  async callSP(sp) {
    return this.openConnection()
      .then(() => this.retardedCall(sp))
      .catch((e) => {
        this.logger.error(e);
        throw e;
      });
  }

  static replaceLogger() {
    return {
      // eslint-disable-next-line no-console
      info: console.log,
      // eslint-disable-next-line no-console
      error: console.error,
    };
  }

  checkSqlConfig() {
    const validTypes = [
      'default',
      'ntlm',
      'azure-active-directory-password',
      'azure-active-directory-access-token',
      'azure-active-directory-msi-vm',
      'azure-active-directory-msi-app-service',
    ];

    try {
      if (!this.config.server) {
        throw new Error('No server configured!');
      }
      if (!this.config.authentication) {
        throw new Error('No authentication provided!');
      }
      const { type } = this.config.authentication;
      if (!type) {
        this.config.authentication.type = 'default';
      } else if (!validTypes.includes(type)) {
        throw new Error('Invalid authentication type!');
      }
      if (
        !this.config.authentication.options ||
        !this.config.authentication.options.userName ||
        !this.config.authentication.options.password
      ) {
        throw new Error('No user or pass provided!');
      }
    } catch (e) {
      this.logger.error(e.message, 'checkSqlConfig');
      throw new Error(`checkSqlConfig: ${e.message}`);
    }
  }

  static sanitizeSqlConfig(config) {
    const sanitizedConfig = config;
    const validTypes = [
      'default',
      'ntlm',
      'azure-active-directory-password',
      'azure-active-directory-access-token',
      'azure-active-directory-msi-vm',
      'azure-active-directory-msi-app-service',
    ];

    try {
      if (!config.server) {
        throw new Error('No server configured!');
      }
      if (!config.authentication) {
        throw new Error('No authentication provided!');
      }
      const { type } = config.authentication;
      if (!type) {
        sanitizedConfig.authentication.type = 'default';
      } else if (!validTypes.includes(type)) {
        throw new Error('Invalid authentication type!');
      }
      if (
        !config.authentication.options ||
        !config.authentication.options.userName ||
        !config.authentication.options.password
      ) {
        throw new Error('No user or pass provided!');
      }
    } catch (e) {
      this.logger.error(e.message, 'sanitizeSqlConfig');
      throw new Error(`sanitizeSqlConfig: ${e.message}`);
    }

    return sanitizedConfig;
  }
}
