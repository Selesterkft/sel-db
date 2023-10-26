# Migrating from version 1.x to 2.x

## Configuration settings and initialization

The `db` object is now instantiated with the sql configuration. Since there's no need to initialize the connection anymore, code from `index.js` can be removed.

In db.js:

```javascript
const sqlConfig = { 
    // ...
}

// old
const db = new DB();

// new
const db = new DB(sqlConfig);

// or with logger
// old
const db = new DB(logger);

// new
const db = new DB(sqlConfig, logger);

```

`db.initiateConnection()` is deprecated, you can't initiate the connection manually. Call a stored procedure, it will happen automatically.

This part should be **removed** from index.js:

```javascript
import { db, sqlConfig } from './db';

// Make sure this runs before any call to the database is performed
db.initiateConnection(sqlConfig).catch((e) => {
  // Do some error handling, eg.:
  logger.error(e.message);
});

// ...
```

## Calling stored procedures

Input and output methods of `StoredProcedure()` have been renamed to make them more obvious, but old ones still work.

```javascript
const spOld =  new StoredProcedure('countChar');
const spNew =  new StoredProcedure('countChar');

// this still works
spOld.addParam('inputVal', 'VARCHAR', str, { length: 30 });
spOld.addOutputParam('outputCount', 'int');

// new 
spNew.input('inputVal', 'VARCHAR', str, { length: 30 });
spNew.output('outputCount', 'int');
```
