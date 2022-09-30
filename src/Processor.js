// Sel-db queue processor
// Original from:
// https://stackoverflow.com/a/52309513

export default class Processor {
  constructor() {
    this.queue = [];
    this.queryRunning = false;
    this.logger = {};
    this.queryFn = {};
  }

  setLogger(logger) {
    this.logger = logger;
  }

  query(query) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        query,
        resolve,
        reject,
      });

      this.tryProcessNext();
    });
  }

  tryProcessNext() {
    if (this.queue.length === 0) return;
    if (this.queryRunning) {
      const last = this.queue[this.queue.length - 1];
      this.logger.info(`Retarding procedure: ${last.query.procName}. Queue not empty.`, 'Queue Processor');
      return;
    }

    this.queryRunning = true;
    const qry = this.queue.shift();

    this.queryFn(qry.query)
      .then((res) => {
        this.queryRunning = false;
        qry.resolve(res);
        this.tryProcessNext();
      })
      .catch((err) => {
        this.queryRunning = false;
        qry.reject(err);
        this.tryProcessNext();
      });
  }
}
