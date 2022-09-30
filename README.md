# @selesterkft/sel-db

_Selester Ltd. T-SQL connection handler using [tedious](https://www.npmjs.com/package/tedious)._

This is basically a wrapper that wraps promises around tedious' callbacks.

> **Currently only works with stored procedures!**

Can be used with [@selesterkft/express-logger](https://www.npmjs.com/package/@selesterkft/express-logger).

## Installation

```bash
yarn add @selesterkft/sel-db
```

## Basic example

Considering a stored procedure as follows, running on a local sql database:

```sql
CREATE PROCEDURE [dbo].[countChar]
@inputVal varchar(30),
@outputCount int OUTPUT
AS
set @outputCount = LEN(@inputVal);
GO
```

(Example from [tedious docs](https://github.com/tediousjs/tedious/blob/master/examples/stored-procedure-with-parameters.js))

A basic implementation would be:

```javascript
import { DB, StoredProcedure } from '@selesterkft/sel-db';

// Create an instance of the class
const db = new DB();

// Create a configuration object. See the API section for details.
const sqlConfig = {
  server: 'localhost',
  options: {},
  authentication: {
    type: 'default',
    options: {
      userName: 'my-username',
      password: 'my-password',
    },
  },
};

// Connect to the database (without error-checking)
await db.initiateConnection(sqlConfig);

// Create a stored procedure
const sp = new StoredProcedure('countChar');
// Add parameters to the stored procedure
sp.addParam('inputVal', 'VARCHAR', 'something', { length: 30 });
sp.addOutputParam('outputCount', 'int');

// Call the procedure and get the result
const result = await db.callSP(sp);
console.log(result);
// {
//   output: {
//     outputCount: 9
//   },
//   columns: [],
//   recordset: []
// }
```

## Real-life implementation

Sel-db can be used with a logger, [@selesterkft/express-logger](https://www.npmjs.com/package/@selesterkft/express-logger) is tested with the package. You can use anything else that has `debug()`, `info()` and `error()` methods.

Create a file that exports an instance of the DB class. To keep things organized, it can also contain the config object.

`db.js`:

```javascript
import logger from '@selesterkft/express-logger';
import { DB } from '@selesterkft/sel-db';

export const sqlConfig = {
  server: 'localhost',
  options: {},
  authentication: {
    type: 'default',
    options: {
      userName: 'my-username',
      password: 'my-password',
    },
  },
};

export const db = new DB(logger);
```

In a place that gets called at init (like `index.js`), initialize the connection:

```javascript
import { db, sqlConfig } from './db';

// Make sure this runs before any call to the database is performed
db.initiateConnection(sqlConfig).catch((e) => {
  // Do some error handling, eg.:
  logger.error(e.message);
});

// ...
```

Then make a function for calling the stored procedure.

`countChar.js`

```javascript
import { StoredProcedure } from '@selesterkft/sel-db';
import { db } from './db';

export default async function countChar(str) {
  const sp = new StoredProcedure('countChar');
  sp.addParam('inputVal', 'VARCHAR', str, { length: 30 });
  sp.addOutputParam('outputCount', 'int');

  const sqlResult = await db.callSP(sp);

  return sqlResult.output.outputCount;
}
```

Since this is async, use eg. `const a = await countChar('a')` to get the result.

## Logging

Sel-db allows some control over logging behaviour. To change settings, use the SELDB_LOGLEVEL and SELDB_LOGTYPE environment variables. Put these in a `.env` file and use [dotenv](https://www.npmjs.com/package/dotenv) or similar to access them, since you should already be doing this for the connection parameters.

`.env`

```text
SELDB_LOGLEVEL=error
SELDB_LOGTYPE=json
```

### SELDB_LOGLEVEL

Sets the logging level, in ascending verbosity: `error`, `info` and `debug`. Defaults to `error`. Setting this to `silent` will disable all logging.

### SELDB_LOGTYPE

Sets the format of the log messages. `string` and the default `json` are currently suppoprted.

Example string:

```text
"sel-db: openConnection: Database successfully connected."
```

The same in JSON:

```json
{
  "caller":"openConnection",
  "message":"Database successfully connected.",
  "module":"sel-db"
}
```

Note that [@selesterkft/express-logger](https://www.npmjs.com/package/@selesterkft/express-logger) will output log files in JSON (or more precisely, a list of JSONs in a file). With `string` format:

```json
{
  "level":"info",
  "message":"sel-db: openConnection: Database successfully connected.",
  "timestamp":"2022-09-14T11:03:00.201Z"
}
```

With `json`:

```json
{
  "caller":"openConnection",
  "level":"info",
  "message":"Database successfully connected.",
  "module":"sel-db",
  "timestamp":"2022-09-14T11:04:20.308Z"
}

```

## Queueing stored procedure calls - Queue Processor

If a procedure is called while another is still being processed by the database, an `EINVALIDSTATE` error will occur.
This is the notorious 'SentClientRequest state' error. (Check out [Tedious F.E.Q.](http://tediousjs.github.io/tedious/frequently-encountered-problems.html))

```text
RequestError: Requests can only be made in the LoggedIn state, not the SentClientRequest state
```

From version 1.2.0 onwards, `sel-db` implements a Queue Processor to execute called procedures sequentially, handling this problem. `callSP` can now be called repeatedly, and the procedures will fill up a waiting queue if the database is busy processing a previous call.

Info level logging will show if a procedure needs to be stalled. This can show that the previous call is too slow or can be helpful for other debugging purposes.

## API

### Connection

#### **const db = new DB(logger)**

Creates a new instance of the database connection object. `logger` is an optional parameter, a logger object that has a `logger.info` and a `logger.error` method for logging infos and errors respectively. If no logger is provided, logs will be written to the console (via `console.log()` and `console.error()`).

#### **initiateConnection(sqlConfig)**

Async method that initiates a connection with the configuration provided in the object `sqlConfig`. The latter is passed as-is to _tedious_, so check [their docs](http://tediousjs.github.io/tedious/api-connection.html#function_newConnection) on how to set up your connection config. If no `type` is provided for `authentication`, it will be assumed to be `default`.

Use a `.catch` branch (or equivalent) to handle errors in the connection. This is can be useful if there's a problem during initial connection (server down, config error etc.).

Returns a promise for the connection state (see `getState()`)

#### **callSP(sp)**

Async method that calls a stored procedure. `sp` should be an instance of `StoredProcedure`, see below.

Returns an object containing the results of the call. The example stored procedure will return:

```js
{ 
  output: {
    outputCount: 9
  },
  columns: [],
  recordset: []
}
```

Output variables of the stored procedure will be in the `output: {}` object, their keys will be the value given in the `name` parameter of [`addOutputParam()`](#addoutputparamname-type-value-options).

#### **dropConnection()**

Closes the connection and clears the connection object.

#### **getState()**

Returns a string containing the state of the connection. This, AFAIK can be as follows:
|state|string|
|---|---|
|INITIALIZED|Initialized|
|**CONNECTING**|Connecting|
|SENT_PRELOGIN|SentPrelogin|
|REROUTING|ReRouting|
|TRANSIENT_FAILURE_RETRY|TRANSIENT_FAILURE_RETRY|
|SENT_TLSSSLNEGOTIATION|SentTLSSSLNegotiation|
|SENT_LOGIN7_WITH_STANDARD_LOGIN|SentLogin7WithStandardLogin|
|SENT_LOGIN7_WITH_NTLM|SentLogin7WithNTLMLogin|
|SENT_LOGIN7_WITH_FEDAUTH|SentLogin7Withfedauth|
|LOGGED_IN_SENDING_INITIAL_SQL|LoggedInSendingInitialSql|
|**LOGGED_IN**|LoggedIn|
|**SENT_CLIENT_REQUEST**|SentClientRequest|
|SENT_ATTENTION|SentAttention|
|**FINAL**|Final|

Possibly important ones are bolded. The connection needs to be in the `LoggedIn` state in order to process a request, it cannot be done while in the `Initialized`, `Connecting` or `SentClientRequest` state. _Sel-db_ will wait till the connection is fully established, so use [initiateConnection](#initiateConnectionsqlConfig).

This method is not async, so it will return the state at the moment it was called.

### Stored procedures

#### **const sp = new StoredProcedure(procedureName)**

Creates a new stored procedure with the name `procedureName`, which should be the equivalent of the procedure's name in your SQL server.

#### **addParam(name, type, value, options)**

Adds an input parameter to the procedure, to be called on the instantiated stored procedure object.

- `name`: string, the name of the parameter. Case sensitive.
- `type`: string, the type of the parameter. It is case-**in**sesitive and will be matched to a [datatype from _tedious_](http://tediousjs.github.io/tedious/api-datatypes.html).
- `value`: the value the parameter will take. Check the above link to datatypes to know which JavaScript variable type to use. Optional.
- `options`: an optional object to specify additional type-related options. Basically `length`, `precision` or `scale`. From [_tedious_ docs](http://tediousjs.github.io/tedious/api-request.html#function_addParameter):
  
  > `length` for VarChar, NVarChar, VarBinary. Use length as Infinity for VarChar(max), NVarChar(max) and VarBinary(max).
  >
  > `precision` for Numeric, Decimal
  >
  > `scale` for Numeric, Decimal, Time, DateTime2, DateTimeOffset

#### **addOutputParam(name, type, value, options)**

Adds an output parameter, uses the same syntax as above. If there are no options needed, `value` and `options` can be omitted, otherwise define `value` as an empty string.

```javascript
  sp.addOutputParam('out1', 'int');
  sp.addOutputParam('out2', 'nvarchar', '', { length: 'max' });
```


## Known issues

### ECONNRESET, timeout (?) on Azure

After some time, connections to Azure databases are lost, they switch to the 'Final' state, possibly due to timeout settings.

If a new call is made to the database while the connection is in the 'Final' state, _sel-db_ will close the connection and initiate a new one automatically. This ensures that calls are processed should this error happen.

Still, an `error` level logging event will occur.

error.log:

```json
{"caller":"openConnection","level":"error","message":{"code":"ESOCKET"},"module":"sel-db","timestamp":"2022-09-29T11:26:21.274Z"}
```
