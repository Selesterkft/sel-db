import dataTypes from './dataTypes';

export default class StoredProcedure {
  constructor(procName, timeOut) {
    this.procName = procName;
    this.timeOut = timeOut;
    this.params = [];
  }

  input(name, type, value, options) {
    const parsed = StoredProcedure.getDataType(type, options);
    this.params.push({
      isInput: true,
      // direction: 'input',
      name,
      type: parsed.type,
      value,
      options: parsed.options,
    });
  }

  output(name, type, value, options) {
    const parsed = StoredProcedure.getDataType(type, options);
    this.params.push({
      isInput: false,
      // direction: 'output',
      name,
      type: parsed.type,
      value,
      options: parsed.options,
    });
  }

  addParam(name, type, value, options) { this.input(name, type, value, options); }

  addOutputParam(name, type, value, options) { this.output(name, type, value, options); }

  addParameter(name, type, value, options) { this.input(name, type, value, options); }

  addOutputParameter(name, type, value, options) { this.output(name, type, value, options); }

  static getDataType(typeStr, options) {
    // eslint-disable-next-line no-unused-vars
    const [nameStr, optionsStr] = typeStr.replace(')', '').split('(');
    const name = dataTypes[nameStr.toLowerCase()];
    if (!name) {
      throw new Error('StoredProcedure: Invalid data type!');
    }

    return { type: name, options };
  }
}
