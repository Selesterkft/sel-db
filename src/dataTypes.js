import { TYPES } from 'tedious';

const dataTypes = {
  // Exact numerics
  bit: TYPES.Bit,
  tinyint: TYPES.TinyInt,
  smallint: TYPES.SmallInt,
  int: TYPES.Int,
  bigint: TYPES.BigInt,
  numeric: TYPES.Numeric,
  decimal: TYPES.Decimal,
  smallmoney: TYPES.SmallMoney,
  money: TYPES.Money,
  // Approximate numerics
  float: TYPES.Float,
  real: TYPES.Real,
  // Date and Time
  smalldatetime: TYPES.SmallDateTime,
  datetime: TYPES.DateTime,
  datetime2: TYPES.DateTime2,
  datetimeoffset: TYPES.DateTimeOffset,
  time: TYPES.Time,
  date: TYPES.Date,
  // Character Strings
  char: TYPES.Char,
  varchar: TYPES.VarChar,
  text: TYPES.Text,
  // Unicode Strings
  nchar: TYPES.NChar,
  nvarchar: TYPES.NVarChar,
  ntext: TYPES.NText,
  // Binary Strings
  binary: TYPES.Binary,
  varbinary: TYPES.VarBinary,
  image: TYPES.Image,
  // Other Data Types
  null: TYPES.Null,
  TVP: TYPES.TVP,
  UDT: TYPES.UDT,
  uniqueidentifier: TYPES.UniqueIdentifier,
  variant: TYPES.Variant,
  xml: TYPES.xml,
};

export default dataTypes;
