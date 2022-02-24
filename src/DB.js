/* eslint-disable operator-linebreak */
import { Connection, Request } from 'tedious';

export default class DB {
  constructor(logger) {
    this.config = {};
    this.connection = {};
    this.logger = {};
    if (logger) {
      this.logger.error = (msg) => logger.error(`sel-db: ${msg}`);
      this.logger.info = (msg) => logger.info(`sel-db: ${msg}`);
    } else {
      this.logger = DB.replaceLogger();
    }
  }

  async initiateConnection(sqlConfig) {
    this.config = sqlConfig;
    this.connection = new Connection(this.config);
    this.checkSqlConfig();
    // return this.openConnection();
    // console.log('calling openconnection');
    // const result = await this.openConnection();
    // console.log(`Result: ${result}`);
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
      this.logger.info('resetConnection: Resetting connection.');
      this.dropConnection();

      this.connection = new Connection(this.config);
      this.connection.connect((err) => {
        if (err) {
          this.logger.error(
            // TODO: test this error message
            `resetConnection: Reopen connection failed: ${err.message}`,
          );
          reject(err);
        } else {
          this.logger.info(
            'resetConnection: Database connection successfully reset.',
          );
          resolve(this.getState());
        }
      });
    });
  }

  openConnection() {
    return new Promise((resolve, reject) => {
      const state = this.getState();

      switch (state) {
        case 'LoggedIn':
          this.logger.info('openConnection: Already logged in.');
          resolve(this.getState());
          break;
        case 'Connecting':
          this.logger.info(
            'openConnection: Already connecting, waiting for completion.',
          );
          this.connection.on('connect', (err) => {
            if (err) {
              // TODO: test this case somehow...
              // this.logger.error(err);
              reject(err);
            } else {
              resolve(this.getState());
            }
          });
          break;
        case 'Final':
          this.logger.info(
            'openConnection: State is Final. Resetting connection.',
          );
          this.resetConnection()
            .then(() => {
              this.logger.info(
                'openConnection: Connection successfully reset.',
              );
              resolve(this.getState());
            })
            .catch((e) => {
              // TODO: test this case
              // this.logger.error(e);
              reject(e);
            });
          break;
        default:
          this.connection.connect((err) => {
            if (err) {
              // this.logger.error(err);
              reject(err);
            } else {
              this.logger.info(
                'openConnection: Database successfully connected.',
              );
              resolve(this.getState());
            }
          });
      }
    });
  }

  retardedCall(sp) {
    return new Promise((resolve, reject) => {
      const output = {};
      let columns = [];
      const recordset = [];

      // TODO: test rejection path
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

      // TODO: 'columns' name
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
      this.logger.error(e.message);
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
      this.logger.error(e.message);
      throw new Error(`DB.sanitizeSqlConfig: ${e.message}`);
    }

    return sanitizedConfig;
  }
}
