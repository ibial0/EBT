var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// node_modules/viem/_esm/utils/chain/defineChain.js
function defineChain(chain) {
  const chainInstance = {
    formatters: void 0,
    fees: void 0,
    serializers: void 0,
    ...chain
  };
  function extend(base) {
    return (fnOrExtended) => {
      const properties = typeof fnOrExtended === "function" ? fnOrExtended(base) : fnOrExtended;
      const combined = { ...base, ...properties };
      return Object.assign(combined, { extend: extend(combined) });
    };
  }
  return Object.assign(chainInstance, {
    extend: extend(chainInstance)
  });
}
var init_defineChain = __esm({
  "node_modules/viem/_esm/utils/chain/defineChain.js"() {
  }
});

// node_modules/viem/_esm/errors/version.js
var version;
var init_version = __esm({
  "node_modules/viem/_esm/errors/version.js"() {
    version = "2.58.4";
  }
});

// node_modules/viem/_esm/errors/base.js
function walk(err, fn) {
  if (fn?.(err))
    return err;
  if (err && typeof err === "object" && "cause" in err && err.cause !== void 0)
    return walk(err.cause, fn);
  return fn ? null : err;
}
var errorConfig, BaseError;
var init_base = __esm({
  "node_modules/viem/_esm/errors/base.js"() {
    init_version();
    errorConfig = {
      getDocsUrl: ({ docsBaseUrl, docsPath = "", docsSlug }) => docsPath ? `${docsBaseUrl ?? "https://viem.sh"}${docsPath}${docsSlug ? `#${docsSlug}` : ""}` : void 0,
      version: `viem@${version}`
    };
    BaseError = class _BaseError extends Error {
      constructor(shortMessage, args = {}) {
        const details = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.details;
          if (args.cause?.message)
            return args.cause.message;
          return args.details;
        })();
        const docsPath = (() => {
          if (args.cause instanceof _BaseError)
            return args.cause.docsPath || args.docsPath;
          return args.docsPath;
        })();
        const docsUrl = errorConfig.getDocsUrl?.({ ...args, docsPath });
        const message = [
          shortMessage || "An error occurred.",
          "",
          ...args.metaMessages ? [...args.metaMessages, ""] : [],
          ...docsUrl ? [`Docs: ${docsUrl}`] : [],
          ...details ? [`Details: ${details}`] : [],
          ...errorConfig.version ? [`Version: ${errorConfig.version}`] : []
        ].join("\n");
        super(message, args.cause ? { cause: args.cause } : void 0);
        Object.defineProperty(this, "details", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "docsPath", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "metaMessages", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "shortMessage", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "version", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "BaseError"
        });
        this.details = details;
        this.docsPath = docsPath;
        this.metaMessages = args.metaMessages;
        this.name = args.name ?? this.name;
        this.shortMessage = shortMessage;
        this.version = version;
      }
      walk(fn) {
        return walk(this, fn);
      }
    };
  }
});

// node_modules/viem/_esm/errors/encoding.js
var IntegerOutOfRangeError, SizeOverflowError;
var init_encoding = __esm({
  "node_modules/viem/_esm/errors/encoding.js"() {
    init_base();
    IntegerOutOfRangeError = class extends BaseError {
      constructor({ max, min, signed, size: size2, value }) {
        super(`Number "${value}" is not in safe ${size2 ? `${size2 * 8}-bit ${signed ? "signed" : "unsigned"} ` : ""}integer range ${max ? `(${min} to ${max})` : `(above ${min})`}`, { name: "IntegerOutOfRangeError" });
      }
    };
    SizeOverflowError = class extends BaseError {
      constructor({ givenSize, maxSize }) {
        super(`Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`, { name: "SizeOverflowError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/data/size.js
function size(value) {
  if (typeof value === "string" && value.startsWith("0x"))
    return Math.ceil((value.length - 2) / 2);
  return value.length;
}
var init_size = __esm({
  "node_modules/viem/_esm/utils/data/size.js"() {
  }
});

// node_modules/viem/_esm/utils/data/trim.js
function trim(hexOrBytes, { dir = "left" } = {}) {
  if (typeof hexOrBytes === "string") {
    let data2 = hexOrBytes.startsWith("0x") ? hexOrBytes.slice(2) : hexOrBytes.replace("0x", "");
    let count2 = 0;
    if (dir === "left") {
      while (count2 < data2.length - 1 && data2.charCodeAt(count2) === 48)
        count2++;
      data2 = data2.slice(count2);
    } else {
      while (count2 < data2.length - 2 && data2.charCodeAt(data2.length - count2 - 1) === 48 && data2.charCodeAt(data2.length - count2 - 2) === 48)
        count2 += 2;
      data2 = data2.slice(0, data2.length - count2);
    }
    if (data2.length === 1 && dir === "right")
      data2 = `${data2}0`;
    return `0x${data2.length % 2 === 1 ? `0${data2}` : data2}`;
  }
  const data = hexOrBytes;
  let count = 0;
  if (dir === "left") {
    while (count < data.length - 1 && data[count] === 0)
      count++;
    return data.slice(count);
  }
  while (count < data.length - 1 && data[data.length - count - 1] === 0)
    count++;
  return data.slice(0, data.length - count);
}
var init_trim = __esm({
  "node_modules/viem/_esm/utils/data/trim.js"() {
  }
});

// node_modules/viem/_esm/utils/data/isHex.js
function isHex(value, { even = false, strict = true } = {}) {
  if (!value)
    return false;
  if (typeof value !== "string")
    return false;
  if (even && value.length % 2 !== 0)
    return false;
  return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith("0x");
}
var init_isHex = __esm({
  "node_modules/viem/_esm/utils/data/isHex.js"() {
  }
});

// node_modules/viem/_esm/errors/data.js
var SliceOffsetOutOfBoundsError, SizeExceedsPaddingSizeError, InvalidBytesLengthError;
var init_data = __esm({
  "node_modules/viem/_esm/errors/data.js"() {
    init_base();
    SliceOffsetOutOfBoundsError = class extends BaseError {
      constructor({ offset, position, size: size2 }) {
        super(`Slice ${position === "start" ? "starting" : "ending"} at offset "${offset}" is out-of-bounds (size: ${size2}).`, { name: "SliceOffsetOutOfBoundsError" });
      }
    };
    SizeExceedsPaddingSizeError = class extends BaseError {
      constructor({ size: size2, targetSize, type }) {
        super(`${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()} size (${size2}) exceeds padding size (${targetSize}).`, { name: "SizeExceedsPaddingSizeError" });
      }
    };
    InvalidBytesLengthError = class extends BaseError {
      constructor({ size: size2, targetSize, type }) {
        super(`${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()} is expected to be ${targetSize} ${type} long, but is ${size2} ${type} long.`, { name: "InvalidBytesLengthError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/data/pad.js
function pad(hexOrBytes, { dir, size: size2 = 32 } = {}) {
  if (typeof hexOrBytes === "string")
    return padHex(hexOrBytes, { dir, size: size2 });
  return padBytes(hexOrBytes, { dir, size: size2 });
}
function padHex(hex_, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return hex_;
  const hex = hex_.startsWith("0x") ? hex_.slice(2) : hex_.replace("0x", "");
  if (hex.length > size2 * 2)
    throw new SizeExceedsPaddingSizeError({
      size: Math.ceil(hex.length / 2),
      targetSize: size2,
      type: "hex"
    });
  return `0x${hex[dir === "right" ? "padEnd" : "padStart"](size2 * 2, "0")}`;
}
function padBytes(bytes, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return bytes;
  if (bytes.length > size2)
    throw new SizeExceedsPaddingSizeError({
      size: bytes.length,
      targetSize: size2,
      type: "bytes"
    });
  const paddedBytes = new Uint8Array(size2);
  if (Number.isSafeInteger(size2)) {
    if (bytes.length > 0)
      paddedBytes.set(bytes, dir === "right" ? 0 : size2 - bytes.length);
    return paddedBytes;
  }
  for (let i = 0; i < size2; i++) {
    const padEnd = dir === "right";
    paddedBytes[padEnd ? i : size2 - i - 1] = bytes[padEnd ? i : bytes.length - i - 1];
  }
  return paddedBytes;
}
var init_pad = __esm({
  "node_modules/viem/_esm/utils/data/pad.js"() {
    init_data();
  }
});

// node_modules/viem/_esm/utils/encoding/toHex.js
function toHex(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToHex(value, opts);
  if (typeof value === "string") {
    return stringToHex(value, opts);
  }
  if (typeof value === "boolean")
    return boolToHex(value, opts);
  return bytesToHex(value, opts);
}
function boolToHex(value, opts = {}) {
  const hex = `0x${Number(value)}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { size: opts.size });
  }
  return hex;
}
function bytesToHex(value, opts = {}) {
  let string = "";
  if (nativeToHex && value instanceof Uint8Array && value.length > 0)
    string = nativeToHex.call(value);
  else
    for (let i = 0; i < value.length; i++) {
      string += hexes[value[i]];
    }
  const hex = `0x${string}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { dir: "right", size: opts.size });
  }
  return hex;
}
function numberToHex(value_, opts = {}) {
  const { signed, size: size2 } = opts;
  if (!signed && (typeof value_ === "bigint" ? value_ >= 0n : Number.isSafeInteger(value_) && value_ >= 0)) {
    const hex2 = value_.toString(16);
    if (!size2)
      return `0x${hex2}`;
    if (Number.isSafeInteger(size2) && size2 > 0 && hex2.length <= size2 * 2)
      return `0x${hex2.padStart(size2 * 2, "0")}`;
  }
  const value = BigInt(value_);
  let maxValue;
  if (size2) {
    if (signed)
      maxValue = (1n << BigInt(size2) * 8n - 1n) - 1n;
    else
      maxValue = 2n ** (BigInt(size2) * 8n) - 1n;
  } else if (typeof value_ === "number") {
    maxValue = BigInt(Number.MAX_SAFE_INTEGER);
  }
  const minValue = typeof maxValue === "bigint" && signed ? -maxValue - 1n : 0;
  if (maxValue && value > maxValue || value < minValue) {
    const suffix = typeof value_ === "bigint" ? "n" : "";
    throw new IntegerOutOfRangeError({
      max: maxValue ? `${maxValue}${suffix}` : void 0,
      min: `${minValue}${suffix}`,
      signed,
      size: size2,
      value: `${value_}${suffix}`
    });
  }
  const hex = `0x${(signed && value < 0 ? (1n << BigInt(size2 * 8)) + BigInt(value) : value).toString(16)}`;
  if (size2)
    return pad(hex, { size: size2 });
  return hex;
}
function stringToHex(value_, opts = {}) {
  return bytesToHex(stringToBytes(value_), opts);
}
var hexes, nativeToHex;
var init_toHex = __esm({
  "node_modules/viem/_esm/utils/encoding/toHex.js"() {
    init_encoding();
    init_pad();
    init_fromHex();
    init_toBytes();
    hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, "0"));
    nativeToHex = /* @__PURE__ */ (() => Uint8Array.prototype.toHex)();
  }
});

// node_modules/viem/_esm/utils/encoding/toBytes.js
function toBytes(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToBytes(value, opts);
  if (typeof value === "boolean")
    return boolToBytes(value, opts);
  if (!opts.size && typeof value === "string" && value.startsWith("0x")) {
    const bytes = decodeHex(value);
    if (bytes)
      return bytes;
  }
  if (isHex(value))
    return hexToBytes(value, opts);
  return stringToBytes(value, opts);
}
function boolToBytes(value, opts = {}) {
  const bytes = new Uint8Array(1);
  bytes[0] = Number(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { size: opts.size });
  }
  return bytes;
}
function decodeHex(hex, size2) {
  const odd = hex.length & 1;
  const length = hex.length - 1 >> 1;
  const bytes = new Uint8Array(size2 || length);
  let i = 0;
  let j = 2;
  if (odd) {
    const code = hex.charCodeAt(j++);
    const nibble = code < 128 ? nibbles[code] : -1;
    if (nibble < 0)
      return void 0;
    bytes[i++] = nibble;
  }
  for (; i < length; i++) {
    const a = hex.charCodeAt(j++);
    const b = hex.charCodeAt(j++);
    const high = a < 128 ? nibbles[a] : -1;
    const low = b < 128 ? nibbles[b] : -1;
    if ((high | low) < 0)
      return void 0;
    bytes[i] = high << 4 | low;
  }
  return bytes;
}
function charCodeToBase16(char) {
  if (char >= charCodeMap.zero && char <= charCodeMap.nine)
    return char - charCodeMap.zero;
  if (char >= charCodeMap.A && char <= charCodeMap.F)
    return char - (charCodeMap.A - 10);
  if (char >= charCodeMap.a && char <= charCodeMap.f)
    return char - (charCodeMap.a - 10);
  return void 0;
}
function hexToBytes(hex, opts = {}) {
  const size2 = opts.size;
  if (typeof hex === "string" && hex.length >= 2 && (!size2 || Number.isSafeInteger(size2) && size2 > 0)) {
    if (size2)
      assertSize(hex, { size: size2 });
    const bytes2 = decodeHex(hex, size2);
    if (bytes2)
      return bytes2;
  }
  let hexString = hex.slice(2);
  if (hexString.length % 2)
    hexString = `0${hexString}`;
  if (opts.size) {
    assertSize(hex, { size: opts.size });
    hexString = hexString.padEnd(opts.size * 2, "0");
  }
  const length = hexString.length / 2;
  const bytes = new Uint8Array(length);
  for (let index = 0, j = 0; index < length; index++) {
    const nibbleLeft = charCodeToBase16(hexString.charCodeAt(j++));
    const nibbleRight = charCodeToBase16(hexString.charCodeAt(j++));
    if (nibbleLeft === void 0 || nibbleRight === void 0) {
      throw new BaseError(`Invalid byte sequence ("${hexString[j - 2]}${hexString[j - 1]}" in "${hexString}").`);
    }
    bytes[index] = nibbleLeft * 16 + nibbleRight;
  }
  return bytes;
}
function numberToBytes(value, opts) {
  const hex = numberToHex(value, opts);
  return hexToBytes(hex);
}
function stringToBytes(value, opts = {}) {
  const bytes = (() => {
    if (typeof value === "string" && value.length <= 64) {
      const bytes2 = new Uint8Array(value.length);
      let i = 0;
      for (; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code > 127)
          break;
        bytes2[i] = code;
      }
      if (i === value.length)
        return bytes2;
    }
    return encoder.encode(value);
  })();
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { dir: "right", size: opts.size });
  }
  return bytes;
}
var encoder, nibbles, charCodeMap;
var init_toBytes = __esm({
  "node_modules/viem/_esm/utils/encoding/toBytes.js"() {
    init_base();
    init_isHex();
    init_pad();
    init_fromHex();
    init_toHex();
    encoder = /* @__PURE__ */ new TextEncoder();
    nibbles = /* @__PURE__ */ (() => {
      const table = new Int8Array(128).fill(-1);
      for (let i = 0; i < 10; i++)
        table[48 + i] = i;
      for (let i = 0; i < 6; i++)
        table[65 + i] = table[97 + i] = 10 + i;
      return table;
    })();
    charCodeMap = {
      zero: 48,
      nine: 57,
      A: 65,
      F: 70,
      a: 97,
      f: 102
    };
  }
});

// node_modules/viem/_esm/utils/encoding/fromHex.js
function assertSize(hexOrBytes, { size: size2 }) {
  if (size(hexOrBytes) > size2)
    throw new SizeOverflowError({
      givenSize: size(hexOrBytes),
      maxSize: size2
    });
}
function hexToBigInt(hex, opts = {}) {
  const { signed } = opts;
  if (opts.size)
    assertSize(hex, { size: opts.size });
  const value = BigInt(hex);
  if (!signed)
    return value;
  const size2 = Math.ceil((hex.length - 2) / 2);
  const max = (1n << BigInt(size2) * 8n - 1n) - 1n;
  if (value <= max)
    return value;
  if (typeof hex === "string" && hex.startsWith("0x"))
    return BigInt.asIntN(size2 * 8, value);
  return value - BigInt(`0x${"f".padStart(size2 * 2, "f")}`) - 1n;
}
function hexToNumber(hex, opts = {}) {
  const { signed, size: size2 } = opts;
  if (!signed && !size2 && typeof hex === "string" && hex.startsWith("0x")) {
    const number2 = Number(hex);
    if (Number.isSafeInteger(number2))
      return number2;
  }
  const value = hexToBigInt(hex, opts);
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new IntegerOutOfRangeError({
      max: `${Number.MAX_SAFE_INTEGER}`,
      min: `${Number.MIN_SAFE_INTEGER}`,
      signed,
      size: size2,
      value: `${value}n`
    });
  return number;
}
var init_fromHex = __esm({
  "node_modules/viem/_esm/utils/encoding/fromHex.js"() {
    init_encoding();
    init_size();
  }
});

// node_modules/viem/_esm/utils/formatters/formatter.js
function defineFormatter(type, format2) {
  return ({ exclude, format: overrides }) => {
    return {
      exclude,
      format: (args, action) => {
        const formatted = format2(args, action);
        if (exclude) {
          for (const key of exclude) {
            delete formatted[key];
          }
        }
        return {
          ...formatted,
          ...overrides(args, action)
        };
      },
      type
    };
  };
}
var init_formatter = __esm({
  "node_modules/viem/_esm/utils/formatters/formatter.js"() {
  }
});

// node_modules/viem/_esm/utils/formatters/transaction.js
function formatTransaction(transaction, _) {
  const type = transaction.type ? transactionType[transaction.type] : void 0;
  const rest = (() => {
    const value = transaction;
    if (type === "legacy") {
      const { accessList: _accessList, maxFeePerBlobGas: _maxFeePerBlobGas, maxFeePerGas: _maxFeePerGas, maxPriorityFeePerGas: _maxPriorityFeePerGas, yParity: _yParity, ...rest2 } = value;
      return rest2;
    }
    if (type === "eip2930") {
      const { maxFeePerBlobGas: _maxFeePerBlobGas, maxFeePerGas: _maxFeePerGas, maxPriorityFeePerGas: _maxPriorityFeePerGas, ...rest2 } = value;
      return rest2;
    }
    if (type === "eip1559") {
      const { maxFeePerBlobGas: _maxFeePerBlobGas, ...rest2 } = value;
      return rest2;
    }
    return transaction;
  })();
  const transaction_ = {
    ...rest,
    blockHash: transaction.blockHash ? transaction.blockHash : null,
    blockNumber: transaction.blockNumber ? BigInt(transaction.blockNumber) : null,
    ...transaction.blockTimestamp != null && {
      blockTimestamp: BigInt(transaction.blockTimestamp)
    },
    chainId: transaction.chainId ? hexToNumber(transaction.chainId) : void 0,
    gas: transaction.gas ? BigInt(transaction.gas) : void 0,
    gasPrice: transaction.gasPrice ? BigInt(transaction.gasPrice) : void 0,
    ...(() => {
      const maxFeePerBlobGas = transaction.maxFeePerBlobGas ? BigInt(transaction.maxFeePerBlobGas) : void 0;
      const maxFeePerGas = transaction.maxFeePerGas ? BigInt(transaction.maxFeePerGas) : void 0;
      const maxPriorityFeePerGas = transaction.maxPriorityFeePerGas ? BigInt(transaction.maxPriorityFeePerGas) : void 0;
      if (type === "legacy" || type === "eip2930")
        return {};
      if (type === "eip1559")
        return { maxFeePerGas, maxPriorityFeePerGas };
      return { maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas };
    })(),
    nonce: transaction.nonce ? hexToNumber(transaction.nonce) : void 0,
    to: transaction.to ? transaction.to : null,
    transactionIndex: transaction.transactionIndex ? Number(transaction.transactionIndex) : null,
    type,
    typeHex: transaction.type ? transaction.type : void 0,
    value: transaction.value ? BigInt(transaction.value) : void 0,
    v: transaction.v ? BigInt(transaction.v) : void 0
  };
  if (transaction.authorizationList)
    transaction_.authorizationList = formatAuthorizationList(transaction.authorizationList);
  const yParity = (() => {
    if (transaction.yParity)
      return Number(transaction.yParity);
    if (typeof transaction_.v === "bigint") {
      if (transaction_.v === 0n || transaction_.v === 27n)
        return 0;
      if (transaction_.v === 1n || transaction_.v === 28n)
        return 1;
      if (transaction_.v >= 35n)
        return transaction_.v % 2n === 0n ? 1 : 0;
    }
    return void 0;
  })();
  if (type !== "legacy")
    transaction_.yParity = yParity;
  return transaction_;
}
function formatAuthorizationList(authorizationList) {
  return authorizationList.map((authorization) => ({
    address: authorization.address,
    chainId: Number(authorization.chainId),
    nonce: Number(authorization.nonce),
    r: authorization.r,
    s: authorization.s,
    yParity: Number(authorization.yParity)
  }));
}
var transactionType, defineTransaction;
var init_transaction = __esm({
  "node_modules/viem/_esm/utils/formatters/transaction.js"() {
    init_fromHex();
    init_formatter();
    transactionType = {
      "0x0": "legacy",
      "0x1": "eip2930",
      "0x2": "eip1559",
      "0x3": "eip4844",
      "0x4": "eip7702"
    };
    defineTransaction = /* @__PURE__ */ defineFormatter("transaction", formatTransaction);
  }
});

// node_modules/viem/_esm/utils/formatters/block.js
function formatBlock(block2, _) {
  const transactions = (block2.transactions ?? []).map((transaction) => {
    if (typeof transaction === "string")
      return transaction;
    return formatTransaction(transaction);
  });
  return {
    ...block2,
    baseFeePerGas: block2.baseFeePerGas ? BigInt(block2.baseFeePerGas) : null,
    blobGasUsed: block2.blobGasUsed ? BigInt(block2.blobGasUsed) : void 0,
    difficulty: block2.difficulty ? BigInt(block2.difficulty) : void 0,
    excessBlobGas: block2.excessBlobGas ? BigInt(block2.excessBlobGas) : void 0,
    gasLimit: block2.gasLimit ? BigInt(block2.gasLimit) : void 0,
    gasUsed: block2.gasUsed ? BigInt(block2.gasUsed) : void 0,
    hash: block2.hash ? block2.hash : null,
    logsBloom: block2.logsBloom ? block2.logsBloom : null,
    nonce: block2.nonce ? block2.nonce : null,
    number: block2.number ? BigInt(block2.number) : null,
    size: block2.size ? BigInt(block2.size) : void 0,
    timestamp: block2.timestamp ? BigInt(block2.timestamp) : void 0,
    transactions,
    totalDifficulty: block2.totalDifficulty ? BigInt(block2.totalDifficulty) : null
  };
}
var init_block = __esm({
  "node_modules/viem/_esm/utils/formatters/block.js"() {
    init_transaction();
  }
});

// node_modules/viem/_esm/utils/formatters/log.js
function formatLog(log, { args, eventName } = {}) {
  const result = {
    ...log,
    blockHash: log.blockHash ? log.blockHash : null,
    blockNumber: log.blockNumber ? BigInt(log.blockNumber) : null,
    blockTimestamp: log.blockTimestamp ? BigInt(log.blockTimestamp) : log.blockTimestamp === null ? null : void 0,
    logIndex: log.logIndex ? Number(log.logIndex) : null,
    transactionHash: log.transactionHash ? log.transactionHash : null,
    transactionIndex: log.transactionIndex ? Number(log.transactionIndex) : null
  };
  if (eventName) {
    result.args = args;
    result.eventName = eventName;
  }
  return result;
}
var init_log = __esm({
  "node_modules/viem/_esm/utils/formatters/log.js"() {
  }
});

// node_modules/viem/_esm/utils/formatters/transactionReceipt.js
function formatTransactionReceipt(transactionReceipt, _) {
  const receipt = {
    ...transactionReceipt,
    blockNumber: transactionReceipt.blockNumber ? BigInt(transactionReceipt.blockNumber) : null,
    contractAddress: transactionReceipt.contractAddress ? transactionReceipt.contractAddress : null,
    cumulativeGasUsed: transactionReceipt.cumulativeGasUsed ? BigInt(transactionReceipt.cumulativeGasUsed) : null,
    effectiveGasPrice: transactionReceipt.effectiveGasPrice ? BigInt(transactionReceipt.effectiveGasPrice) : null,
    gasUsed: transactionReceipt.gasUsed ? BigInt(transactionReceipt.gasUsed) : null,
    logs: transactionReceipt.logs ? transactionReceipt.logs.map((log) => formatLog(log)) : null,
    to: transactionReceipt.to ? transactionReceipt.to : null,
    transactionIndex: transactionReceipt.transactionIndex ? hexToNumber(transactionReceipt.transactionIndex) : null,
    status: transactionReceipt.status ? receiptStatuses[transactionReceipt.status] : null,
    type: transactionReceipt.type ? transactionType[transactionReceipt.type] || transactionReceipt.type : null
  };
  if (transactionReceipt.blobGasPrice)
    receipt.blobGasPrice = BigInt(transactionReceipt.blobGasPrice);
  if (transactionReceipt.blobGasUsed)
    receipt.blobGasUsed = BigInt(transactionReceipt.blobGasUsed);
  return receipt;
}
var receiptStatuses, defineTransactionReceipt;
var init_transactionReceipt = __esm({
  "node_modules/viem/_esm/utils/formatters/transactionReceipt.js"() {
    init_fromHex();
    init_formatter();
    init_log();
    init_transaction();
    receiptStatuses = {
      "0x0": "reverted",
      "0x1": "success"
    };
    defineTransactionReceipt = /* @__PURE__ */ defineFormatter("transactionReceipt", formatTransactionReceipt);
  }
});

// node_modules/viem/_esm/utils/formatters/transactionRequest.js
function formatTransactionRequest(request, _) {
  const rpcRequest = {};
  if (typeof request.authorizationList !== "undefined")
    rpcRequest.authorizationList = formatAuthorizationList2(request.authorizationList);
  if (typeof request.accessList !== "undefined")
    rpcRequest.accessList = request.accessList;
  if (typeof request.blobVersionedHashes !== "undefined")
    rpcRequest.blobVersionedHashes = request.blobVersionedHashes;
  if (typeof request.blobs !== "undefined") {
    if (typeof request.blobs[0] !== "string")
      rpcRequest.blobs = request.blobs.map((x) => bytesToHex(x));
    else
      rpcRequest.blobs = request.blobs;
  }
  if (typeof request.data !== "undefined")
    rpcRequest.data = request.data;
  if (request.account)
    rpcRequest.from = request.account.address;
  if (typeof request.from !== "undefined")
    rpcRequest.from = request.from;
  if (typeof request.gas !== "undefined")
    rpcRequest.gas = numberToHex(request.gas);
  if (typeof request.gasPrice !== "undefined")
    rpcRequest.gasPrice = numberToHex(request.gasPrice);
  if (typeof request.maxFeePerBlobGas !== "undefined")
    rpcRequest.maxFeePerBlobGas = numberToHex(request.maxFeePerBlobGas);
  if (typeof request.maxFeePerGas !== "undefined")
    rpcRequest.maxFeePerGas = numberToHex(request.maxFeePerGas);
  if (typeof request.maxPriorityFeePerGas !== "undefined")
    rpcRequest.maxPriorityFeePerGas = numberToHex(request.maxPriorityFeePerGas);
  if (typeof request.nonce !== "undefined")
    rpcRequest.nonce = numberToHex(request.nonce);
  if (typeof request.to !== "undefined")
    rpcRequest.to = request.to;
  if (typeof request.type !== "undefined")
    rpcRequest.type = rpcTransactionType[request.type];
  if (typeof request.value !== "undefined")
    rpcRequest.value = numberToHex(request.value);
  return rpcRequest;
}
function formatAuthorizationList2(authorizationList) {
  return authorizationList.map((authorization) => ({
    address: authorization.address,
    r: authorization.r ? numberToHex(BigInt(authorization.r)) : authorization.r,
    s: authorization.s ? numberToHex(BigInt(authorization.s)) : authorization.s,
    chainId: numberToHex(authorization.chainId),
    nonce: numberToHex(authorization.nonce),
    ...typeof authorization.yParity !== "undefined" ? { yParity: numberToHex(authorization.yParity) } : {},
    ...typeof authorization.v !== "undefined" && typeof authorization.yParity === "undefined" ? { v: numberToHex(authorization.v) } : {}
  }));
}
var rpcTransactionType;
var init_transactionRequest = __esm({
  "node_modules/viem/_esm/utils/formatters/transactionRequest.js"() {
    init_toHex();
    rpcTransactionType = {
      legacy: "0x0",
      eip2930: "0x1",
      eip1559: "0x2",
      eip4844: "0x3",
      eip7702: "0x4"
    };
  }
});

// node_modules/viem/_esm/constants/number.js
var maxInt8, maxInt16, maxInt24, maxInt32, maxInt40, maxInt48, maxInt56, maxInt64, maxInt72, maxInt80, maxInt88, maxInt96, maxInt104, maxInt112, maxInt120, maxInt128, maxInt136, maxInt144, maxInt152, maxInt160, maxInt168, maxInt176, maxInt184, maxInt192, maxInt200, maxInt208, maxInt216, maxInt224, maxInt232, maxInt240, maxInt248, maxInt256, minInt8, minInt16, minInt24, minInt32, minInt40, minInt48, minInt56, minInt64, minInt72, minInt80, minInt88, minInt96, minInt104, minInt112, minInt120, minInt128, minInt136, minInt144, minInt152, minInt160, minInt168, minInt176, minInt184, minInt192, minInt200, minInt208, minInt216, minInt224, minInt232, minInt240, minInt248, minInt256, maxUint8, maxUint16, maxUint24, maxUint32, maxUint40, maxUint48, maxUint56, maxUint64, maxUint72, maxUint80, maxUint88, maxUint96, maxUint104, maxUint112, maxUint120, maxUint128, maxUint136, maxUint144, maxUint152, maxUint160, maxUint168, maxUint176, maxUint184, maxUint192, maxUint200, maxUint208, maxUint216, maxUint224, maxUint232, maxUint240, maxUint248, maxUint256;
var init_number = __esm({
  "node_modules/viem/_esm/constants/number.js"() {
    maxInt8 = 2n ** (8n - 1n) - 1n;
    maxInt16 = 2n ** (16n - 1n) - 1n;
    maxInt24 = 2n ** (24n - 1n) - 1n;
    maxInt32 = 2n ** (32n - 1n) - 1n;
    maxInt40 = 2n ** (40n - 1n) - 1n;
    maxInt48 = 2n ** (48n - 1n) - 1n;
    maxInt56 = 2n ** (56n - 1n) - 1n;
    maxInt64 = 2n ** (64n - 1n) - 1n;
    maxInt72 = 2n ** (72n - 1n) - 1n;
    maxInt80 = 2n ** (80n - 1n) - 1n;
    maxInt88 = 2n ** (88n - 1n) - 1n;
    maxInt96 = 2n ** (96n - 1n) - 1n;
    maxInt104 = 2n ** (104n - 1n) - 1n;
    maxInt112 = 2n ** (112n - 1n) - 1n;
    maxInt120 = 2n ** (120n - 1n) - 1n;
    maxInt128 = 2n ** (128n - 1n) - 1n;
    maxInt136 = 2n ** (136n - 1n) - 1n;
    maxInt144 = 2n ** (144n - 1n) - 1n;
    maxInt152 = 2n ** (152n - 1n) - 1n;
    maxInt160 = 2n ** (160n - 1n) - 1n;
    maxInt168 = 2n ** (168n - 1n) - 1n;
    maxInt176 = 2n ** (176n - 1n) - 1n;
    maxInt184 = 2n ** (184n - 1n) - 1n;
    maxInt192 = 2n ** (192n - 1n) - 1n;
    maxInt200 = 2n ** (200n - 1n) - 1n;
    maxInt208 = 2n ** (208n - 1n) - 1n;
    maxInt216 = 2n ** (216n - 1n) - 1n;
    maxInt224 = 2n ** (224n - 1n) - 1n;
    maxInt232 = 2n ** (232n - 1n) - 1n;
    maxInt240 = 2n ** (240n - 1n) - 1n;
    maxInt248 = 2n ** (248n - 1n) - 1n;
    maxInt256 = 2n ** (256n - 1n) - 1n;
    minInt8 = -(2n ** (8n - 1n));
    minInt16 = -(2n ** (16n - 1n));
    minInt24 = -(2n ** (24n - 1n));
    minInt32 = -(2n ** (32n - 1n));
    minInt40 = -(2n ** (40n - 1n));
    minInt48 = -(2n ** (48n - 1n));
    minInt56 = -(2n ** (56n - 1n));
    minInt64 = -(2n ** (64n - 1n));
    minInt72 = -(2n ** (72n - 1n));
    minInt80 = -(2n ** (80n - 1n));
    minInt88 = -(2n ** (88n - 1n));
    minInt96 = -(2n ** (96n - 1n));
    minInt104 = -(2n ** (104n - 1n));
    minInt112 = -(2n ** (112n - 1n));
    minInt120 = -(2n ** (120n - 1n));
    minInt128 = -(2n ** (128n - 1n));
    minInt136 = -(2n ** (136n - 1n));
    minInt144 = -(2n ** (144n - 1n));
    minInt152 = -(2n ** (152n - 1n));
    minInt160 = -(2n ** (160n - 1n));
    minInt168 = -(2n ** (168n - 1n));
    minInt176 = -(2n ** (176n - 1n));
    minInt184 = -(2n ** (184n - 1n));
    minInt192 = -(2n ** (192n - 1n));
    minInt200 = -(2n ** (200n - 1n));
    minInt208 = -(2n ** (208n - 1n));
    minInt216 = -(2n ** (216n - 1n));
    minInt224 = -(2n ** (224n - 1n));
    minInt232 = -(2n ** (232n - 1n));
    minInt240 = -(2n ** (240n - 1n));
    minInt248 = -(2n ** (248n - 1n));
    minInt256 = -(2n ** (256n - 1n));
    maxUint8 = 2n ** 8n - 1n;
    maxUint16 = 2n ** 16n - 1n;
    maxUint24 = 2n ** 24n - 1n;
    maxUint32 = 2n ** 32n - 1n;
    maxUint40 = 2n ** 40n - 1n;
    maxUint48 = 2n ** 48n - 1n;
    maxUint56 = 2n ** 56n - 1n;
    maxUint64 = 2n ** 64n - 1n;
    maxUint72 = 2n ** 72n - 1n;
    maxUint80 = 2n ** 80n - 1n;
    maxUint88 = 2n ** 88n - 1n;
    maxUint96 = 2n ** 96n - 1n;
    maxUint104 = 2n ** 104n - 1n;
    maxUint112 = 2n ** 112n - 1n;
    maxUint120 = 2n ** 120n - 1n;
    maxUint128 = 2n ** 128n - 1n;
    maxUint136 = 2n ** 136n - 1n;
    maxUint144 = 2n ** 144n - 1n;
    maxUint152 = 2n ** 152n - 1n;
    maxUint160 = 2n ** 160n - 1n;
    maxUint168 = 2n ** 168n - 1n;
    maxUint176 = 2n ** 176n - 1n;
    maxUint184 = 2n ** 184n - 1n;
    maxUint192 = 2n ** 192n - 1n;
    maxUint200 = 2n ** 200n - 1n;
    maxUint208 = 2n ** 208n - 1n;
    maxUint216 = 2n ** 216n - 1n;
    maxUint224 = 2n ** 224n - 1n;
    maxUint232 = 2n ** 232n - 1n;
    maxUint240 = 2n ** 240n - 1n;
    maxUint248 = 2n ** 248n - 1n;
    maxUint256 = 2n ** 256n - 1n;
  }
});

// node_modules/viem/_esm/utils/data/concat.js
function concatHex(values) {
  let result = "";
  for (const value of values)
    result += value.startsWith("0x") ? value.slice(2) : value.replace("0x", "");
  return `0x${result}`;
}
var init_concat = __esm({
  "node_modules/viem/_esm/utils/data/concat.js"() {
  }
});

// node_modules/viem/_esm/errors/cursor.js
var NegativeOffsetError, PositionOutOfBoundsError, RecursiveReadLimitExceededError;
var init_cursor = __esm({
  "node_modules/viem/_esm/errors/cursor.js"() {
    init_base();
    NegativeOffsetError = class extends BaseError {
      constructor({ offset }) {
        super(`Offset \`${offset}\` cannot be negative.`, {
          name: "NegativeOffsetError"
        });
      }
    };
    PositionOutOfBoundsError = class extends BaseError {
      constructor({ length, position }) {
        super(`Position \`${position}\` is out of bounds (\`0 < position < ${length}\`).`, { name: "PositionOutOfBoundsError" });
      }
    };
    RecursiveReadLimitExceededError = class extends BaseError {
      constructor({ count, limit }) {
        super(`Recursive read limit of \`${limit}\` exceeded (recursive read count: \`${count}\`).`, { name: "RecursiveReadLimitExceededError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/cursor.js
function createCursor(bytes, { recursiveReadLimit = 8192 } = {}) {
  const cursor = Object.create(staticCursor);
  cursor.bytes = bytes;
  cursor._dataView = void 0;
  cursor.positionReads = void 0;
  cursor.recursiveReadLimit = recursiveReadLimit;
  return cursor;
}
var staticCursor;
var init_cursor2 = __esm({
  "node_modules/viem/_esm/utils/cursor.js"() {
    init_cursor();
    staticCursor = {
      bytes: new Uint8Array(),
      // Created on first use: most cursors (e.g. ABI decoding) only read bytes.
      get dataView() {
        const cursor = this;
        cursor._dataView ??= new DataView(this.bytes.buffer ?? this.bytes, this.bytes.byteOffset, this.bytes.byteLength);
        return cursor._dataView;
      },
      position: 0,
      positionReads: void 0,
      recursiveReadCount: 0,
      recursiveReadLimit: Number.POSITIVE_INFINITY,
      assertReadLimit() {
        if (this.recursiveReadCount >= this.recursiveReadLimit)
          throw new RecursiveReadLimitExceededError({
            count: this.recursiveReadCount + 1,
            limit: this.recursiveReadLimit
          });
      },
      assertPosition(position) {
        if (position < 0 || position > this.bytes.length - 1)
          throw new PositionOutOfBoundsError({
            length: this.bytes.length,
            position
          });
      },
      decrementPosition(offset) {
        if (offset < 0)
          throw new NegativeOffsetError({ offset });
        const position = this.position - offset;
        this.assertPosition(position);
        this.position = position;
      },
      incrementPosition(offset) {
        if (offset < 0)
          throw new NegativeOffsetError({ offset });
        const position = this.position + offset;
        this.assertPosition(position);
        this.position = position;
      },
      inspectByte(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position);
        return this.bytes[position];
      },
      inspectBytes(length, position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + length - 1);
        return this.bytes.subarray(position, position + length);
      },
      inspectUint8(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position);
        return this.bytes[position];
      },
      inspectUint16(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 1);
        return this.dataView.getUint16(position);
      },
      inspectUint24(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 2);
        return (this.dataView.getUint16(position) << 8) + this.dataView.getUint8(position + 2);
      },
      inspectUint32(position_) {
        const position = position_ ?? this.position;
        this.assertPosition(position + 3);
        return this.dataView.getUint32(position);
      },
      pushByte(byte) {
        this.assertPosition(this.position);
        this.bytes[this.position] = byte;
        this.position++;
      },
      pushBytes(bytes) {
        this.assertPosition(this.position + bytes.length - 1);
        this.bytes.set(bytes, this.position);
        this.position += bytes.length;
      },
      pushUint8(value) {
        this.assertPosition(this.position);
        this.bytes[this.position] = value;
        this.position++;
      },
      pushUint16(value) {
        this.assertPosition(this.position + 1);
        this.dataView.setUint16(this.position, value);
        this.position += 2;
      },
      pushUint24(value) {
        this.assertPosition(this.position + 2);
        this.dataView.setUint16(this.position, value >> 8);
        this.dataView.setUint8(this.position + 2, value & ~4294967040);
        this.position += 3;
      },
      pushUint32(value) {
        this.assertPosition(this.position + 3);
        this.dataView.setUint32(this.position, value);
        this.position += 4;
      },
      readByte() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectByte();
        this.position++;
        return value;
      },
      readBytes(length, size2) {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectBytes(length);
        this.position += size2 ?? length;
        return value;
      },
      readUint8() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint8();
        this.position += 1;
        return value;
      },
      readUint16() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint16();
        this.position += 2;
        return value;
      },
      readUint24() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint24();
        this.position += 3;
        return value;
      },
      readUint32() {
        this.assertReadLimit();
        this._touch();
        const value = this.inspectUint32();
        this.position += 4;
        return value;
      },
      get remaining() {
        return this.bytes.length - this.position;
      },
      setPosition(position) {
        const oldPosition = this.position;
        this.assertPosition(position);
        this.position = position;
        return () => this.position = oldPosition;
      },
      _touch() {
        if (this.recursiveReadLimit === Number.POSITIVE_INFINITY)
          return;
        const index = this.position >>> 3;
        let reads = this.positionReads;
        if (!reads || index >= reads.length) {
          const next = new Uint8Array(Math.max(index + 1, (reads?.length ?? 8) * 2));
          if (reads)
            next.set(reads);
          reads = this.positionReads = next;
        }
        const mask = 1 << (this.position & 7);
        if (reads[index] & mask)
          this.recursiveReadCount++;
        else
          reads[index] |= mask;
      }
    };
  }
});

// node_modules/viem/_esm/utils/encoding/toRlp.js
function toRlp(bytes, to = "hex") {
  if (to === "hex")
    return ["0x", encodeHex(bytes)].join("");
  const encodable = getEncodable(bytes);
  const cursor = createCursor(new Uint8Array(encodable.length));
  encodable.encode(cursor);
  if (to === "hex")
    return bytesToHex(cursor.bytes);
  return cursor.bytes;
}
function encodeHex(value) {
  if (Array.isArray(value)) {
    let body2 = "";
    for (const item of value)
      body2 += encodeHex(item);
    return encodeHexPrefix(body2.length / 2, 192) + body2;
  }
  const body = (() => {
    if (typeof value === "string" && hexRegex.test(value)) {
      const hex = value.slice(2).toLowerCase();
      return hex.length % 2 ? `0${hex}` : hex;
    }
    if (value instanceof Uint8Array)
      return bytesToHex(value).slice(2);
    return void 0;
  })();
  if (body === void 0) {
    const encodable = getEncodableBytes(value);
    const cursor = createCursor(new Uint8Array(encodable.length));
    encodable.encode(cursor);
    return bytesToHex(cursor.bytes).slice(2);
  }
  if (body.length === 2 && body < "80")
    return body;
  return encodeHexPrefix(body.length / 2, 128) + body;
}
function encodeHexPrefix(length, offset) {
  if (length <= 55)
    return (offset + length).toString(16);
  const size2 = getSizeOfLength(length);
  return (offset + 55 + size2).toString(16) + length.toString(16).padStart(size2 * 2, "0");
}
function getEncodable(bytes) {
  if (Array.isArray(bytes))
    return getEncodableList(bytes.map((x) => getEncodable(x)));
  return getEncodableBytes(bytes);
}
function getEncodableList(list) {
  const bodyLength = list.reduce((acc, x) => acc + x.length, 0);
  const sizeOfBodyLength = getSizeOfLength(bodyLength);
  const length = (() => {
    if (bodyLength <= 55)
      return 1 + bodyLength;
    return 1 + sizeOfBodyLength + bodyLength;
  })();
  return {
    length,
    encode(cursor) {
      if (bodyLength <= 55) {
        cursor.pushByte(192 + bodyLength);
      } else {
        cursor.pushByte(192 + 55 + sizeOfBodyLength);
        if (sizeOfBodyLength === 1)
          cursor.pushUint8(bodyLength);
        else if (sizeOfBodyLength === 2)
          cursor.pushUint16(bodyLength);
        else if (sizeOfBodyLength === 3)
          cursor.pushUint24(bodyLength);
        else
          cursor.pushUint32(bodyLength);
      }
      for (const { encode } of list) {
        encode(cursor);
      }
    }
  };
}
function getEncodableBytes(bytesOrHex) {
  const bytes = typeof bytesOrHex === "string" ? hexToBytes(bytesOrHex) : bytesOrHex;
  const sizeOfBytesLength = getSizeOfLength(bytes.length);
  const length = (() => {
    if (bytes.length === 1 && bytes[0] < 128)
      return 1;
    if (bytes.length <= 55)
      return 1 + bytes.length;
    return 1 + sizeOfBytesLength + bytes.length;
  })();
  return {
    length,
    encode(cursor) {
      if (bytes.length === 1 && bytes[0] < 128) {
        cursor.pushBytes(bytes);
      } else if (bytes.length <= 55) {
        cursor.pushByte(128 + bytes.length);
        cursor.pushBytes(bytes);
      } else {
        cursor.pushByte(128 + 55 + sizeOfBytesLength);
        if (sizeOfBytesLength === 1)
          cursor.pushUint8(bytes.length);
        else if (sizeOfBytesLength === 2)
          cursor.pushUint16(bytes.length);
        else if (sizeOfBytesLength === 3)
          cursor.pushUint24(bytes.length);
        else
          cursor.pushUint32(bytes.length);
        cursor.pushBytes(bytes);
      }
    }
  };
}
function getSizeOfLength(length) {
  if (length < 2 ** 8)
    return 1;
  if (length < 2 ** 16)
    return 2;
  if (length < 2 ** 24)
    return 3;
  if (length < 2 ** 32)
    return 4;
  throw new BaseError("Length is too large.");
}
var hexRegex;
var init_toRlp = __esm({
  "node_modules/viem/_esm/utils/encoding/toRlp.js"() {
    init_base();
    init_cursor2();
    init_toBytes();
    init_toHex();
    hexRegex = /^0x[0-9a-fA-F]*$/;
  }
});

// node_modules/viem/_esm/utils/unit/Value.js
function format(value, decimals = 0) {
  if (!Number.isInteger(decimals) || decimals < 0)
    throw new InvalidDecimalsError({ decimals });
  let display = value.toString();
  const negative = display.startsWith("-");
  if (negative)
    display = display.slice(1);
  display = display.padStart(decimals, "0");
  const split2 = display.length - decimals;
  const integer = display.slice(0, split2);
  let end = display.length;
  while (end > split2 && display.charCodeAt(end - 1) === 48)
    end--;
  const fraction = display.slice(split2, end);
  return `${negative ? "-" : ""}${integer || "0"}${fraction ? `.${fraction}` : ""}`;
}
function formatEther(wei, unit = "wei") {
  return format(wei, exponents.ether - exponents[unit]);
}
function formatGwei(wei, unit = "wei") {
  return format(wei, exponents.gwei - exponents[unit]);
}
var exponents, InvalidDecimalsError;
var init_Value = __esm({
  "node_modules/viem/_esm/utils/unit/Value.js"() {
    exponents = {
      wei: 0,
      gwei: 9,
      szabo: 12,
      finney: 15,
      ether: 18
    };
    InvalidDecimalsError = class extends Error {
      constructor({ decimals }) {
        super(`\`decimals\` must be a non-negative integer. Got \`${decimals}\`.`);
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "Value.InvalidDecimalsError"
        });
      }
    };
  }
});

// node_modules/viem/_esm/utils/unit/formatEther.js
function formatEther2(wei, unit = "wei") {
  return formatEther(wei, unit);
}
var init_formatEther = __esm({
  "node_modules/viem/_esm/utils/unit/formatEther.js"() {
    init_Value();
  }
});

// node_modules/viem/_esm/utils/unit/formatGwei.js
function formatGwei2(wei, unit = "wei") {
  return formatGwei(wei, unit);
}
var init_formatGwei = __esm({
  "node_modules/viem/_esm/utils/unit/formatGwei.js"() {
    init_Value();
  }
});

// node_modules/viem/_esm/errors/transaction.js
function prettyPrint(args) {
  const entries = Object.entries(args).map(([key, value]) => {
    if (value === void 0 || value === false)
      return null;
    return [key, value];
  }).filter(Boolean);
  const maxLength = entries.reduce((acc, [key]) => Math.max(acc, key.length), 0);
  return entries.map(([key, value]) => `  ${`${key}:`.padEnd(maxLength + 1)}  ${value}`).join("\n");
}
var InvalidLegacyVError, InvalidSerializableTransactionError, InvalidStorageKeySizeError;
var init_transaction2 = __esm({
  "node_modules/viem/_esm/errors/transaction.js"() {
    init_base();
    InvalidLegacyVError = class extends BaseError {
      constructor({ v }) {
        super(`Invalid \`v\` value "${v}". Expected 27 or 28.`, {
          name: "InvalidLegacyVError"
        });
      }
    };
    InvalidSerializableTransactionError = class extends BaseError {
      constructor({ transaction }) {
        super("Cannot infer a transaction type from provided transaction.", {
          metaMessages: [
            "Provided Transaction:",
            "{",
            prettyPrint(transaction),
            "}",
            "",
            "To infer the type, either provide:",
            "- a `type` to the Transaction, or",
            "- an EIP-1559 Transaction with `maxFeePerGas`, or",
            "- an EIP-2930 Transaction with `gasPrice` & `accessList`, or",
            "- an EIP-4844 Transaction with `blobs`, `blobVersionedHashes`, `sidecars`, or",
            "- an EIP-7702 Transaction with `authorizationList`, or",
            "- a Legacy Transaction with `gasPrice`"
          ],
          name: "InvalidSerializableTransactionError"
        });
      }
    };
    InvalidStorageKeySizeError = class extends BaseError {
      constructor({ storageKey }) {
        super(`Size for storage key "${storageKey}" is invalid. Expected 32 bytes. Got ${Math.floor((storageKey.length - 2) / 2)} bytes.`, { name: "InvalidStorageKeySizeError" });
      }
    };
  }
});

// node_modules/viem/_esm/utils/authorization/serializeAuthorizationList.js
function serializeAuthorizationList(authorizationList) {
  if (!authorizationList || authorizationList.length === 0)
    return [];
  const serializedAuthorizationList = [];
  for (const authorization of authorizationList) {
    const { chainId, nonce, ...signature } = authorization;
    const contractAddress = authorization.address;
    const signatureArray = toYParitySignatureArray({}, signature);
    if (signatureArray.length > 0 && signature.yParity)
      signatureArray[0] = toHex(signature.yParity);
    serializedAuthorizationList.push([
      chainId ? toHex(chainId) : "0x",
      contractAddress,
      nonce ? toHex(nonce) : "0x",
      ...signatureArray
    ]);
  }
  return serializedAuthorizationList;
}
var init_serializeAuthorizationList = __esm({
  "node_modules/viem/_esm/utils/authorization/serializeAuthorizationList.js"() {
    init_toHex();
    init_serializeTransaction();
  }
});

// node_modules/viem/_esm/utils/blob/blobsToCommitments.js
function blobsToCommitments(parameters) {
  const { kzg } = parameters;
  const to = parameters.to ?? (typeof parameters.blobs[0] === "string" ? "hex" : "bytes");
  const blobs = typeof parameters.blobs[0] === "string" ? parameters.blobs.map((x) => hexToBytes(x)) : parameters.blobs;
  const commitments = [];
  for (const blob of blobs)
    commitments.push(Uint8Array.from(kzg.blobToKzgCommitment(blob)));
  return to === "bytes" ? commitments : commitments.map((x) => bytesToHex(x));
}
var init_blobsToCommitments = __esm({
  "node_modules/viem/_esm/utils/blob/blobsToCommitments.js"() {
    init_toBytes();
    init_toHex();
  }
});

// node_modules/viem/_esm/utils/blob/blobsToProofs.js
function blobsToProofs(parameters) {
  const { kzg } = parameters;
  const to = parameters.to ?? (typeof parameters.blobs[0] === "string" ? "hex" : "bytes");
  const blobs = typeof parameters.blobs[0] === "string" ? parameters.blobs.map((x) => hexToBytes(x)) : parameters.blobs;
  const commitments = typeof parameters.commitments[0] === "string" ? parameters.commitments.map((x) => hexToBytes(x)) : parameters.commitments;
  const proofs = [];
  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    const commitment = commitments[i];
    proofs.push(Uint8Array.from(kzg.computeBlobKzgProof(blob, commitment)));
  }
  return to === "bytes" ? proofs : proofs.map((x) => bytesToHex(x));
}
var init_blobsToProofs = __esm({
  "node_modules/viem/_esm/utils/blob/blobsToProofs.js"() {
    init_toBytes();
    init_toHex();
  }
});

// node_modules/@noble/hashes/esm/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes2(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes2(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
var isLE, swap32IfBE, Hash;
var init_utils = __esm({
  "node_modules/@noble/hashes/esm/utils.js"() {
    isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
    swap32IfBE = isLE ? (u) => u : byteSwap32;
    Hash = class {
    };
  }
});

// node_modules/@noble/hashes/esm/_md.js
function setBigUint64(view, byteOffset, value, isLE2) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value, isLE2);
  const _32n2 = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n2 & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE2 ? 4 : 0;
  const l = isLE2 ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE2);
  view.setUint32(byteOffset + l, wl, isLE2);
}
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD, SHA256_IV;
var init_md = __esm({
  "node_modules/@noble/hashes/esm/_md.js"() {
    init_utils();
    HashMD = class extends Hash {
      constructor(blockLen, outputLen, padOffset, isLE2) {
        super();
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE2;
        this.buffer = new Uint8Array(blockLen);
        this.view = createView(this.buffer);
      }
      update(data) {
        aexists(this);
        data = toBytes2(data);
        abytes(data);
        const { view, buffer, blockLen } = this;
        const len = data.length;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          if (take === blockLen) {
            const dataView = createView(data);
            for (; blockLen <= len - pos; pos += blockLen)
              this.process(dataView, pos);
            continue;
          }
          buffer.set(data.subarray(pos, pos + take), this.pos);
          this.pos += take;
          pos += take;
          if (this.pos === blockLen) {
            this.process(view, 0);
            this.pos = 0;
          }
        }
        this.length += data.length;
        this.roundClean();
        return this;
      }
      digestInto(out) {
        aexists(this);
        aoutput(out, this);
        this.finished = true;
        const { buffer, view, blockLen, isLE: isLE2 } = this;
        let { pos } = this;
        buffer[pos++] = 128;
        clean(this.buffer.subarray(pos));
        if (this.padOffset > blockLen - pos) {
          this.process(view, 0);
          pos = 0;
        }
        for (let i = pos; i < blockLen; i++)
          buffer[i] = 0;
        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE2);
        this.process(view, 0);
        const oview = createView(out);
        const len = this.outputLen;
        if (len % 4)
          throw new Error("_sha2: outputLen should be aligned to 32bit");
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length)
          throw new Error("_sha2: outputLen bigger than state");
        for (let i = 0; i < outLen; i++)
          oview.setUint32(4 * i, state[i], isLE2);
      }
      digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
      }
      _cloneInto(to) {
        to || (to = new this.constructor());
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.destroyed = destroyed;
        to.finished = finished;
        to.length = length;
        to.pos = pos;
        if (length % blockLen)
          to.buffer.set(buffer);
        return to;
      }
      clone() {
        return this._cloneInto();
      }
    };
    SHA256_IV = /* @__PURE__ */ Uint32Array.from([
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ]);
  }
});

// node_modules/@noble/hashes/esm/_u64.js
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var U32_MASK64, _32n, rotlSH, rotlSL, rotlBH, rotlBL;
var init_u64 = __esm({
  "node_modules/@noble/hashes/esm/_u64.js"() {
    U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
    _32n = /* @__PURE__ */ BigInt(32);
    rotlSH = (h, l, s) => h << s | l >>> 32 - s;
    rotlSL = (h, l, s) => l << s | h >>> 32 - s;
    rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
    rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
  }
});

// node_modules/@noble/hashes/esm/sha2.js
var SHA256_K, SHA256_W, SHA256, sha256;
var init_sha2 = __esm({
  "node_modules/@noble/hashes/esm/sha2.js"() {
    init_md();
    init_utils();
    SHA256_K = /* @__PURE__ */ Uint32Array.from([
      1116352408,
      1899447441,
      3049323471,
      3921009573,
      961987163,
      1508970993,
      2453635748,
      2870763221,
      3624381080,
      310598401,
      607225278,
      1426881987,
      1925078388,
      2162078206,
      2614888103,
      3248222580,
      3835390401,
      4022224774,
      264347078,
      604807628,
      770255983,
      1249150122,
      1555081692,
      1996064986,
      2554220882,
      2821834349,
      2952996808,
      3210313671,
      3336571891,
      3584528711,
      113926993,
      338241895,
      666307205,
      773529912,
      1294757372,
      1396182291,
      1695183700,
      1986661051,
      2177026350,
      2456956037,
      2730485921,
      2820302411,
      3259730800,
      3345764771,
      3516065817,
      3600352804,
      4094571909,
      275423344,
      430227734,
      506948616,
      659060556,
      883997877,
      958139571,
      1322822218,
      1537002063,
      1747873779,
      1955562222,
      2024104815,
      2227730452,
      2361852424,
      2428436474,
      2756734187,
      3204031479,
      3329325298
    ]);
    SHA256_W = /* @__PURE__ */ new Uint32Array(64);
    SHA256 = class extends HashMD {
      constructor(outputLen = 32) {
        super(64, outputLen, 8, false);
        this.A = SHA256_IV[0] | 0;
        this.B = SHA256_IV[1] | 0;
        this.C = SHA256_IV[2] | 0;
        this.D = SHA256_IV[3] | 0;
        this.E = SHA256_IV[4] | 0;
        this.F = SHA256_IV[5] | 0;
        this.G = SHA256_IV[6] | 0;
        this.H = SHA256_IV[7] | 0;
      }
      get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
      }
      // prettier-ignore
      set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
      }
      process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4)
          SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
          const W15 = SHA256_W[i - 15];
          const W2 = SHA256_W[i - 2];
          const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
          const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
          SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
        }
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
          const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
          const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
          const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
          const T2 = sigma0 + Maj(A, B, C) | 0;
          H = G;
          G = F;
          F = E;
          E = D + T1 | 0;
          D = C;
          C = B;
          B = A;
          A = T1 + T2 | 0;
        }
        A = A + this.A | 0;
        B = B + this.B | 0;
        C = C + this.C | 0;
        D = D + this.D | 0;
        E = E + this.E | 0;
        F = F + this.F | 0;
        G = G + this.G | 0;
        H = H + this.H | 0;
        this.set(A, B, C, D, E, F, G, H);
      }
      roundClean() {
        clean(SHA256_W);
      }
      destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        clean(this.buffer);
      }
    };
    sha256 = /* @__PURE__ */ createHasher(() => new SHA256());
  }
});

// node_modules/@noble/hashes/esm/sha256.js
var sha2562;
var init_sha256 = __esm({
  "node_modules/@noble/hashes/esm/sha256.js"() {
    init_sha2();
    sha2562 = sha256;
  }
});

// node_modules/viem/_esm/utils/hash/sha256.js
function sha2563(value, to_) {
  const to = to_ || "hex";
  const bytes = sha2562(isHex(value, { strict: false }) ? toBytes(value) : value);
  if (to === "bytes")
    return bytes;
  return toHex(bytes);
}
var init_sha2562 = __esm({
  "node_modules/viem/_esm/utils/hash/sha256.js"() {
    init_sha256();
    init_isHex();
    init_toBytes();
    init_toHex();
  }
});

// node_modules/viem/_esm/utils/blob/commitmentToVersionedHash.js
function commitmentToVersionedHash(parameters) {
  const { commitment, version: version3 = 1 } = parameters;
  const to = parameters.to ?? (typeof commitment === "string" ? "hex" : "bytes");
  const versionedHash = sha2563(commitment, "bytes");
  versionedHash.set([version3], 0);
  return to === "bytes" ? versionedHash : bytesToHex(versionedHash);
}
var init_commitmentToVersionedHash = __esm({
  "node_modules/viem/_esm/utils/blob/commitmentToVersionedHash.js"() {
    init_toHex();
    init_sha2562();
  }
});

// node_modules/viem/_esm/utils/blob/commitmentsToVersionedHashes.js
function commitmentsToVersionedHashes(parameters) {
  const { commitments, version: version3 } = parameters;
  const to = parameters.to ?? (typeof commitments[0] === "string" ? "hex" : "bytes");
  const hashes = [];
  for (const commitment of commitments) {
    hashes.push(commitmentToVersionedHash({
      commitment,
      to,
      version: version3
    }));
  }
  return hashes;
}
var init_commitmentsToVersionedHashes = __esm({
  "node_modules/viem/_esm/utils/blob/commitmentsToVersionedHashes.js"() {
    init_commitmentToVersionedHash();
  }
});

// node_modules/viem/_esm/constants/blob.js
var blobsPerTransaction, bytesPerFieldElement, fieldElementsPerBlob, bytesPerBlob, maxBytesPerTransaction;
var init_blob = __esm({
  "node_modules/viem/_esm/constants/blob.js"() {
    blobsPerTransaction = 6;
    bytesPerFieldElement = 32;
    fieldElementsPerBlob = 4096;
    bytesPerBlob = bytesPerFieldElement * fieldElementsPerBlob;
    maxBytesPerTransaction = bytesPerBlob * blobsPerTransaction - // terminator byte (0x80).
    1 - // zero byte (0x00) appended to each field element.
    1 * fieldElementsPerBlob * blobsPerTransaction;
  }
});

// node_modules/viem/_esm/constants/kzg.js
var versionedHashVersionKzg;
var init_kzg = __esm({
  "node_modules/viem/_esm/constants/kzg.js"() {
    versionedHashVersionKzg = 1;
  }
});

// node_modules/viem/_esm/errors/blob.js
var BlobSizeTooLargeError, EmptyBlobError, InvalidVersionedHashSizeError, InvalidVersionedHashVersionError;
var init_blob2 = __esm({
  "node_modules/viem/_esm/errors/blob.js"() {
    init_kzg();
    init_base();
    BlobSizeTooLargeError = class extends BaseError {
      constructor({ maxSize, size: size2 }) {
        super("Blob size is too large.", {
          metaMessages: [`Max: ${maxSize} bytes`, `Given: ${size2} bytes`],
          name: "BlobSizeTooLargeError"
        });
      }
    };
    EmptyBlobError = class extends BaseError {
      constructor() {
        super("Blob data must not be empty.", { name: "EmptyBlobError" });
      }
    };
    InvalidVersionedHashSizeError = class extends BaseError {
      constructor({ hash, size: size2 }) {
        super(`Versioned hash "${hash}" size is invalid.`, {
          metaMessages: ["Expected: 32", `Received: ${size2}`],
          name: "InvalidVersionedHashSizeError"
        });
      }
    };
    InvalidVersionedHashVersionError = class extends BaseError {
      constructor({ hash, version: version3 }) {
        super(`Versioned hash "${hash}" version is invalid.`, {
          metaMessages: [
            `Expected: ${versionedHashVersionKzg}`,
            `Received: ${version3}`
          ],
          name: "InvalidVersionedHashVersionError"
        });
      }
    };
  }
});

// node_modules/viem/_esm/utils/blob/toBlobs.js
function toBlobs(parameters) {
  const to = parameters.to ?? (typeof parameters.data === "string" ? "hex" : "bytes");
  const data = typeof parameters.data === "string" ? hexToBytes(parameters.data) : parameters.data;
  const size_ = size(data);
  if (!size_)
    throw new EmptyBlobError();
  if (size_ > maxBytesPerTransaction)
    throw new BlobSizeTooLargeError({
      maxSize: maxBytesPerTransaction,
      size: size_
    });
  const blobs = [];
  let active = true;
  let position = 0;
  while (active) {
    const blob = createCursor(new Uint8Array(bytesPerBlob));
    let size2 = 0;
    while (size2 < fieldElementsPerBlob) {
      const bytes = data.slice(position, position + (bytesPerFieldElement - 1));
      blob.pushByte(0);
      blob.pushBytes(bytes);
      if (bytes.length < 31) {
        blob.pushByte(128);
        active = false;
        break;
      }
      size2++;
      position += 31;
    }
    blobs.push(blob);
  }
  return to === "bytes" ? blobs.map((x) => x.bytes) : blobs.map((x) => bytesToHex(x.bytes));
}
var init_toBlobs = __esm({
  "node_modules/viem/_esm/utils/blob/toBlobs.js"() {
    init_blob();
    init_blob2();
    init_cursor2();
    init_size();
    init_toBytes();
    init_toHex();
  }
});

// node_modules/viem/_esm/utils/blob/toBlobSidecars.js
function toBlobSidecars(parameters) {
  const { data, kzg, to } = parameters;
  const blobs = parameters.blobs ?? toBlobs({ data, to });
  const commitments = parameters.commitments ?? blobsToCommitments({ blobs, kzg, to });
  const proofs = parameters.proofs ?? blobsToProofs({ blobs, commitments, kzg, to });
  const sidecars = [];
  for (let i = 0; i < blobs.length; i++)
    sidecars.push({
      blob: blobs[i],
      commitment: commitments[i],
      proof: proofs[i]
    });
  return sidecars;
}
var init_toBlobSidecars = __esm({
  "node_modules/viem/_esm/utils/blob/toBlobSidecars.js"() {
    init_blobsToCommitments();
    init_blobsToProofs();
    init_toBlobs();
  }
});

// node_modules/viem/_esm/errors/address.js
var InvalidAddressError;
var init_address = __esm({
  "node_modules/viem/_esm/errors/address.js"() {
    init_base();
    InvalidAddressError = class extends BaseError {
      constructor({ address }) {
        super(`Address "${address}" is invalid.`, {
          metaMessages: [
            "- Address must be a hex value of 20 bytes (40 hex characters).",
            "- Address must match its checksum counterpart."
          ],
          name: "InvalidAddressError"
        });
      }
    };
  }
});

// node_modules/viem/_esm/errors/chain.js
var InvalidChainIdError;
var init_chain = __esm({
  "node_modules/viem/_esm/errors/chain.js"() {
    init_base();
    InvalidChainIdError = class extends BaseError {
      constructor({ chainId }) {
        super(typeof chainId === "number" ? `Chain ID "${chainId}" is invalid.` : "Chain ID is invalid.", { name: "InvalidChainIdError" });
      }
    };
  }
});

// node_modules/viem/_esm/errors/node.js
var ExecutionRevertedError, FeeCapTooHighError, FeeCapTooLowError, NonceTooHighError, NonceTooLowError, NonceMaxValueError, InsufficientFundsError, IntrinsicGasTooHighError, IntrinsicGasTooLowError, TransactionTypeNotSupportedError, TipAboveFeeCapError, UnknownNodeError;
var init_node = __esm({
  "node_modules/viem/_esm/errors/node.js"() {
    init_formatGwei();
    init_base();
    ExecutionRevertedError = class extends BaseError {
      constructor({ cause, message } = {}) {
        const reason = message?.replace("execution reverted: ", "")?.replace("execution reverted", "");
        super(`Execution reverted ${reason ? `with reason: ${reason}` : "for an unknown reason"}.`, {
          cause,
          name: "ExecutionRevertedError"
        });
      }
    };
    Object.defineProperty(ExecutionRevertedError, "code", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: 3
    });
    Object.defineProperty(ExecutionRevertedError, "nodeMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: /execution reverted|gas required exceeds allowance/
    });
    FeeCapTooHighError = class extends BaseError {
      constructor({ cause, maxFeePerGas } = {}) {
        super(`The fee cap (\`maxFeePerGas\`${typeof maxFeePerGas === "bigint" ? ` = ${formatGwei2(maxFeePerGas)} gwei` : ""}) cannot be higher than the maximum allowed value (2^256-1).`, {
          cause,
          name: "FeeCapTooHighError"
        });
      }
    };
    Object.defineProperty(FeeCapTooHighError, "nodeMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: /max fee per gas higher than 2\^256-1|fee cap higher than 2\^256-1/
    });
    FeeCapTooLowError = class extends BaseError {
      constructor({ cause, maxFeePerGas } = {}) {
        super(`The fee cap (\`maxFeePerGas\`${typeof maxFeePerGas === "bigint" ? ` = ${formatGwei2(maxFeePerGas)} gwei` : ""}) cannot be lower than the block base fee.`, {
          cause,
          name: "FeeCapTooLowError"
        });
      }
    };
    Object.defineProperty(FeeCapTooLowError, "nodeMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: /max fee per gas less than block base fee|fee cap less than block base fee|transaction is outdated/
    });
    NonceTooHighError = class extends BaseError {
      constructor({ cause, nonce } = {}) {
        super(`Nonce provided for the transaction ${nonce ? `(${nonce}) ` : ""}is higher than the next one expected.`, { cause, name: "NonceTooHighError" });
      }
    };
    Object.defineProperty(NonceTooHighError, "nodeMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: /nonce too high/
    });
    NonceTooLowError = class extends BaseError {
      constructor({ cause, nonce } = {}) {
        super([
          `Nonce provided for the transaction ${nonce ? `(${nonce}) ` : ""}is lower than the current nonce of the account.`,
          "Try increasing the nonce or find the latest nonce with `getTransactionCount`."
        ].join("\n"), { cause, name: "NonceTooLowError" });
      }
    };
    Object.defineProperty(NonceTooLowError, "nodeMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: /nonce too low|transaction already imported|already known/
    });
    NonceMaxValueError = class extends BaseError {
      constructor({ cause, nonce } = {}) {
        super(`Nonce provided for the transaction ${nonce ? `(${nonce}) ` : ""}exceeds the maximum allowed nonce.`, { cause, name: "NonceMaxValueError" });
      }
    };
    Object.defineProperty(NonceMaxValueError, "nodeMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: /nonce has max value/
    });
    InsufficientFundsError = class extends BaseError {
      constructor({ cause } = {}) {
        super([
          "The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account."
        ].join("\n"), {
          cause,
          metaMessages: [
            "This error could arise when the account does not have enough funds to:",
            " - pay for the total gas fee,",
            " - pay for the value to send.",
            " ",
            "The cost of the transaction is calculated as `gas * gas fee + value`, where:",
            " - `gas` is the amount of gas needed for transaction to execute,",
            " - `gas fee` is the gas fee,",
            " - `value` is the amount of ether to send to the recipient."
          ],
          name: "InsufficientFundsError"
        });
      }
    };
    Object.defineProperty(InsufficientFundsError, "nodeMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: /insufficient funds|exceeds transaction sender account balance|outoffunds/
    });
    IntrinsicGasTooHighError = class extends BaseError {
      constructor({ cause, gas } = {}) {
        super(`The amount of gas ${gas ? `(${gas}) ` : ""}provided for the transaction exceeds the limit allowed for the block.`, {
          cause,
          name: "IntrinsicGasTooHighError"
        });
      }
    };
    Object.defineProperty(IntrinsicGasTooHighError, "nodeMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: /intrinsic gas too high|gas limit reached/
    });
    IntrinsicGasTooLowError = class extends BaseError {
      constructor({ cause, gas } = {}) {
        super(`The amount of gas ${gas ? `(${gas}) ` : ""}provided for the transaction is too low.`, {
          cause,
          name: "IntrinsicGasTooLowError"
        });
      }
    };
    Object.defineProperty(IntrinsicGasTooLowError, "nodeMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: /intrinsic gas too low/
    });
    TransactionTypeNotSupportedError = class extends BaseError {
      constructor({ cause }) {
        super("The transaction type is not supported for this chain.", {
          cause,
          name: "TransactionTypeNotSupportedError"
        });
      }
    };
    Object.defineProperty(TransactionTypeNotSupportedError, "nodeMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: /transaction type not valid/
    });
    TipAboveFeeCapError = class extends BaseError {
      constructor({ cause, maxPriorityFeePerGas, maxFeePerGas } = {}) {
        super([
          `The provided tip (\`maxPriorityFeePerGas\`${typeof maxPriorityFeePerGas === "bigint" ? ` = ${formatGwei2(maxPriorityFeePerGas)} gwei` : ""}) cannot be higher than the fee cap (\`maxFeePerGas\`${typeof maxFeePerGas === "bigint" ? ` = ${formatGwei2(maxFeePerGas)} gwei` : ""}).`
        ].join("\n"), {
          cause,
          name: "TipAboveFeeCapError"
        });
      }
    };
    Object.defineProperty(TipAboveFeeCapError, "nodeMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: /max priority fee per gas higher than max fee per gas|tip higher than fee cap/
    });
    UnknownNodeError = class extends BaseError {
      constructor({ cause }) {
        super(`An error occurred while executing: ${cause?.shortMessage}`, {
          cause,
          name: "UnknownNodeError"
        });
      }
    };
  }
});

// node_modules/viem/_esm/utils/lru.js
var LruMap;
var init_lru = __esm({
  "node_modules/viem/_esm/utils/lru.js"() {
    LruMap = class extends Map {
      constructor(size2) {
        super();
        Object.defineProperty(this, "maxSize", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.maxSize = size2;
      }
      get(key) {
        const value = super.get(key);
        if (super.has(key)) {
          super.delete(key);
          super.set(key, value);
        }
        return value;
      }
      set(key, value) {
        if (super.has(key))
          super.delete(key);
        super.set(key, value);
        if (this.maxSize && this.size > this.maxSize) {
          const firstKey = super.keys().next().value;
          if (firstKey !== void 0)
            super.delete(firstKey);
        }
        return this;
      }
    };
  }
});

// node_modules/@noble/hashes/esm/sha3.js
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds; round < 24; round++) {
    for (let x = 0; x < 10; x++)
      B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t2 = 0; t2 < 24; t2++) {
      const shift = SHA3_ROTL[t2];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t2];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++)
        B[x] = s[y + x];
      for (let x = 0; x < 10; x++)
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}
var _0n, _1n, _2n, _7n, _256n, _0x71n, SHA3_PI, SHA3_ROTL, _SHA3_IOTA, IOTAS, SHA3_IOTA_H, SHA3_IOTA_L, rotlH, rotlL, Keccak, gen, keccak_256;
var init_sha3 = __esm({
  "node_modules/@noble/hashes/esm/sha3.js"() {
    init_u64();
    init_utils();
    _0n = BigInt(0);
    _1n = BigInt(1);
    _2n = BigInt(2);
    _7n = BigInt(7);
    _256n = BigInt(256);
    _0x71n = BigInt(113);
    SHA3_PI = [];
    SHA3_ROTL = [];
    _SHA3_IOTA = [];
    for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
      [x, y] = [y, (2 * x + 3 * y) % 5];
      SHA3_PI.push(2 * (5 * y + x));
      SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
      let t2 = _0n;
      for (let j = 0; j < 7; j++) {
        R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
        if (R & _2n)
          t2 ^= _1n << (_1n << /* @__PURE__ */ BigInt(j)) - _1n;
      }
      _SHA3_IOTA.push(t2);
    }
    IOTAS = split(_SHA3_IOTA, true);
    SHA3_IOTA_H = IOTAS[0];
    SHA3_IOTA_L = IOTAS[1];
    rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
    rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
    Keccak = class _Keccak extends Hash {
      // NOTE: we accept arguments in bytes instead of bits here.
      constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        this.enableXOF = false;
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        anumber(outputLen);
        if (!(0 < blockLen && blockLen < 200))
          throw new Error("only keccak-f1600 function is supported");
        this.state = new Uint8Array(200);
        this.state32 = u32(this.state);
      }
      clone() {
        return this._cloneInto();
      }
      keccak() {
        swap32IfBE(this.state32);
        keccakP(this.state32, this.rounds);
        swap32IfBE(this.state32);
        this.posOut = 0;
        this.pos = 0;
      }
      update(data) {
        aexists(this);
        data = toBytes2(data);
        abytes(data);
        const { blockLen, state } = this;
        const len = data.length;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          for (let i = 0; i < take; i++)
            state[this.pos++] ^= data[pos++];
          if (this.pos === blockLen)
            this.keccak();
        }
        return this;
      }
      finish() {
        if (this.finished)
          return;
        this.finished = true;
        const { state, suffix, pos, blockLen } = this;
        state[pos] ^= suffix;
        if ((suffix & 128) !== 0 && pos === blockLen - 1)
          this.keccak();
        state[blockLen - 1] ^= 128;
        this.keccak();
      }
      writeInto(out) {
        aexists(this, false);
        abytes(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len; ) {
          if (this.posOut >= blockLen)
            this.keccak();
          const take = Math.min(blockLen - this.posOut, len - pos);
          out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
          this.posOut += take;
          pos += take;
        }
        return out;
      }
      xofInto(out) {
        if (!this.enableXOF)
          throw new Error("XOF is not possible for this instance");
        return this.writeInto(out);
      }
      xof(bytes) {
        anumber(bytes);
        return this.xofInto(new Uint8Array(bytes));
      }
      digestInto(out) {
        aoutput(out, this);
        if (this.finished)
          throw new Error("digest() was already called");
        this.writeInto(out);
        this.destroy();
        return out;
      }
      digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
      }
      destroy() {
        this.destroyed = true;
        clean(this.state);
      }
      _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to || (to = new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
      }
    };
    gen = (suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen));
    keccak_256 = /* @__PURE__ */ (() => gen(1, 136, 256 / 8))();
  }
});

// node_modules/viem/_esm/utils/hash/keccak256.js
function keccak256(value, to_) {
  const to = to_ || "hex";
  const bytes = keccak_256(isHex(value, { strict: false }) ? toBytes(value) : value);
  if (to === "bytes")
    return bytes;
  return toHex(bytes);
}
var init_keccak256 = __esm({
  "node_modules/viem/_esm/utils/hash/keccak256.js"() {
    init_sha3();
    init_isHex();
    init_toBytes();
    init_toHex();
  }
});

// node_modules/viem/_esm/utils/address/getAddress.js
function checksumAddress(address_, chainId) {
  const lower = address_.toLowerCase();
  const cacheKey = `${lower}.${chainId}`;
  const cached = checksumAddressCache.get(cacheKey);
  if (cached)
    return cached;
  const hexAddress = chainId ? `${chainId}${lower}` : lower.substring(2);
  const hash = keccak256(stringToBytes(hexAddress), "bytes");
  const address = (chainId ? hexAddress.substring(`${chainId}0x`.length) : hexAddress).split("");
  for (let i = 0; i < 40; i += 2) {
    if (hash[i >> 1] >> 4 >= 8 && address[i]) {
      address[i] = address[i].toUpperCase();
    }
    if ((hash[i >> 1] & 15) >= 8 && address[i + 1]) {
      address[i + 1] = address[i + 1].toUpperCase();
    }
  }
  const result = `0x${address.join("")}`;
  checksumAddressCache.set(cacheKey, result);
  return result;
}
var checksumAddressCache;
var init_getAddress = __esm({
  "node_modules/viem/_esm/utils/address/getAddress.js"() {
    init_toBytes();
    init_keccak256();
    init_lru();
    checksumAddressCache = /* @__PURE__ */ new LruMap(8192);
  }
});

// node_modules/viem/_esm/utils/address/isAddress.js
function isAddress(address, options) {
  const { strict = true } = options ?? {};
  if (!addressRegex.test(address))
    return false;
  if (!strict || address.toLowerCase() === address)
    return true;
  let result = isAddressCache.get(address);
  if (result === void 0) {
    result = checksumAddress(address) === address;
    isAddressCache.set(address, result);
  }
  return result;
}
var addressRegex, isAddressCache;
var init_isAddress = __esm({
  "node_modules/viem/_esm/utils/address/isAddress.js"() {
    init_lru();
    init_getAddress();
    addressRegex = /^0x[a-fA-F0-9]{40}$/;
    isAddressCache = /* @__PURE__ */ new LruMap(8192);
  }
});

// node_modules/viem/_esm/utils/data/slice.js
function slice(value, start, end, { strict } = {}) {
  if (isHex(value, { strict: false }))
    return sliceHex(value, start, end, {
      strict
    });
  return sliceBytes(value, start, end, {
    strict
  });
}
function assertStartOffset(value, start) {
  if (typeof start === "number" && start > 0 && start > size(value) - 1)
    throw new SliceOffsetOutOfBoundsError({
      offset: start,
      position: "start",
      size: size(value)
    });
}
function assertEndOffset(value, start, end) {
  if (typeof start === "number" && typeof end === "number" && size(value) !== end - start) {
    throw new SliceOffsetOutOfBoundsError({
      offset: end,
      position: "end",
      size: size(value)
    });
  }
}
function sliceBytes(value_, start, end, { strict } = {}) {
  assertStartOffset(value_, start);
  const value = value_.slice(start, end);
  if (strict)
    assertEndOffset(value, start, end);
  return value;
}
function sliceHex(value_, start, end, { strict } = {}) {
  assertStartOffset(value_, start);
  const hex = value_.startsWith("0x") ? value_.slice(2) : value_.replace("0x", "");
  const value = `0x${hex.slice((start ?? 0) * 2, (end ?? value_.length) * 2)}`;
  if (strict)
    assertEndOffset(value, start, end);
  return value;
}
var init_slice = __esm({
  "node_modules/viem/_esm/utils/data/slice.js"() {
    init_data();
    init_isHex();
    init_size();
  }
});

// node_modules/viem/_esm/utils/transaction/assertTransaction.js
function assertTransactionEIP7702(transaction) {
  const { authorizationList } = transaction;
  if (authorizationList) {
    for (const authorization of authorizationList) {
      const { chainId } = authorization;
      const address = authorization.address;
      if (!isAddress(address))
        throw new InvalidAddressError({ address });
      if (chainId < 0)
        throw new InvalidChainIdError({ chainId });
    }
  }
  assertTransactionEIP1559(transaction);
}
function assertTransactionEIP4844(transaction) {
  const { blobVersionedHashes } = transaction;
  if (blobVersionedHashes) {
    if (blobVersionedHashes.length === 0)
      throw new EmptyBlobError();
    for (const hash of blobVersionedHashes) {
      const size_ = size(hash);
      const version3 = hexToNumber(slice(hash, 0, 1));
      if (size_ !== 32)
        throw new InvalidVersionedHashSizeError({ hash, size: size_ });
      if (version3 !== versionedHashVersionKzg)
        throw new InvalidVersionedHashVersionError({
          hash,
          version: version3
        });
    }
  }
  assertTransactionEIP1559(transaction);
}
function assertTransactionEIP1559(transaction) {
  const { chainId, maxPriorityFeePerGas, maxFeePerGas, to } = transaction;
  if (chainId <= 0)
    throw new InvalidChainIdError({ chainId });
  if (to && !isAddress(to))
    throw new InvalidAddressError({ address: to });
  if (maxFeePerGas && maxFeePerGas > maxUint256)
    throw new FeeCapTooHighError({ maxFeePerGas });
  if (typeof maxPriorityFeePerGas === "bigint" && typeof maxFeePerGas === "bigint" && maxPriorityFeePerGas > maxFeePerGas)
    throw new TipAboveFeeCapError({ maxFeePerGas, maxPriorityFeePerGas });
}
function assertTransactionEIP2930(transaction) {
  const { chainId, maxPriorityFeePerGas, gasPrice, maxFeePerGas, to } = transaction;
  if (chainId <= 0)
    throw new InvalidChainIdError({ chainId });
  if (to && !isAddress(to))
    throw new InvalidAddressError({ address: to });
  if (maxPriorityFeePerGas || maxFeePerGas)
    throw new BaseError("`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid EIP-2930 Transaction attribute.");
  if (gasPrice && gasPrice > maxUint256)
    throw new FeeCapTooHighError({ maxFeePerGas: gasPrice });
}
function assertTransactionLegacy(transaction) {
  const { chainId, maxPriorityFeePerGas, gasPrice, maxFeePerGas, to } = transaction;
  if (to && !isAddress(to))
    throw new InvalidAddressError({ address: to });
  if (typeof chainId !== "undefined" && chainId <= 0)
    throw new InvalidChainIdError({ chainId });
  if (maxPriorityFeePerGas || maxFeePerGas)
    throw new BaseError("`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid Legacy Transaction attribute.");
  if (gasPrice && gasPrice > maxUint256)
    throw new FeeCapTooHighError({ maxFeePerGas: gasPrice });
}
var init_assertTransaction = __esm({
  "node_modules/viem/_esm/utils/transaction/assertTransaction.js"() {
    init_kzg();
    init_number();
    init_address();
    init_base();
    init_blob2();
    init_chain();
    init_node();
    init_isAddress();
    init_size();
    init_slice();
    init_fromHex();
  }
});

// node_modules/viem/_esm/utils/transaction/getTransactionType.js
function getTransactionType(transaction) {
  if (transaction.type)
    return transaction.type;
  if (typeof transaction.authorizationList !== "undefined")
    return "eip7702";
  if (typeof transaction.blobs !== "undefined" || typeof transaction.blobVersionedHashes !== "undefined" || typeof transaction.maxFeePerBlobGas !== "undefined" || typeof transaction.sidecars !== "undefined")
    return "eip4844";
  if (typeof transaction.maxFeePerGas !== "undefined" || typeof transaction.maxPriorityFeePerGas !== "undefined") {
    return "eip1559";
  }
  if (typeof transaction.gasPrice !== "undefined") {
    if (typeof transaction.accessList !== "undefined")
      return "eip2930";
    return "legacy";
  }
  throw new InvalidSerializableTransactionError({ transaction });
}
var init_getTransactionType = __esm({
  "node_modules/viem/_esm/utils/transaction/getTransactionType.js"() {
    init_transaction2();
  }
});

// node_modules/viem/_esm/utils/transaction/serializeAccessList.js
function serializeAccessList(accessList) {
  if (!accessList || accessList.length === 0)
    return [];
  const serializedAccessList = [];
  for (let i = 0; i < accessList.length; i++) {
    const { address, storageKeys } = accessList[i];
    for (let j = 0; j < storageKeys.length; j++) {
      if (storageKeys[j].length - 2 !== 64) {
        throw new InvalidStorageKeySizeError({ storageKey: storageKeys[j] });
      }
    }
    if (!isAddress(address, { strict: false })) {
      throw new InvalidAddressError({ address });
    }
    serializedAccessList.push([address, storageKeys]);
  }
  return serializedAccessList;
}
var init_serializeAccessList = __esm({
  "node_modules/viem/_esm/utils/transaction/serializeAccessList.js"() {
    init_address();
    init_transaction2();
    init_isAddress();
  }
});

// node_modules/viem/_esm/utils/transaction/serializeTransaction.js
function serializeTransaction(transaction, signature) {
  const type = getTransactionType(transaction);
  if (type === "eip1559")
    return serializeTransactionEIP1559(transaction, signature);
  if (type === "eip2930")
    return serializeTransactionEIP2930(transaction, signature);
  if (type === "eip4844")
    return serializeTransactionEIP4844(transaction, signature);
  if (type === "eip7702")
    return serializeTransactionEIP7702(transaction, signature);
  return serializeTransactionLegacy(transaction, signature);
}
function serializeTransactionEIP7702(transaction, signature) {
  const { authorizationList, chainId, gas, nonce, to, value, maxFeePerGas, maxPriorityFeePerGas, accessList, data } = transaction;
  assertTransactionEIP7702(transaction);
  const serializedAccessList = serializeAccessList(accessList);
  const serializedAuthorizationList = serializeAuthorizationList(authorizationList);
  return concatHex([
    "0x04",
    toRlp([
      numberToHex(chainId),
      nonce ? numberToHex(nonce) : "0x",
      maxPriorityFeePerGas ? numberToHex(maxPriorityFeePerGas) : "0x",
      maxFeePerGas ? numberToHex(maxFeePerGas) : "0x",
      gas ? numberToHex(gas) : "0x",
      to ?? "0x",
      value ? numberToHex(value) : "0x",
      data ?? "0x",
      serializedAccessList,
      serializedAuthorizationList,
      ...toYParitySignatureArray(transaction, signature)
    ])
  ]);
}
function serializeTransactionEIP4844(transaction, signature) {
  const { chainId, gas, nonce, to, value, maxFeePerBlobGas, maxFeePerGas, maxPriorityFeePerGas, accessList, data } = transaction;
  assertTransactionEIP4844(transaction);
  let blobVersionedHashes = transaction.blobVersionedHashes;
  let sidecars = transaction.sidecars;
  if (transaction.blobs && (typeof blobVersionedHashes === "undefined" || typeof sidecars === "undefined")) {
    const blobs2 = typeof transaction.blobs[0] === "string" ? transaction.blobs : transaction.blobs.map((x) => bytesToHex(x));
    const kzg = transaction.kzg;
    const commitments2 = blobsToCommitments({
      blobs: blobs2,
      kzg
    });
    if (typeof blobVersionedHashes === "undefined")
      blobVersionedHashes = commitmentsToVersionedHashes({
        commitments: commitments2
      });
    if (typeof sidecars === "undefined") {
      const proofs2 = blobsToProofs({ blobs: blobs2, commitments: commitments2, kzg });
      sidecars = toBlobSidecars({ blobs: blobs2, commitments: commitments2, proofs: proofs2 });
    }
  }
  const serializedAccessList = serializeAccessList(accessList);
  const serializedTransaction = [
    numberToHex(chainId),
    nonce ? numberToHex(nonce) : "0x",
    maxPriorityFeePerGas ? numberToHex(maxPriorityFeePerGas) : "0x",
    maxFeePerGas ? numberToHex(maxFeePerGas) : "0x",
    gas ? numberToHex(gas) : "0x",
    to ?? "0x",
    value ? numberToHex(value) : "0x",
    data ?? "0x",
    serializedAccessList,
    maxFeePerBlobGas ? numberToHex(maxFeePerBlobGas) : "0x",
    blobVersionedHashes ?? [],
    ...toYParitySignatureArray(transaction, signature)
  ];
  const blobs = [];
  const commitments = [];
  const proofs = [];
  if (sidecars)
    for (let i = 0; i < sidecars.length; i++) {
      const { blob, commitment, proof } = sidecars[i];
      blobs.push(blob);
      commitments.push(commitment);
      proofs.push(proof);
    }
  return concatHex([
    "0x03",
    sidecars ? (
      // If sidecars are enabled, envelope turns into a "wrapper":
      toRlp([serializedTransaction, blobs, commitments, proofs])
    ) : (
      // If sidecars are disabled, standard envelope is used:
      toRlp(serializedTransaction)
    )
  ]);
}
function serializeTransactionEIP1559(transaction, signature) {
  const { chainId, gas, nonce, to, value, maxFeePerGas, maxPriorityFeePerGas, accessList, data } = transaction;
  assertTransactionEIP1559(transaction);
  const serializedAccessList = serializeAccessList(accessList);
  const serializedTransaction = [
    numberToHex(chainId),
    nonce ? numberToHex(nonce) : "0x",
    maxPriorityFeePerGas ? numberToHex(maxPriorityFeePerGas) : "0x",
    maxFeePerGas ? numberToHex(maxFeePerGas) : "0x",
    gas ? numberToHex(gas) : "0x",
    to ?? "0x",
    value ? numberToHex(value) : "0x",
    data ?? "0x",
    serializedAccessList,
    ...toYParitySignatureArray(transaction, signature)
  ];
  return concatHex([
    "0x02",
    toRlp(serializedTransaction)
  ]);
}
function serializeTransactionEIP2930(transaction, signature) {
  const { chainId, gas, data, nonce, to, value, accessList, gasPrice } = transaction;
  assertTransactionEIP2930(transaction);
  const serializedAccessList = serializeAccessList(accessList);
  const serializedTransaction = [
    numberToHex(chainId),
    nonce ? numberToHex(nonce) : "0x",
    gasPrice ? numberToHex(gasPrice) : "0x",
    gas ? numberToHex(gas) : "0x",
    to ?? "0x",
    value ? numberToHex(value) : "0x",
    data ?? "0x",
    serializedAccessList,
    ...toYParitySignatureArray(transaction, signature)
  ];
  return concatHex([
    "0x01",
    toRlp(serializedTransaction)
  ]);
}
function serializeTransactionLegacy(transaction, signature) {
  const { chainId = 0, gas, data, nonce, to, value, gasPrice } = transaction;
  assertTransactionLegacy(transaction);
  let serializedTransaction = [
    nonce ? numberToHex(nonce) : "0x",
    gasPrice ? numberToHex(gasPrice) : "0x",
    gas ? numberToHex(gas) : "0x",
    to ?? "0x",
    value ? numberToHex(value) : "0x",
    data ?? "0x"
  ];
  if (signature) {
    const v = (() => {
      if (signature.v >= 35n) {
        const inferredChainId = (signature.v - 35n) / 2n;
        if (inferredChainId > 0)
          return signature.v;
        return 27n + (signature.v === 35n ? 0n : 1n);
      }
      if (chainId > 0)
        return BigInt(chainId * 2) + BigInt(35n + signature.v - 27n);
      const v2 = 27n + (signature.v === 27n ? 0n : 1n);
      if (signature.v !== v2)
        throw new InvalidLegacyVError({ v: signature.v });
      return v2;
    })();
    const r = trim(signature.r);
    const s = trim(signature.s);
    serializedTransaction = [
      ...serializedTransaction,
      numberToHex(v),
      r === "0x00" ? "0x" : r,
      s === "0x00" ? "0x" : s
    ];
  } else if (chainId > 0) {
    serializedTransaction = [
      ...serializedTransaction,
      numberToHex(chainId),
      "0x",
      "0x"
    ];
  }
  return toRlp(serializedTransaction);
}
function toYParitySignatureArray(transaction, signature_) {
  const signature = signature_ ?? transaction;
  const { v, yParity } = signature;
  if (typeof signature.r === "undefined")
    return [];
  if (typeof signature.s === "undefined")
    return [];
  if (typeof v === "undefined" && typeof yParity === "undefined")
    return [];
  const r = trim(signature.r);
  const s = trim(signature.s);
  const yParity_ = (() => {
    if (typeof yParity === "number")
      return yParity ? numberToHex(1) : "0x";
    if (v === 0n)
      return "0x";
    if (v === 1n)
      return numberToHex(1);
    return v === 27n ? "0x" : numberToHex(1);
  })();
  return [yParity_, r === "0x00" ? "0x" : r, s === "0x00" ? "0x" : s];
}
var init_serializeTransaction = __esm({
  "node_modules/viem/_esm/utils/transaction/serializeTransaction.js"() {
    init_transaction2();
    init_serializeAuthorizationList();
    init_blobsToCommitments();
    init_blobsToProofs();
    init_commitmentsToVersionedHashes();
    init_toBlobSidecars();
    init_concat();
    init_trim();
    init_toHex();
    init_toRlp();
    init_assertTransaction();
    init_getTransactionType();
    init_serializeAccessList();
  }
});

// node_modules/viem/_esm/accounts/utils/parseAccount.js
function parseAccount(account) {
  if (typeof account === "string")
    return { address: account, type: "json-rpc" };
  return account;
}
var init_parseAccount = __esm({
  "node_modules/viem/_esm/accounts/utils/parseAccount.js"() {
  }
});

// node_modules/viem/_esm/errors/account.js
var AccountNotFoundError;
var init_account = __esm({
  "node_modules/viem/_esm/errors/account.js"() {
    init_base();
    AccountNotFoundError = class extends BaseError {
      constructor({ docsPath } = {}) {
        super([
          "Could not find an Account to execute with this Action.",
          "Please provide an Account with the `account` argument on the Action, or by supplying an `account` to the Client."
        ].join("\n"), {
          docsPath,
          docsSlug: "account",
          name: "AccountNotFoundError"
        });
      }
    };
  }
});

// node_modules/abitype/dist/esm/version.js
var version2;
var init_version2 = __esm({
  "node_modules/abitype/dist/esm/version.js"() {
    version2 = "1.2.3";
  }
});

// node_modules/abitype/dist/esm/errors.js
var BaseError2;
var init_errors = __esm({
  "node_modules/abitype/dist/esm/errors.js"() {
    init_version2();
    BaseError2 = class _BaseError extends Error {
      constructor(shortMessage, args = {}) {
        const details = args.cause instanceof _BaseError ? args.cause.details : args.cause?.message ? args.cause.message : args.details;
        const docsPath = args.cause instanceof _BaseError ? args.cause.docsPath || args.docsPath : args.docsPath;
        const message = [
          shortMessage || "An error occurred.",
          "",
          ...args.metaMessages ? [...args.metaMessages, ""] : [],
          ...docsPath ? [`Docs: https://abitype.dev${docsPath}`] : [],
          ...details ? [`Details: ${details}`] : [],
          `Version: abitype@${version2}`
        ].join("\n");
        super(message);
        Object.defineProperty(this, "details", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "docsPath", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "metaMessages", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "shortMessage", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "AbiTypeError"
        });
        if (args.cause)
          this.cause = args.cause;
        this.details = details;
        this.docsPath = docsPath;
        this.metaMessages = args.metaMessages;
        this.shortMessage = shortMessage;
      }
    };
  }
});

// node_modules/abitype/dist/esm/regex.js
function execTyped(regex, string) {
  const match = regex.exec(string);
  return match?.groups;
}
var bytesRegex, integerRegex, isTupleRegex;
var init_regex = __esm({
  "node_modules/abitype/dist/esm/regex.js"() {
    bytesRegex = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/;
    integerRegex = /^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/;
    isTupleRegex = /^\(.+?\).*?$/;
  }
});

// node_modules/abitype/dist/esm/human-readable/runtime/signatures.js
function isErrorSignature(signature) {
  return errorSignatureRegex.test(signature);
}
function execErrorSignature(signature) {
  return execTyped(errorSignatureRegex, signature);
}
function isEventSignature(signature) {
  return eventSignatureRegex.test(signature);
}
function execEventSignature(signature) {
  return execTyped(eventSignatureRegex, signature);
}
function isFunctionSignature(signature) {
  return functionSignatureRegex.test(signature);
}
function execFunctionSignature(signature) {
  return execTyped(functionSignatureRegex, signature);
}
function isStructSignature(signature) {
  return structSignatureRegex.test(signature);
}
function execStructSignature(signature) {
  return execTyped(structSignatureRegex, signature);
}
function isConstructorSignature(signature) {
  return constructorSignatureRegex.test(signature);
}
function execConstructorSignature(signature) {
  return execTyped(constructorSignatureRegex, signature);
}
function isFallbackSignature(signature) {
  return fallbackSignatureRegex.test(signature);
}
function execFallbackSignature(signature) {
  return execTyped(fallbackSignatureRegex, signature);
}
function isReceiveSignature(signature) {
  return receiveSignatureRegex.test(signature);
}
var errorSignatureRegex, eventSignatureRegex, functionSignatureRegex, structSignatureRegex, constructorSignatureRegex, fallbackSignatureRegex, receiveSignatureRegex, eventModifiers, functionModifiers;
var init_signatures = __esm({
  "node_modules/abitype/dist/esm/human-readable/runtime/signatures.js"() {
    init_regex();
    errorSignatureRegex = /^error (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
    eventSignatureRegex = /^event (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;
    functionSignatureRegex = /^function (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)(?: (?<scope>external|public{1}))?(?: (?<stateMutability>pure|view|nonpayable|payable{1}))?(?: returns\s?\((?<returns>.*?)\))?$/;
    structSignatureRegex = /^struct (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*) \{(?<properties>.*?)\}$/;
    constructorSignatureRegex = /^constructor\((?<parameters>.*?)\)(?:\s(?<stateMutability>payable{1}))?$/;
    fallbackSignatureRegex = /^fallback\(\) external(?:\s(?<stateMutability>payable{1}))?$/;
    receiveSignatureRegex = /^receive\(\) external payable$/;
    eventModifiers = /* @__PURE__ */ new Set(["indexed"]);
    functionModifiers = /* @__PURE__ */ new Set([
      "calldata",
      "memory",
      "storage"
    ]);
  }
});

// node_modules/abitype/dist/esm/human-readable/errors/abiItem.js
var UnknownTypeError, UnknownSolidityTypeError;
var init_abiItem = __esm({
  "node_modules/abitype/dist/esm/human-readable/errors/abiItem.js"() {
    init_errors();
    UnknownTypeError = class extends BaseError2 {
      constructor({ type }) {
        super("Unknown type.", {
          metaMessages: [
            `Type "${type}" is not a valid ABI type. Perhaps you forgot to include a struct signature?`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "UnknownTypeError"
        });
      }
    };
    UnknownSolidityTypeError = class extends BaseError2 {
      constructor({ type }) {
        super("Unknown type.", {
          metaMessages: [`Type "${type}" is not a valid ABI type.`]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "UnknownSolidityTypeError"
        });
      }
    };
  }
});

// node_modules/abitype/dist/esm/human-readable/errors/abiParameter.js
var InvalidParameterError, SolidityProtectedKeywordError, InvalidModifierError, InvalidFunctionModifierError, InvalidAbiTypeParameterError;
var init_abiParameter = __esm({
  "node_modules/abitype/dist/esm/human-readable/errors/abiParameter.js"() {
    init_errors();
    InvalidParameterError = class extends BaseError2 {
      constructor({ param }) {
        super("Invalid ABI parameter.", {
          details: param
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidParameterError"
        });
      }
    };
    SolidityProtectedKeywordError = class extends BaseError2 {
      constructor({ param, name }) {
        super("Invalid ABI parameter.", {
          details: param,
          metaMessages: [
            `"${name}" is a protected Solidity keyword. More info: https://docs.soliditylang.org/en/latest/cheatsheet.html`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "SolidityProtectedKeywordError"
        });
      }
    };
    InvalidModifierError = class extends BaseError2 {
      constructor({ param, type, modifier }) {
        super("Invalid ABI parameter.", {
          details: param,
          metaMessages: [
            `Modifier "${modifier}" not allowed${type ? ` in "${type}" type` : ""}.`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidModifierError"
        });
      }
    };
    InvalidFunctionModifierError = class extends BaseError2 {
      constructor({ param, type, modifier }) {
        super("Invalid ABI parameter.", {
          details: param,
          metaMessages: [
            `Modifier "${modifier}" not allowed${type ? ` in "${type}" type` : ""}.`,
            `Data location can only be specified for array, struct, or mapping types, but "${modifier}" was given.`
          ]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidFunctionModifierError"
        });
      }
    };
    InvalidAbiTypeParameterError = class extends BaseError2 {
      constructor({ abiParameter }) {
        super("Invalid ABI parameter.", {
          details: JSON.stringify(abiParameter, null, 2),
          metaMessages: ["ABI parameter type is invalid."]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidAbiTypeParameterError"
        });
      }
    };
  }
});

// node_modules/abitype/dist/esm/human-readable/errors/signature.js
var InvalidSignatureError, UnknownSignatureError, InvalidStructSignatureError;
var init_signature = __esm({
  "node_modules/abitype/dist/esm/human-readable/errors/signature.js"() {
    init_errors();
    InvalidSignatureError = class extends BaseError2 {
      constructor({ signature, type }) {
        super(`Invalid ${type} signature.`, {
          details: signature
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidSignatureError"
        });
      }
    };
    UnknownSignatureError = class extends BaseError2 {
      constructor({ signature }) {
        super("Unknown signature.", {
          details: signature
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "UnknownSignatureError"
        });
      }
    };
    InvalidStructSignatureError = class extends BaseError2 {
      constructor({ signature }) {
        super("Invalid struct signature.", {
          details: signature,
          metaMessages: ["No properties exist."]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidStructSignatureError"
        });
      }
    };
  }
});

// node_modules/abitype/dist/esm/human-readable/errors/struct.js
var CircularReferenceError;
var init_struct = __esm({
  "node_modules/abitype/dist/esm/human-readable/errors/struct.js"() {
    init_errors();
    CircularReferenceError = class extends BaseError2 {
      constructor({ type }) {
        super("Circular reference detected.", {
          metaMessages: [`Struct "${type}" is a circular reference.`]
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "CircularReferenceError"
        });
      }
    };
  }
});

// node_modules/abitype/dist/esm/human-readable/errors/splitParameters.js
var InvalidParenthesisError;
var init_splitParameters = __esm({
  "node_modules/abitype/dist/esm/human-readable/errors/splitParameters.js"() {
    init_errors();
    InvalidParenthesisError = class extends BaseError2 {
      constructor({ current, depth }) {
        super("Unbalanced parentheses.", {
          metaMessages: [
            `"${current.trim()}" has too many ${depth > 0 ? "opening" : "closing"} parentheses.`
          ],
          details: `Depth "${depth}"`
        });
        Object.defineProperty(this, "name", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: "InvalidParenthesisError"
        });
      }
    };
  }
});

// node_modules/abitype/dist/esm/human-readable/runtime/cache.js
function getParameterCacheKey(param, type, structs) {
  let structKey = "";
  if (structs)
    for (const struct of Object.entries(structs)) {
      if (!struct)
        continue;
      let propertyKey = "";
      for (const property of struct[1]) {
        propertyKey += `[${property.type}${property.name ? `:${property.name}` : ""}]`;
      }
      structKey += `(${struct[0]}{${propertyKey}})`;
    }
  if (type)
    return `${type}:${param}${structKey}`;
  return `${param}${structKey}`;
}
var parameterCache;
var init_cache = __esm({
  "node_modules/abitype/dist/esm/human-readable/runtime/cache.js"() {
    parameterCache = /* @__PURE__ */ new Map([
      // Unnamed
      ["address", { type: "address" }],
      ["bool", { type: "bool" }],
      ["bytes", { type: "bytes" }],
      ["bytes32", { type: "bytes32" }],
      ["int", { type: "int256" }],
      ["int256", { type: "int256" }],
      ["string", { type: "string" }],
      ["uint", { type: "uint256" }],
      ["uint8", { type: "uint8" }],
      ["uint16", { type: "uint16" }],
      ["uint24", { type: "uint24" }],
      ["uint32", { type: "uint32" }],
      ["uint64", { type: "uint64" }],
      ["uint96", { type: "uint96" }],
      ["uint112", { type: "uint112" }],
      ["uint160", { type: "uint160" }],
      ["uint192", { type: "uint192" }],
      ["uint256", { type: "uint256" }],
      // Named
      ["address owner", { type: "address", name: "owner" }],
      ["address to", { type: "address", name: "to" }],
      ["bool approved", { type: "bool", name: "approved" }],
      ["bytes _data", { type: "bytes", name: "_data" }],
      ["bytes data", { type: "bytes", name: "data" }],
      ["bytes signature", { type: "bytes", name: "signature" }],
      ["bytes32 hash", { type: "bytes32", name: "hash" }],
      ["bytes32 r", { type: "bytes32", name: "r" }],
      ["bytes32 root", { type: "bytes32", name: "root" }],
      ["bytes32 s", { type: "bytes32", name: "s" }],
      ["string name", { type: "string", name: "name" }],
      ["string symbol", { type: "string", name: "symbol" }],
      ["string tokenURI", { type: "string", name: "tokenURI" }],
      ["uint tokenId", { type: "uint256", name: "tokenId" }],
      ["uint8 v", { type: "uint8", name: "v" }],
      ["uint256 balance", { type: "uint256", name: "balance" }],
      ["uint256 tokenId", { type: "uint256", name: "tokenId" }],
      ["uint256 value", { type: "uint256", name: "value" }],
      // Indexed
      [
        "event:address indexed from",
        { type: "address", name: "from", indexed: true }
      ],
      ["event:address indexed to", { type: "address", name: "to", indexed: true }],
      [
        "event:uint indexed tokenId",
        { type: "uint256", name: "tokenId", indexed: true }
      ],
      [
        "event:uint256 indexed tokenId",
        { type: "uint256", name: "tokenId", indexed: true }
      ]
    ]);
  }
});

// node_modules/abitype/dist/esm/human-readable/runtime/utils.js
function parseSignature(signature, structs = {}) {
  if (isFunctionSignature(signature))
    return parseFunctionSignature(signature, structs);
  if (isEventSignature(signature))
    return parseEventSignature(signature, structs);
  if (isErrorSignature(signature))
    return parseErrorSignature(signature, structs);
  if (isConstructorSignature(signature))
    return parseConstructorSignature(signature, structs);
  if (isFallbackSignature(signature))
    return parseFallbackSignature(signature);
  if (isReceiveSignature(signature))
    return {
      type: "receive",
      stateMutability: "payable"
    };
  throw new UnknownSignatureError({ signature });
}
function parseFunctionSignature(signature, structs = {}) {
  const match = execFunctionSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "function" });
  const inputParams = splitParameters(match.parameters);
  const inputs = [];
  const inputLength = inputParams.length;
  for (let i = 0; i < inputLength; i++) {
    inputs.push(parseAbiParameter(inputParams[i], {
      modifiers: functionModifiers,
      structs,
      type: "function"
    }));
  }
  const outputs = [];
  if (match.returns) {
    const outputParams = splitParameters(match.returns);
    const outputLength = outputParams.length;
    for (let i = 0; i < outputLength; i++) {
      outputs.push(parseAbiParameter(outputParams[i], {
        modifiers: functionModifiers,
        structs,
        type: "function"
      }));
    }
  }
  return {
    name: match.name,
    type: "function",
    stateMutability: match.stateMutability ?? "nonpayable",
    inputs,
    outputs
  };
}
function parseEventSignature(signature, structs = {}) {
  const match = execEventSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "event" });
  const params = splitParameters(match.parameters);
  const abiParameters = [];
  const length = params.length;
  for (let i = 0; i < length; i++)
    abiParameters.push(parseAbiParameter(params[i], {
      modifiers: eventModifiers,
      structs,
      type: "event"
    }));
  return { name: match.name, type: "event", inputs: abiParameters };
}
function parseErrorSignature(signature, structs = {}) {
  const match = execErrorSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "error" });
  const params = splitParameters(match.parameters);
  const abiParameters = [];
  const length = params.length;
  for (let i = 0; i < length; i++)
    abiParameters.push(parseAbiParameter(params[i], { structs, type: "error" }));
  return { name: match.name, type: "error", inputs: abiParameters };
}
function parseConstructorSignature(signature, structs = {}) {
  const match = execConstructorSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "constructor" });
  const params = splitParameters(match.parameters);
  const abiParameters = [];
  const length = params.length;
  for (let i = 0; i < length; i++)
    abiParameters.push(parseAbiParameter(params[i], { structs, type: "constructor" }));
  return {
    type: "constructor",
    stateMutability: match.stateMutability ?? "nonpayable",
    inputs: abiParameters
  };
}
function parseFallbackSignature(signature) {
  const match = execFallbackSignature(signature);
  if (!match)
    throw new InvalidSignatureError({ signature, type: "fallback" });
  return {
    type: "fallback",
    stateMutability: match.stateMutability ?? "nonpayable"
  };
}
function parseAbiParameter(param, options) {
  const parameterCacheKey = getParameterCacheKey(param, options?.type, options?.structs);
  if (parameterCache.has(parameterCacheKey))
    return parameterCache.get(parameterCacheKey);
  const isTuple = isTupleRegex.test(param);
  const match = execTyped(isTuple ? abiParameterWithTupleRegex : abiParameterWithoutTupleRegex, param);
  if (!match)
    throw new InvalidParameterError({ param });
  if (match.name && isSolidityKeyword(match.name))
    throw new SolidityProtectedKeywordError({ param, name: match.name });
  const name = match.name ? { name: match.name } : {};
  const indexed = match.modifier === "indexed" ? { indexed: true } : {};
  const structs = options?.structs ?? {};
  let type;
  let components = {};
  if (isTuple) {
    type = "tuple";
    const params = splitParameters(match.type);
    const components_ = [];
    const length = params.length;
    for (let i = 0; i < length; i++) {
      components_.push(parseAbiParameter(params[i], { structs }));
    }
    components = { components: components_ };
  } else if (match.type in structs) {
    type = "tuple";
    components = { components: structs[match.type] };
  } else if (dynamicIntegerRegex.test(match.type)) {
    type = `${match.type}256`;
  } else if (match.type === "address payable") {
    type = "address";
  } else {
    type = match.type;
    if (!(options?.type === "struct") && !isSolidityType(type))
      throw new UnknownSolidityTypeError({ type });
  }
  if (match.modifier) {
    if (!options?.modifiers?.has?.(match.modifier))
      throw new InvalidModifierError({
        param,
        type: options?.type,
        modifier: match.modifier
      });
    if (functionModifiers.has(match.modifier) && !isValidDataLocation(type, !!match.array))
      throw new InvalidFunctionModifierError({
        param,
        type: options?.type,
        modifier: match.modifier
      });
  }
  const abiParameter = {
    type: `${type}${match.array ?? ""}`,
    ...name,
    ...indexed,
    ...components
  };
  parameterCache.set(parameterCacheKey, abiParameter);
  return abiParameter;
}
function splitParameters(params, result = [], current = "", depth = 0) {
  const length = params.trim().length;
  for (let i = 0; i < length; i++) {
    const char = params[i];
    const tail = params.slice(i + 1);
    switch (char) {
      case ",":
        return depth === 0 ? splitParameters(tail, [...result, current.trim()]) : splitParameters(tail, result, `${current}${char}`, depth);
      case "(":
        return splitParameters(tail, result, `${current}${char}`, depth + 1);
      case ")":
        return splitParameters(tail, result, `${current}${char}`, depth - 1);
      default:
        return splitParameters(tail, result, `${current}${char}`, depth);
    }
  }
  if (current === "")
    return result;
  if (depth !== 0)
    throw new InvalidParenthesisError({ current, depth });
  result.push(current.trim());
  return result;
}
function isSolidityType(type) {
  return type === "address" || type === "bool" || type === "function" || type === "string" || bytesRegex.test(type) || integerRegex.test(type);
}
function isSolidityKeyword(name) {
  return name === "address" || name === "bool" || name === "function" || name === "string" || name === "tuple" || bytesRegex.test(name) || integerRegex.test(name) || protectedKeywordsRegex.test(name);
}
function isValidDataLocation(type, isArray) {
  return isArray || type === "bytes" || type === "string" || type === "tuple";
}
var abiParameterWithoutTupleRegex, abiParameterWithTupleRegex, dynamicIntegerRegex, protectedKeywordsRegex;
var init_utils2 = __esm({
  "node_modules/abitype/dist/esm/human-readable/runtime/utils.js"() {
    init_regex();
    init_abiItem();
    init_abiParameter();
    init_signature();
    init_splitParameters();
    init_cache();
    init_signatures();
    abiParameterWithoutTupleRegex = /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*(?:\spayable)?)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/;
    abiParameterWithTupleRegex = /^\((?<type>.+?)\)(?<array>(?:\[\d*?\])+?)?(?:\s(?<modifier>calldata|indexed|memory|storage{1}))?(?:\s(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*))?$/;
    dynamicIntegerRegex = /^u?int$/;
    protectedKeywordsRegex = /^(?:after|alias|anonymous|apply|auto|byte|calldata|case|catch|constant|copyof|default|defined|error|event|external|false|final|function|immutable|implements|in|indexed|inline|internal|let|mapping|match|memory|mutable|null|of|override|partial|private|promise|public|pure|reference|relocatable|return|returns|sizeof|static|storage|struct|super|supports|switch|this|true|try|typedef|typeof|var|view|virtual)$/;
  }
});

// node_modules/abitype/dist/esm/human-readable/runtime/structs.js
function parseStructs(signatures) {
  const shallowStructs = {};
  const signaturesLength = signatures.length;
  for (let i = 0; i < signaturesLength; i++) {
    const signature = signatures[i];
    if (!isStructSignature(signature))
      continue;
    const match = execStructSignature(signature);
    if (!match)
      throw new InvalidSignatureError({ signature, type: "struct" });
    const properties = match.properties.split(";");
    const components = [];
    const propertiesLength = properties.length;
    for (let k = 0; k < propertiesLength; k++) {
      const property = properties[k];
      const trimmed = property.trim();
      if (!trimmed)
        continue;
      const abiParameter = parseAbiParameter(trimmed, {
        type: "struct"
      });
      components.push(abiParameter);
    }
    if (!components.length)
      throw new InvalidStructSignatureError({ signature });
    shallowStructs[match.name] = components;
  }
  const resolvedStructs = {};
  const entries = Object.entries(shallowStructs);
  const entriesLength = entries.length;
  for (let i = 0; i < entriesLength; i++) {
    const [name, parameters] = entries[i];
    resolvedStructs[name] = resolveStructs(parameters, shallowStructs);
  }
  return resolvedStructs;
}
function resolveStructs(abiParameters = [], structs = {}, ancestors = /* @__PURE__ */ new Set()) {
  const components = [];
  const length = abiParameters.length;
  for (let i = 0; i < length; i++) {
    const abiParameter = abiParameters[i];
    const isTuple = isTupleRegex.test(abiParameter.type);
    if (isTuple)
      components.push(abiParameter);
    else {
      const match = execTyped(typeWithoutTupleRegex, abiParameter.type);
      if (!match?.type)
        throw new InvalidAbiTypeParameterError({ abiParameter });
      const { array, type } = match;
      if (type in structs) {
        if (ancestors.has(type))
          throw new CircularReferenceError({ type });
        components.push({
          ...abiParameter,
          type: `tuple${array ?? ""}`,
          components: resolveStructs(structs[type], structs, /* @__PURE__ */ new Set([...ancestors, type]))
        });
      } else {
        if (isSolidityType(type))
          components.push(abiParameter);
        else
          throw new UnknownTypeError({ type });
      }
    }
  }
  return components;
}
var typeWithoutTupleRegex;
var init_structs = __esm({
  "node_modules/abitype/dist/esm/human-readable/runtime/structs.js"() {
    init_regex();
    init_abiItem();
    init_abiParameter();
    init_signature();
    init_struct();
    init_signatures();
    init_utils2();
    typeWithoutTupleRegex = /^(?<type>[a-zA-Z$_][a-zA-Z0-9$_]*)(?<array>(?:\[\d*?\])+?)?$/;
  }
});

// node_modules/abitype/dist/esm/human-readable/parseAbi.js
function parseAbi(signatures) {
  const structs = parseStructs(signatures);
  const abi = [];
  const length = signatures.length;
  for (let i = 0; i < length; i++) {
    const signature = signatures[i];
    if (isStructSignature(signature))
      continue;
    abi.push(parseSignature(signature, structs));
  }
  return abi;
}
var init_parseAbi = __esm({
  "node_modules/abitype/dist/esm/human-readable/parseAbi.js"() {
    init_signatures();
    init_structs();
    init_utils2();
  }
});

// node_modules/abitype/dist/esm/exports/index.js
var init_exports = __esm({
  "node_modules/abitype/dist/esm/exports/index.js"() {
    init_parseAbi();
  }
});

// node_modules/viem/_esm/errors/stateOverride.js
function prettyStateMapping(stateMapping) {
  return stateMapping.reduce((pretty, { slot, value }) => {
    return `${pretty}        ${slot}: ${value}
`;
  }, "");
}
function prettyStateOverride(stateOverride) {
  return stateOverride.reduce((pretty, { address, ...state }) => {
    let val = `${pretty}    ${address}:
`;
    if (state.nonce)
      val += `      nonce: ${state.nonce}
`;
    if (state.balance)
      val += `      balance: ${state.balance}
`;
    if (state.code)
      val += `      code: ${state.code}
`;
    if (state.state) {
      val += "      state:\n";
      val += prettyStateMapping(state.state);
    }
    if (state.stateDiff) {
      val += "      stateDiff:\n";
      val += prettyStateMapping(state.stateDiff);
    }
    return val;
  }, "  State Override:\n").slice(0, -1);
}
var AccountStateConflictError, StateAssignmentConflictError;
var init_stateOverride = __esm({
  "node_modules/viem/_esm/errors/stateOverride.js"() {
    init_base();
    AccountStateConflictError = class extends BaseError {
      constructor({ address }) {
        super(`State for account "${address}" is set multiple times.`, {
          name: "AccountStateConflictError"
        });
      }
    };
    StateAssignmentConflictError = class extends BaseError {
      constructor() {
        super("state and stateDiff are set on the same account.", {
          name: "StateAssignmentConflictError"
        });
      }
    };
  }
});

// node_modules/viem/_esm/errors/contract.js
var CallExecutionError;
var init_contract = __esm({
  "node_modules/viem/_esm/errors/contract.js"() {
    init_parseAccount();
    init_formatEther();
    init_formatGwei();
    init_base();
    init_stateOverride();
    init_transaction2();
    CallExecutionError = class extends BaseError {
      constructor(cause, { account: account_, docsPath, chain, data, gas, gasPrice, maxFeePerGas, maxPriorityFeePerGas, nonce, to, value, stateOverride }) {
        const account = account_ ? parseAccount(account_) : void 0;
        let prettyArgs = prettyPrint({
          from: account?.address,
          to,
          value: typeof value !== "undefined" && `${formatEther2(value)} ${chain?.nativeCurrency?.symbol || "ETH"}`,
          data,
          gas,
          gasPrice: typeof gasPrice !== "undefined" && `${formatGwei2(gasPrice)} gwei`,
          maxFeePerGas: typeof maxFeePerGas !== "undefined" && `${formatGwei2(maxFeePerGas)} gwei`,
          maxPriorityFeePerGas: typeof maxPriorityFeePerGas !== "undefined" && `${formatGwei2(maxPriorityFeePerGas)} gwei`,
          nonce
        });
        if (stateOverride) {
          prettyArgs += `
${prettyStateOverride(stateOverride)}`;
        }
        super(cause.shortMessage, {
          cause,
          docsPath,
          metaMessages: [
            ...cause.metaMessages ? [...cause.metaMessages, " "] : [],
            "Raw Call Arguments:",
            prettyArgs
          ].filter(Boolean),
          name: "CallExecutionError"
        });
        Object.defineProperty(this, "cause", {
          enumerable: true,
          configurable: true,
          writable: true,
          value: void 0
        });
        this.cause = cause;
      }
    };
  }
});

// node_modules/viem/_esm/utils/errors/getNodeError.js
function getNodeError(err, args) {
  const message = (err.details || "").toLowerCase();
  const executionRevertedError = err instanceof BaseError ? err.walk((e) => e?.code === ExecutionRevertedError.code) : err;
  if (executionRevertedError instanceof BaseError)
    return new ExecutionRevertedError({
      cause: err,
      message: executionRevertedError.details
    });
  if (ExecutionRevertedError.nodeMessage.test(message))
    return new ExecutionRevertedError({
      cause: err,
      message: err.details
    });
  if (FeeCapTooHighError.nodeMessage.test(message))
    return new FeeCapTooHighError({
      cause: err,
      maxFeePerGas: args?.maxFeePerGas
    });
  if (FeeCapTooLowError.nodeMessage.test(message))
    return new FeeCapTooLowError({
      cause: err,
      maxFeePerGas: args?.maxFeePerGas
    });
  if (NonceTooHighError.nodeMessage.test(message))
    return new NonceTooHighError({ cause: err, nonce: args?.nonce });
  if (NonceTooLowError.nodeMessage.test(message))
    return new NonceTooLowError({ cause: err, nonce: args?.nonce });
  if (NonceMaxValueError.nodeMessage.test(message))
    return new NonceMaxValueError({ cause: err, nonce: args?.nonce });
  if (InsufficientFundsError.nodeMessage.test(message))
    return new InsufficientFundsError({ cause: err });
  if (IntrinsicGasTooHighError.nodeMessage.test(message))
    return new IntrinsicGasTooHighError({ cause: err, gas: args?.gas });
  if (IntrinsicGasTooLowError.nodeMessage.test(message))
    return new IntrinsicGasTooLowError({ cause: err, gas: args?.gas });
  if (TransactionTypeNotSupportedError.nodeMessage.test(message))
    return new TransactionTypeNotSupportedError({ cause: err });
  if (TipAboveFeeCapError.nodeMessage.test(message))
    return new TipAboveFeeCapError({
      cause: err,
      maxFeePerGas: args?.maxFeePerGas,
      maxPriorityFeePerGas: args?.maxPriorityFeePerGas
    });
  return new UnknownNodeError({
    cause: err
  });
}
var init_getNodeError = __esm({
  "node_modules/viem/_esm/utils/errors/getNodeError.js"() {
    init_base();
    init_node();
  }
});

// node_modules/viem/_esm/utils/errors/getCallError.js
function getCallError(err, { docsPath, ...args }) {
  const cause = (() => {
    const cause2 = getNodeError(err, args);
    if (cause2 instanceof UnknownNodeError)
      return err;
    return cause2;
  })();
  return new CallExecutionError(cause, {
    docsPath,
    ...args
  });
}
var init_getCallError = __esm({
  "node_modules/viem/_esm/utils/errors/getCallError.js"() {
    init_contract();
    init_node();
    init_getNodeError();
  }
});

// node_modules/viem/_esm/utils/formatters/extract.js
function extract(value_, { format: format2 }) {
  if (!format2)
    return {};
  const value = {};
  function extract_(formatted2) {
    const keys = Object.keys(formatted2);
    for (const key of keys) {
      if (key in value_)
        value[key] = value_[key];
      if (formatted2[key] && typeof formatted2[key] === "object" && !Array.isArray(formatted2[key]))
        extract_(formatted2[key]);
    }
  }
  const formatted = format2(value_ || {});
  extract_(formatted);
  return value;
}
var init_extract = __esm({
  "node_modules/viem/_esm/utils/formatters/extract.js"() {
  }
});

// node_modules/viem/_esm/utils/stateOverride.js
function serializeStateMapping(stateMapping) {
  if (!stateMapping || stateMapping.length === 0)
    return void 0;
  return stateMapping.reduce((acc, { slot, value }) => {
    if (slot.length !== 66)
      throw new InvalidBytesLengthError({
        size: slot.length,
        targetSize: 66,
        type: "hex"
      });
    if (value.length !== 66)
      throw new InvalidBytesLengthError({
        size: value.length,
        targetSize: 66,
        type: "hex"
      });
    acc[slot] = value;
    return acc;
  }, {});
}
function serializeAccountStateOverride(parameters) {
  const { balance, nonce, state, stateDiff, code } = parameters;
  const rpcAccountStateOverride = {};
  if (code !== void 0)
    rpcAccountStateOverride.code = code;
  if (balance !== void 0)
    rpcAccountStateOverride.balance = numberToHex(balance);
  if (nonce !== void 0)
    rpcAccountStateOverride.nonce = numberToHex(nonce);
  if (state !== void 0)
    rpcAccountStateOverride.state = serializeStateMapping(state);
  if (stateDiff !== void 0) {
    if (rpcAccountStateOverride.state)
      throw new StateAssignmentConflictError();
    rpcAccountStateOverride.stateDiff = serializeStateMapping(stateDiff);
  }
  return rpcAccountStateOverride;
}
function serializeStateOverride(parameters) {
  if (!parameters)
    return void 0;
  const rpcStateOverride = {};
  const addresses = /* @__PURE__ */ new Set();
  for (const { address, ...accountState } of parameters) {
    if (!isAddress(address, { strict: false }))
      throw new InvalidAddressError({ address });
    const key = address.toLowerCase();
    if (addresses.has(key))
      throw new AccountStateConflictError({ address });
    addresses.add(key);
    rpcStateOverride[address] = serializeAccountStateOverride(accountState);
  }
  return rpcStateOverride;
}
var init_stateOverride2 = __esm({
  "node_modules/viem/_esm/utils/stateOverride.js"() {
    init_address();
    init_data();
    init_stateOverride();
    init_isAddress();
    init_toHex();
  }
});

// node_modules/viem/_esm/utils/transaction/assertRequest.js
function assertRequest(args) {
  const { account: account_, maxFeePerGas, maxPriorityFeePerGas, to } = args;
  const account = account_ ? parseAccount(account_) : void 0;
  if (account && !isAddress(account.address))
    throw new InvalidAddressError({ address: account.address });
  if (to && !isAddress(to))
    throw new InvalidAddressError({ address: to });
  if (maxFeePerGas && maxFeePerGas > maxUint256)
    throw new FeeCapTooHighError({ maxFeePerGas });
  if (typeof maxPriorityFeePerGas === "bigint" && typeof maxFeePerGas === "bigint" && maxPriorityFeePerGas > maxFeePerGas)
    throw new TipAboveFeeCapError({ maxFeePerGas, maxPriorityFeePerGas });
}
var init_assertRequest = __esm({
  "node_modules/viem/_esm/utils/transaction/assertRequest.js"() {
    init_parseAccount();
    init_number();
    init_address();
    init_node();
    init_isAddress();
  }
});

// node_modules/viem/_esm/op-stack/contracts.js
var contracts = {
  gasPriceOracle: { address: "0x420000000000000000000000000000000000000F" },
  l1Block: { address: "0x4200000000000000000000000000000000000015" },
  l2CrossDomainMessenger: {
    address: "0x4200000000000000000000000000000000000007"
  },
  l2Erc721Bridge: { address: "0x4200000000000000000000000000000000000014" },
  l2StandardBridge: { address: "0x4200000000000000000000000000000000000010" },
  l2ToL1MessagePasser: {
    address: "0x4200000000000000000000000000000000000016"
  }
};

// node_modules/viem/_esm/op-stack/formatters.js
init_fromHex();
init_block();
init_transaction();
init_transactionReceipt();
var block = {
  exclude: void 0,
  format: (args, action) => {
    const transactions = Array.isArray(args.transactions) ? args.transactions.map((transaction) => typeof transaction === "string" ? transaction : formatTransaction(transaction)) : void 0;
    const base = formatBlock(transactions ? { ...args, transactions: [] } : args, action);
    for (let i = 0; transactions && i < transactions.length; i++) {
      const formatted = transactions[i];
      const transaction = args.transactions[i];
      if (typeof formatted === "string" || formatted.typeHex !== "0x7e")
        continue;
      formatted.isSystemTx = transaction.isSystemTx;
      formatted.mint = transaction.mint ? hexToBigInt(transaction.mint) : void 0;
      formatted.sourceHash = transaction.sourceHash;
      formatted.type = "deposit";
    }
    return {
      ...base,
      transactions,
      stateRoot: args.stateRoot
    };
  },
  type: "block"
};
var formatters = {
  block,
  transaction: /* @__PURE__ */ defineTransaction({
    format(args) {
      const transaction = {};
      if (args.type === "0x7e") {
        transaction.isSystemTx = args.isSystemTx;
        transaction.mint = args.mint ? hexToBigInt(args.mint) : void 0;
        transaction.sourceHash = args.sourceHash;
        transaction.type = "deposit";
      }
      return transaction;
    }
  }),
  transactionReceipt: /* @__PURE__ */ defineTransactionReceipt({
    format(args) {
      return {
        ...args.depositNonce ? { depositNonce: hexToBigInt(args.depositNonce) } : {},
        ...args.depositReceiptVersion ? { depositReceiptVersion: hexToNumber(args.depositReceiptVersion) } : {},
        ...args.opGasRefund !== void 0 ? {
          opGasRefund: args.opGasRefund === null ? null : hexToBigInt(args.opGasRefund)
        } : {},
        l1GasPrice: args.l1GasPrice ? hexToBigInt(args.l1GasPrice) : null,
        l1GasUsed: args.l1GasUsed ? hexToBigInt(args.l1GasUsed) : null,
        l1Fee: args.l1Fee ? hexToBigInt(args.l1Fee) : null,
        l1FeeScalar: args.l1FeeScalar ? Number(args.l1FeeScalar) : null
      };
    }
  })
};

// node_modules/viem/_esm/op-stack/serializers.js
init_address();
init_isAddress();
init_concat();
init_toHex();
init_toRlp();
init_serializeTransaction();
function serializeTransaction2(transaction, signature) {
  if (isDeposit(transaction))
    return serializeTransactionDeposit(transaction);
  return serializeTransaction(transaction, signature);
}
var serializers = {
  transaction: serializeTransaction2
};
function serializeTransactionDeposit(transaction) {
  assertTransactionDeposit(transaction);
  const { sourceHash, data, from, gas, isSystemTx, mint, to, value } = transaction;
  const serializedTransaction = [
    sourceHash,
    from,
    to ?? "0x",
    mint ? toHex(mint) : "0x",
    value ? toHex(value) : "0x",
    gas ? toHex(gas) : "0x",
    isSystemTx ? "0x1" : "0x",
    data ?? "0x"
  ];
  return concatHex([
    "0x7e",
    toRlp(serializedTransaction)
  ]);
}
function isDeposit(transaction) {
  if (transaction.type === "deposit")
    return true;
  if (typeof transaction.sourceHash !== "undefined")
    return true;
  return false;
}
function assertTransactionDeposit(transaction) {
  const { from, to } = transaction;
  if (from && !isAddress(from))
    throw new InvalidAddressError({ address: from });
  if (to && !isAddress(to))
    throw new InvalidAddressError({ address: to });
}

// node_modules/viem/_esm/op-stack/chainConfig.js
var chainConfig = {
  blockTime: 2e3,
  contracts,
  formatters,
  serializers
};

// node_modules/viem/_esm/chains/definitions/arbitrumSepolia.js
init_defineChain();
var arbitrumSepolia = /* @__PURE__ */ defineChain({
  id: 421614,
  name: "Arbitrum Sepolia",
  blockTime: 250,
  nativeCurrency: {
    name: "Arbitrum Sepolia Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia-rollup.arbitrum.io/rpc"]
    }
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://sepolia.arbiscan.io",
      apiUrl: "https://api-sepolia.arbiscan.io/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 81930
    }
  },
  testnet: true
});

// node_modules/viem/_esm/chains/definitions/arcTestnet.js
init_defineChain();
var arcTestnet = /* @__PURE__ */ defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [
        "https://rpc.testnet.arc.io",
        "https://rpc.blockdaemon.testnet.arc.io",
        "https://rpc.drpc.testnet.arc.io",
        "https://rpc.quicknode.testnet.arc.io"
      ],
      webSocket: [
        "wss://rpc.testnet.arc.io",
        "wss://rpc.blockdaemon.testnet.arc.io:443/websocket",
        "wss://rpc.drpc.testnet.arc.io",
        "wss://rpc.quicknode.testnet.arc.io"
      ]
    }
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: "https://explorer.testnet.arc.io",
      apiUrl: "https://explorer.testnet.arc.io/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0
    }
  },
  testnet: true
});

// node_modules/viem/_esm/chains/definitions/avalancheFuji.js
init_defineChain();
var avalancheFuji = /* @__PURE__ */ defineChain({
  id: 43113,
  name: "Avalanche Fuji",
  nativeCurrency: {
    decimals: 18,
    name: "Avalanche Fuji",
    symbol: "AVAX"
  },
  rpcUrls: {
    default: { http: ["https://api.avax-test.network/ext/bc/C/rpc"] }
  },
  blockExplorers: {
    default: {
      name: "SnowTrace",
      url: "https://testnet.snowtrace.io",
      apiUrl: "https://api-testnet.snowtrace.io"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 7096959
    }
  },
  testnet: true
});

// node_modules/viem/_esm/chains/definitions/baseSepolia.js
init_defineChain();
var sourceId = 11155111;
var baseSepolia = /* @__PURE__ */ defineChain({
  ...chainConfig,
  id: 84532,
  network: "base-sepolia",
  name: "Base Sepolia",
  blockTime: 200,
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://sepolia.base.org"]
    }
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://sepolia.basescan.org",
      apiUrl: "https://api-sepolia.basescan.org/api"
    }
  },
  contracts: {
    ...chainConfig.contracts,
    disputeGameFactory: {
      [sourceId]: {
        address: "0xd6E6dBf4F7EA0ac412fD8b65ED297e64BB7a06E1"
      }
    },
    l2OutputOracle: {
      [sourceId]: {
        address: "0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254"
      }
    },
    portal: {
      [sourceId]: {
        address: "0x49f53e41452c74589e85ca1677426ba426459e85",
        blockCreated: 4446677
      }
    },
    l1StandardBridge: {
      [sourceId]: {
        address: "0xfd0Bf71F60660E2f608ed56e1659C450eB113120",
        blockCreated: 4446677
      }
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 1059647
    }
  },
  testnet: true,
  sourceId
});
var baseSepoliaPreconf = /* @__PURE__ */ defineChain({
  ...baseSepolia,
  experimental_preconfirmationTime: 200,
  rpcUrls: {
    default: {
      http: ["https://sepolia-preconf.base.org"]
    }
  }
});

// node_modules/viem/_esm/chains/definitions/codexTestnet.js
init_defineChain();
var sourceId2 = 11155111;
var codexTestnet = /* @__PURE__ */ defineChain({
  ...chainConfig,
  id: 812242,
  name: "Codex Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.codex-stg.xyz"]
    }
  },
  blockExplorers: {
    default: {
      name: "Codex Testnet Explorer",
      url: "https://explorer.codex-stg.xyz",
      apiUrl: "https://explorer.codex-stg.xyz/api"
    }
  },
  contracts: {
    ...chainConfig.contracts,
    disputeGameFactory: {
      [sourceId2]: {
        address: "0x390e24E8324E56f13A8d48eB938b6f9De24CD205"
      }
    },
    portal: {
      [sourceId2]: {
        address: "0x037F161D12c829A9ca4742eEd9371830CA54fcB2"
      }
    },
    l1StandardBridge: {
      [sourceId2]: {
        address: "0xCf4df2bDB14C8FDB25FdacCEC10Ce5C4bAEDB3De"
      }
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11"
    }
  },
  sourceId: sourceId2,
  testnet: true
});

// node_modules/viem/_esm/chains/definitions/giwaSepolia.js
init_defineChain();
var sourceId3 = 11155111;
var giwaSepolia = /* @__PURE__ */ defineChain({
  ...chainConfig,
  id: 91342,
  network: "giwa-sepolia",
  name: "GIWA Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  blockTime: 1e3,
  rpcUrls: {
    default: {
      http: ["https://sepolia-rpc.giwa.io"]
    }
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://sepolia-explorer.giwa.io",
      apiUrl: "https://sepolia-explorer.giwa.io/api"
    }
  },
  contracts: {
    ...chainConfig.contracts,
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0
    },
    disputeGameFactory: {
      [sourceId3]: {
        address: "0x37347caB2afaa49B776372279143D71ad1f354F6"
      }
    },
    portal: {
      [sourceId3]: {
        address: "0x956962C34687A954e611A83619ABaA37Ce6bC78A"
      }
    },
    l1StandardBridge: {
      [sourceId3]: {
        address: "0x77b2ffc0F57598cAe1DB76cb398059cF5d10A7E7"
      }
    }
  },
  testnet: true,
  sourceId: sourceId3
});
var giwaSepoliaPreconf = defineChain({
  ...giwaSepolia,
  experimental_preconfirmationTime: 200,
  rpcUrls: {
    default: {
      http: ["https://sepolia-rpc-flashblocks.giwa.io"]
    }
  }
});

// node_modules/viem/_esm/chains/definitions/injectiveTestnet.js
init_defineChain();
var injectiveTestnet = /* @__PURE__ */ defineChain({
  id: 1439,
  name: "Injective Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Injective",
    symbol: "INJ"
  },
  rpcUrls: {
    default: {
      http: ["https://k8s.testnet.json-rpc.injective.network"],
      webSocket: ["wss://k8s.testnet.ws.injective.network"]
    }
  },
  blockExplorers: {
    default: {
      name: "Injective Explorer",
      url: "https://testnet.blockscout.injective.network",
      apiUrl: "https://testnet.blockscout.injective.network/api"
    }
  },
  testnet: true
});

// node_modules/viem/_esm/chains/definitions/inkSepolia.js
init_defineChain();
var sourceId4 = 11155111;
var inkSepolia = /* @__PURE__ */ defineChain({
  ...chainConfig,
  id: 763373,
  name: "Ink Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc-gel-sepolia.inkonchain.com"]
    }
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://explorer-sepolia.inkonchain.com/",
      apiUrl: "https://explorer-sepolia.inkonchain.com/api/v2"
    }
  },
  contracts: {
    ...chainConfig.contracts,
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0
    },
    disputeGameFactory: {
      [sourceId4]: {
        address: "0x860e626c700af381133d9f4af31412a2d1db3d5d"
      }
    },
    portal: {
      [sourceId4]: {
        address: "0x5c1d29c6c9c8b0800692acc95d700bcb4966a1d7"
      }
    },
    l1StandardBridge: {
      [sourceId4]: {
        address: "0x33f60714bbd74d62b66d79213c348614de51901c"
      }
    }
  },
  testnet: true,
  sourceId: sourceId4
});

// node_modules/viem/_esm/linea/actions/estimateGas.js
init_parseAccount();
init_account();
init_toHex();
init_getCallError();
init_extract();
init_transactionRequest();
init_stateOverride2();
init_assertRequest();
async function estimateGas(client, args) {
  const { account: account_ = client.account } = args;
  if (!account_)
    throw new AccountNotFoundError();
  const account = parseAccount(account_);
  try {
    const { accessList, blockNumber, blockTag, data, gas, gasPrice, maxFeePerGas, maxPriorityFeePerGas, nonce, stateOverride, to, value, ...rest } = args;
    const blockNumberHex = typeof blockNumber === "bigint" ? numberToHex(blockNumber) : void 0;
    const block2 = blockNumberHex || blockTag;
    assertRequest(args);
    const chainFormat = client.chain?.formatters?.transactionRequest?.format;
    const format2 = chainFormat || formatTransactionRequest;
    const request = format2({
      // Pick out extra data that might exist on the chain's transaction request type.
      ...extract(rest, { format: chainFormat }),
      account,
      accessList,
      data,
      gas,
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
      to,
      value
    }, "estimateGas");
    const rpcStateOverride = serializeStateOverride(stateOverride);
    const { baseFeePerGas, gasLimit, priorityFeePerGas } = await client.request({
      method: "linea_estimateGas",
      params: rpcStateOverride ? block2 ? [request, block2, rpcStateOverride] : [request, rpcStateOverride] : block2 ? [request, block2] : [request]
    });
    return {
      baseFeePerGas: BigInt(baseFeePerGas),
      gasLimit: BigInt(gasLimit),
      priorityFeePerGas: BigInt(priorityFeePerGas)
    };
  } catch (err) {
    throw getCallError(err, {
      ...args,
      account,
      chain: client.chain
    });
  }
}

// node_modules/viem/_esm/linea/chainConfig.js
var chainConfig2 = {
  fees: {
    estimateFeesPerGas,
    async maxPriorityFeePerGas({ block: block2, client, request }) {
      const response = await estimateFeesPerGas({
        block: block2,
        client,
        multiply: (x) => x,
        request,
        type: "eip1559"
      });
      if (!response?.maxPriorityFeePerGas)
        return null;
      return response.maxPriorityFeePerGas;
    }
  }
};
async function estimateFeesPerGas({ client, multiply, request, type }) {
  try {
    const response = await estimateGas(client, {
      ...request,
      account: request?.account
    });
    const { priorityFeePerGas: maxPriorityFeePerGas } = response;
    const baseFeePerGas = multiply(BigInt(response.baseFeePerGas));
    const maxFeePerGas = baseFeePerGas + maxPriorityFeePerGas;
    if (type === "legacy")
      return { gasPrice: maxFeePerGas };
    return {
      maxFeePerGas,
      maxPriorityFeePerGas
    };
  } catch {
    return null;
  }
}

// node_modules/viem/_esm/chains/definitions/lineaSepolia.js
init_defineChain();
var lineaSepolia = /* @__PURE__ */ defineChain({
  ...chainConfig2,
  id: 59141,
  name: "Linea Sepolia Testnet",
  nativeCurrency: { name: "Linea Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.linea.build"],
      webSocket: ["wss://rpc.sepolia.linea.build"]
    }
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.lineascan.build",
      apiUrl: "https://api-sepolia.lineascan.build/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 227427
    },
    ensRegistry: {
      address: "0x5B2636F0f2137B4aE722C01dd5122D7d3e9541f7",
      blockCreated: 2395094
    },
    ensUniversalResolver: {
      address: "0x4D41762915F83c76EcaF6776d9b08076aA32b492",
      blockCreated: 17168484
    }
  },
  ensTlds: [".linea.eth"],
  testnet: true
});

// node_modules/viem/_esm/chains/definitions/monadTestnet.js
init_defineChain();
var monadTestnet = /* @__PURE__ */ defineChain({
  id: 10143,
  name: "Monad Testnet",
  blockTime: 300,
  nativeCurrency: {
    name: "Testnet MON Token",
    symbol: "MON",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"]
    }
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet explorer",
      url: "https://testnet.monadexplorer.com"
    }
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 251449
    }
  },
  testnet: true
});

// node_modules/viem/_esm/chains/definitions/optimismSepolia.js
init_defineChain();
var sourceId5 = 11155111;
var optimismSepolia = /* @__PURE__ */ defineChain({
  ...chainConfig,
  id: 11155420,
  name: "OP Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://sepolia.optimism.io"]
    }
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://optimism-sepolia.blockscout.com",
      apiUrl: "https://optimism-sepolia.blockscout.com/api"
    }
  },
  contracts: {
    ...chainConfig.contracts,
    disputeGameFactory: {
      [sourceId5]: {
        address: "0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1"
      }
    },
    l2OutputOracle: {
      [sourceId5]: {
        address: "0x90E9c4f8a994a250F6aEfd61CAFb4F2e895D458F"
      }
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 1620204
    },
    portal: {
      [sourceId5]: {
        address: "0x16Fc5058F25648194471939df75CF27A2fdC48BC"
      }
    },
    l1StandardBridge: {
      [sourceId5]: {
        address: "0xFBb0621E0B23b5478B630BD55a5f21f67730B0F1"
      }
    }
  },
  testnet: true,
  sourceId: sourceId5
});

// node_modules/viem/_esm/chains/definitions/plasmaTestnet.js
init_defineChain();
var plasmaTestnet = /* @__PURE__ */ defineChain({
  id: 9746,
  name: "Plasma Testnet",
  nativeCurrency: {
    name: "Testnet Plasma",
    symbol: "XPL",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.plasma.to"]
    }
  },
  blockExplorers: {
    default: {
      name: "RouteScan",
      url: "https://testnet.plasmascan.to"
    }
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0
    }
  },
  testnet: true
});

// node_modules/viem/_esm/chains/definitions/polygonAmoy.js
init_defineChain();
var polygonAmoy = /* @__PURE__ */ defineChain({
  id: 80002,
  name: "Polygon Amoy",
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://polygon-amoy.drpc.org"]
    }
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url: "https://amoy.polygonscan.com",
      apiUrl: "https://api.etherscan.io/v2/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 3127388
    }
  },
  testnet: true
});

// node_modules/viem/_esm/chains/definitions/seiTestnet.js
init_defineChain();
var seiTestnet = /* @__PURE__ */ defineChain({
  id: 1328,
  name: "Sei Testnet",
  nativeCurrency: { name: "Sei", symbol: "SEI", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://evm-rpc-testnet.sei-apis.com"],
      webSocket: ["wss://evm-ws-testnet.sei-apis.com"]
    }
  },
  blockExplorers: {
    default: {
      name: "Seiscan",
      url: "https://testnet.seiscan.io",
      apiUrl: "https://api.etherscan.io/v2/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 98697651
    }
  },
  testnet: true
});

// node_modules/viem/_esm/chains/definitions/sepolia.js
init_defineChain();
var sepolia = /* @__PURE__ */ defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://11155111.rpc.thirdweb.com"]
    }
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
      apiUrl: "https://api-sepolia.etherscan.io/api"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 751532
    },
    ensUniversalResolver: {
      address: "0xeeeeeeee14d718c2b47d9923deab1335e144eeee",
      blockCreated: 8928790
    }
  },
  testnet: true
});

// node_modules/viem/_esm/chains/definitions/unichainSepolia.js
init_defineChain();
var sourceId6 = 11155111;
var unichainSepolia = /* @__PURE__ */ defineChain({
  ...chainConfig,
  id: 1301,
  name: "Unichain Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  blockTime: 1e3,
  rpcUrls: {
    default: {
      http: ["https://sepolia.unichain.org"]
    }
  },
  blockExplorers: {
    default: {
      name: "Uniscan",
      url: "https://sepolia.uniscan.xyz",
      apiUrl: "https://api-sepolia.uniscan.xyz/api"
    }
  },
  contracts: {
    ...chainConfig.contracts,
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 0
    },
    portal: {
      [sourceId6]: {
        address: "0x0d83dab629f0e0F9d36c0Cbc89B69a489f0751bD"
      }
    },
    l1StandardBridge: {
      [sourceId6]: {
        address: "0xea58fcA6849d79EAd1f26608855c2D6407d54Ce2"
      }
    },
    disputeGameFactory: {
      [sourceId6]: {
        address: "0xeff73e5aa3B9AEC32c659Aa3E00444d20a84394b"
      }
    }
  },
  testnet: true,
  sourceId: sourceId6
});

// node_modules/viem/_esm/chains/definitions/worldchainSepolia.js
init_defineChain();
var sourceId7 = 11155111;
var worldchainSepolia = /* @__PURE__ */ defineChain({
  ...chainConfig,
  id: 4801,
  name: "World Chain Sepolia",
  network: "worldchain-sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://worldchain-sepolia.g.alchemy.com/public"] }
  },
  blockExplorers: {
    default: {
      name: "Worldscan Sepolia",
      url: "https://sepolia.worldscan.org",
      apiUrl: "https://api-sepolia.worldscan.org/api"
    },
    blockscout: {
      name: "Blockscout",
      url: "https://worldchain-sepolia.explorer.alchemy.com",
      apiUrl: "https://worldchain-sepolia.explorer.alchemy.com/api"
    }
  },
  contracts: {
    ...chainConfig.contracts,
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 0
    },
    disputeGameFactory: {
      [sourceId7]: {
        address: "0x8Ec1111f67Dad6b6A93B3F42DfBC92D81c98449A"
      }
    },
    l2OutputOracle: {
      [sourceId7]: {
        address: "0xc8886f8BAb6Eaeb215aDB5f1c686BF699248300e"
      }
    },
    portal: {
      [sourceId7]: {
        address: "0xFf6EBa109271fe6d4237EeeD4bAb1dD9A77dD1A4"
      }
    },
    l1StandardBridge: {
      [sourceId7]: {
        address: "0xd7DF54b3989855eb66497301a4aAEc33Dbb3F8DE"
      }
    }
  },
  testnet: true,
  sourceId: sourceId7
});

// node_modules/viem/_esm/chains/definitions/xLayerTestnet.js
init_defineChain();
var xLayerTestnet = /* @__PURE__ */ defineChain({
  id: 1952,
  name: "X1 Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "OKB",
    symbol: "OKB"
  },
  rpcUrls: {
    default: { http: ["https://xlayertestrpc.okx.com"] }
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer-test"
    }
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 624344
    }
  },
  testnet: true
});

// src/config/chains.ts
var VERIFIED = "2026-11-23";
var CHAINS = [
  {
    id: sepolia.id,
    key: "sepolia",
    name: "Ethereum Sepolia",
    short: "Sepolia",
    viem: sepolia,
    cctpDomain: 0,
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    uniswap: {
      quoter: "0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3",
      router02: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
      factory: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c"
    },
    bridge: "cctp",
    color: "#8a92b2",
    gradient: ["#627eea", "#3b5bd9"],
    faucets: [
      { label: "Google Web3 Faucet", url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia", tokens: ["ETH"], access: "account", cooldown: "rate limit", checked: VERIFIED, note: "0.05 ETH. Needs a Google Account and about 0.001 ETH on mainnet; the drip limit depends on the network." },
      { label: "QuickNode Sepolia", url: "https://faucet.quicknode.com/ethereum/sepolia", tokens: ["ETH"], access: "free", cooldown: "12h", checked: VERIFIED, note: "No QuickNode account, but the wallet needs a small mainnet balance. Optional X share doubles the drip." },
      { label: "Sepolia PoW Faucet", url: "https://sepolia-faucet.pk910.de/", tokens: ["ETH"], access: "pow", note: "Mine in the browser to earn ETH. Slower, but no account and no daily cap.", checked: VERIFIED },
      { label: "Alchemy Sepolia Faucet", url: "https://www.alchemy.com/faucets/ethereum-sepolia", tokens: ["ETH"], access: "free", cooldown: "24h", checked: VERIFIED, note: "0.1 ETH every 24h. No Alchemy account, but the wallet must meet eligibility rules (small mainnet balance)." },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: avalancheFuji.id,
    key: "avalancheFuji",
    name: "Avalanche Fuji",
    short: "Fuji",
    viem: avalancheFuji,
    cctpDomain: 1,
    usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
    bridge: "cctp",
    color: "#e84142",
    gradient: ["#ff5a5f", "#c31c23"],
    faucets: [
      { label: "Avalanche Builder Hub Faucet", url: "https://build.avax.network/console/primary-network/faucet", tokens: ["AVAX"], access: "account", cooldown: "2h", checked: VERIFIED, note: "Up to 2 Fuji AVAX per day, one request every 2 hours. Needs a Builder Hub account, or mainnet AVAX balance for the no-coupon path." },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: optimismSepolia.id,
    key: "optimismSepolia",
    name: "OP Sepolia",
    short: "OP Sepolia",
    viem: optimismSepolia,
    cctpDomain: 2,
    usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    uniswap: {
      quoter: "0xC5290058841028F1614F3A6F0F5816cAd0df5E27",
      router02: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
      factory: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"
    },
    bridge: "cctp",
    opStackParent: sepolia.id,
    color: "#ff0420",
    gradient: ["#ff4a5c", "#c40018"],
    faucets: [
      { label: "Superchain Faucet", url: "https://console.optimism.io/faucet", tokens: ["ETH"], access: "account", cooldown: "24h", checked: VERIFIED, note: "Shown as under maintenance on 2026-11-23. Use the Alchemy OP Sepolia entry below." },
      { label: "Alchemy OP Sepolia", url: "https://www.alchemy.com/faucets/optimism-sepolia", tokens: ["ETH"], access: "account", cooldown: "24h", checked: VERIFIED },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: arbitrumSepolia.id,
    key: "arbitrumSepolia",
    name: "Arbitrum Sepolia",
    short: "Arb Sepolia",
    viem: arbitrumSepolia,
    cctpDomain: 3,
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    bridge: "cctp",
    color: "#28a0f0",
    gradient: ["#4dc3ff", "#0e6bb0"],
    faucets: [
      { label: "Alchemy Arbitrum Sepolia", url: "https://www.alchemy.com/faucets/arbitrum-sepolia", tokens: ["ETH"], access: "account", cooldown: "24h", checked: VERIFIED },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: baseSepolia.id,
    key: "baseSepolia",
    name: "Base Sepolia",
    short: "Base Sepolia",
    viem: baseSepolia,
    cctpDomain: 6,
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    uniswap: {
      quoter: "0xC5290058841028F1614F3A6F0F5816cAd0df5E27",
      router02: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
      factory: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"
    },
    bridge: "cctp",
    opStackParent: sepolia.id,
    color: "#0052ff",
    gradient: ["#3b82f6", "#0038b3"],
    faucets: [
      { label: "Coinbase CDP Faucet", url: "https://portal.cdp.coinbase.com/products/faucet", tokens: ["ETH"] },
      { label: "Alchemy Base Sepolia", url: "https://www.alchemy.com/faucets/base-sepolia", tokens: ["ETH"], access: "account", cooldown: "24h", checked: VERIFIED },
      { label: "QuickNode Base Sepolia", url: "https://faucet.quicknode.com/base/sepolia", tokens: ["ETH"], access: "account", cooldown: "12h", checked: VERIFIED },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: polygonAmoy.id,
    key: "polygonAmoy",
    name: "Polygon Amoy",
    short: "Amoy",
    viem: polygonAmoy,
    cctpDomain: 7,
    usdc: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    bridge: "cctp",
    color: "#8247e5",
    gradient: ["#a855f7", "#5b21b6"],
    faucets: [
      { label: "Polygon Faucet", url: "https://faucet.polygon.technology/", tokens: ["POL"], note: "Bot-protected, open in a normal browser tab." },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: unichainSepolia.id,
    key: "unichainSepolia",
    name: "Unichain Sepolia",
    short: "Unichain",
    viem: unichainSepolia,
    cctpDomain: 10,
    usdc: "0x31d0220469e10c4E71834a79b1f276d740d3768F",
    uniswap: {
      quoter: "0x6Dd37329A1A225a6Fca658265D460423DCafBF89",
      router02: "0xd1AAE39293221B77B0C71fBD6dCb7Ea29Bb5B166",
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
    },
    bridge: "cctp",
    opStackParent: sepolia.id,
    color: "#ff007a",
    gradient: ["#ff4d9d", "#c4005e"],
    faucets: [
      { label: "Superchain Faucet", url: "https://console.optimism.io/faucet", tokens: ["ETH"], access: "account", cooldown: "24h", checked: VERIFIED, note: "Shown as under maintenance on 2026-11-23. Use the Alchemy Unichain Sepolia entry below." },
      { label: "Alchemy Unichain Sepolia", url: "https://www.alchemy.com/faucets/unichain-sepolia", tokens: ["ETH"], access: "free", cooldown: "24h", checked: VERIFIED, note: "0.1 ETH every 24h. No Alchemy account, but the wallet must meet eligibility rules." },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"], access: "free", cooldown: "2h", checked: VERIFIED }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: lineaSepolia.id,
    key: "lineaSepolia",
    name: "Linea Sepolia",
    short: "Linea",
    viem: lineaSepolia,
    cctpDomain: 11,
    usdc: "0xFEce4462D57bD51A6A552365A011b95f0E16d9B7",
    bridge: "cctp",
    color: "#61dfff",
    gradient: ["#7bf3ff", "#0e7490"],
    faucets: [
      { label: "MetaMask Developer Faucet (Linea)", url: "https://developer.metamask.com/faucet/linea-sepolia", tokens: ["ETH"], access: "account", cooldown: "24h", checked: VERIFIED, note: "Linea docs state a 0.5 ETH daily maximum. Needs a MetaMask developer account." },
      { label: "QuickNode Linea Sepolia", url: "https://faucet.quicknode.com/linea/sepolia", tokens: ["ETH"], access: "free", cooldown: "12h", checked: VERIFIED, note: "No account, but the wallet needs a small mainnet balance." },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: codexTestnet.id,
    key: "codexTestnet",
    name: "Codex Testnet",
    short: "Codex",
    viem: codexTestnet,
    cctpDomain: 12,
    usdc: "0x6d7f141b6819C2c9CC2f818e6ad549E7Ca090F8f",
    bridge: "cctp",
    color: "#e7e3d4",
    gradient: ["#fef3c7", "#a1803f"],
    faucets: [
      { label: "Codex explorer", url: "https://explorer.codex-stg.xyz/", tokens: ["ETH"], note: "No official Codex Testnet faucet was found. The explorer is linked so you can check gas and transactions; get Sepolia ETH and bridge if a route is ever listed." },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: worldchainSepolia.id,
    key: "worldchainSepolia",
    name: "World Chain Sepolia",
    short: "World",
    viem: worldchainSepolia,
    cctpDomain: 14,
    usdc: "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88",
    bridge: "cctp",
    opStackParent: sepolia.id,
    color: "#d4d4d8",
    gradient: ["#e5e7eb", "#6b7280"],
    faucets: [
      { label: "Alchemy World Chain Sepolia", url: "https://www.alchemy.com/faucets/world-chain-sepolia", tokens: ["ETH"], access: "free", cooldown: "24h", checked: VERIFIED, note: "0.1 ETH every 24h. No account, but the wallet must meet eligibility rules (about 0.001 ETH mainnet)." },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: monadTestnet.id,
    key: "monadTestnet",
    name: "Monad Testnet",
    short: "Monad",
    viem: monadTestnet,
    cctpDomain: 15,
    usdc: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
    bridge: "cctp",
    color: "#836ef9",
    gradient: ["#a78bfa", "#5b21b6"],
    faucets: [
      { label: "Monad Faucet", url: "https://faucet.monad.xyz/", tokens: ["MON"], access: "free", cooldown: "24h", checked: VERIFIED, note: "Up to 50 testnet MON every 24 hours." },
      { label: "Monad developer docs", url: "https://testnet.monad.xyz/", tokens: ["MON"], note: "Redirects to the Monad developer docs, kept as the fallback entry point." },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: seiTestnet.id,
    key: "seiTestnet",
    name: "Sei Testnet",
    short: "Sei",
    viem: seiTestnet,
    cctpDomain: 16,
    usdc: "0x4fCF1784B31630811181f670Aea7A7bEF803eaED",
    bridge: "cctp",
    color: "#9e1f19",
    gradient: ["#ef4444", "#7f1d1d"],
    faucets: [
      { label: "Sei Faucet", url: "https://docs.sei.io/learn/faucet", tokens: ["SEI"], access: "account", cooldown: "24h", checked: VERIFIED, note: "The official faucet page embeds a third-party widget; the amount is not published." },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: inkSepolia.id,
    key: "inkSepolia",
    name: "Ink Sepolia",
    short: "Ink",
    viem: inkSepolia,
    cctpDomain: 21,
    usdc: "0xFabab97dCE620294D2B0b0e46C68964e326300Ac",
    bridge: "cctp",
    opStackParent: sepolia.id,
    color: "#7c3aed",
    gradient: ["#a78bfa", "#4c1d95"],
    faucets: [
      { label: "Ink Faucet", url: "https://inkonchain.com/faucet", tokens: ["ETH"], access: "account", cooldown: "24h", checked: VERIFIED, note: "0.01 ETH per request. Offers Alchemy, QuickNode and Superchain as providers." },
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: arcTestnet.id,
    key: "arcTestnet",
    name: "Arc Testnet",
    short: "Arc",
    viem: arcTestnet,
    cctpDomain: 26,
    usdc: "0x3600000000000000000000000000000000000000",
    uniswap: {
      quoter: "0xf4DDb3683aa6c5dB41b1e42FF0E95700B9a407C5",
      router02: "0x60828cc42BB99a3D9981b25BA4F99eD6d87E7328",
      factory: "0xcF768f25dA5Ccc602b24eA33a28A0df3e3DdB152",
      kind: "v1"
    },
    bridge: "cctp",
    nativeIsUsdc: true,
    minGasPriceGwei: 20,
    color: "#2dd4bf",
    gradient: ["#5eead4", "#0f766e"],
    faucets: [
      { label: "Arc Faucet", url: "https://faucet.circle.com", tokens: ["USDC", "EURC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: injectiveTestnet.id,
    key: "injectiveTestnet",
    name: "Injective Testnet",
    short: "Injective",
    viem: injectiveTestnet,
    cctpDomain: 29,
    usdc: "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d",
    bridge: "cctp",
    color: "#00a3ff",
    gradient: ["#38bdf8", "#0369a1"],
    faucets: [
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: plasmaTestnet.id,
    key: "plasmaTestnet",
    name: "Plasma Testnet",
    short: "Plasma",
    viem: plasmaTestnet,
    cctpDomain: 33,
    usdc: "0xE67Fb267022cBA8064Dd388CC2FED724F3120D9D",
    bridge: "cctp",
    color: "#00e5c0",
    gradient: ["#2dd4bf", "#047857"],
    faucets: [
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: xLayerTestnet.id,
    key: "xLayerTestnet",
    name: "X Layer Testnet",
    short: "X Layer",
    viem: xLayerTestnet,
    cctpDomain: 37,
    usdc: "0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3",
    bridge: "cctp",
    color: "#e2e8f0",
    gradient: ["#cbd5e1", "#475569"],
    faucets: [
      { label: "Circle USDC Faucet", url: "https://faucet.circle.com", tokens: ["USDC"] }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: 46630,
    key: "robinhoodTestnet",
    name: "Robinhood Chain Testnet",
    short: "Robinhood",
    viem: {
      id: 46630,
      name: "Robinhood Chain Testnet",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
      blockExplorers: {
        default: { name: "Robinhood Chain Testnet Explorer", url: "https://explorer.testnet.chain.robinhood.com" }
      }
    },
    bridge: "none",
    bridgeNote: "TokenMessengerV2 and MessageTransmitterV2 do exist at the canonical address here (localDomain 35, and the Iris sandbox returns a fee schedule), but Circle does not document this chain and several look-alike USDC tokens exist without a verifiably Circle-issued one. Offering a burn against the wrong USDC would be a fund-loss trap, so no USDC route is exposed.",
    color: "#00c853",
    gradient: ["#00c853", "#00522d"],
    faucets: [
      { label: "Robinhood Chain Faucet", url: "https://faucet.testnet.chain.robinhood.com", tokens: ["ETH"], access: "free", checked: VERIFIED, note: "Official testnet faucet. Rate-limited for automated checks, so it may need a normal browser tab." }
    ],
    verifiedAt: VERIFIED
  },
  {
    id: giwaSepolia.id,
    key: "giwaSepolia",
    name: "GIWA Sepolia",
    short: "GIWA",
    viem: giwaSepolia,
    bridge: "opstack",
    opStackParent: sepolia.id,
    color: "#f472b6",
    gradient: ["#fb7185", "#9d174d"],
    faucets: [
      { label: "GIWA Faucet", url: "https://faucet.giwa.io/", tokens: ["ETH"], access: "free", cooldown: "24h", note: "0.005 ETH per claim. The host blocks automated checks, so open it in a normal tab.", checked: VERIFIED },
      { label: "Nodit GIWA Faucet", url: "https://faucet.lambda256.io/giwa-sepolia", tokens: ["ETH"], access: "free", cooldown: "24h", note: "0.01 ETH per wallet every 24 hours. No account, but the page asks you to follow @NoditPlatform on X.", checked: VERIFIED },
      { label: "Sepolia ETH for L1 gas", url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia", tokens: ["ETH"], access: "account", cooldown: "24h", checked: VERIFIED }
    ],
    verifiedAt: VERIFIED
  }
];
var TESTNET_IDS = new Set(CHAINS.map((c) => c.id));
var BY_ID = new Map(CHAINS.map((c) => [c.id, c]));
var BY_KEY = new Map(CHAINS.map((c) => [c.key, c]));
function getChain(id) {
  if (id == null) return void 0;
  return BY_ID.get(id);
}
function mustChain(id) {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`Chain ${id} is not on the testnet allowlist`);
  return c;
}
var CCTP_CHAINS = CHAINS.filter((c) => c.bridge === "cctp" && c.cctpDomain != null && c.usdc);
var SWAP_CHAINS = CHAINS.filter((c) => c.uniswap);
var VIEM_CHAINS = CHAINS.map((c) => c.viem);

// src/config/tokens.ts
var t = (chainId, address, symbol, name, decimals, kind, color) => ({ chainId, address, symbol, name, decimals, kind, color, verified: true });
var WETH = {
  11155111: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  11155420: "0x4200000000000000000000000000000000000006",
  84532: "0x4200000000000000000000000000000000000006",
  1301: "0x4200000000000000000000000000000000000006"
};
var TOKENS = [
  // ── Ethereum Sepolia, every pair below was quoted live against Uniswap v3 on 2026-11-23
  t(11155111, "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(11155111, "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", "WETH", "Wrapped Ether", 18, "weth", "#627eea"),
  t(11155111, "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", "UNI", "Uniswap", 18, "token", "#ff007a"),
  t(11155111, "0x68194a729C2450ad26072b3D33ADaCbcef39D574", "DAI", "Dai Stablecoin", 18, "token", "#f5ac37"),
  t(11155111, "0x779877A7B0D9E8603169DdbD7836e478b4624789", "LINK", "ChainLink Token", 18, "token", "#2a5ada"),
  t(11155111, "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0", "USDT", "Tether USD", 6, "token", "#26a17b"),
  t(11155111, "0x29f2D40B0605204364af54EC677bD022dA425d03", "WBTC", "Wrapped BTC", 8, "token", "#f7931a"),
  // ── OP Sepolia: canonical Uniswap v3 deployment, USDC/WETH 0.05% pool verified live
  t(11155420, "0x5fd84259d66Cd46123540766Be93DFE6D43130D7", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(11155420, "0x4200000000000000000000000000000000000006", "WETH", "Wrapped Ether", 18, "weth", "#627eea"),
  // ── Base Sepolia
  t(84532, "0x036CbD53842c5426634e7929541eC2318f3dCF7e", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(84532, "0x4200000000000000000000000000000000000006", "WETH", "Wrapped Ether", 18, "weth", "#627eea"),
  // ── Unichain Sepolia
  t(1301, "0x31d0220469e10c4E71834a79b1f276d740d3768F", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(1301, "0x4200000000000000000000000000000000000006", "WETH", "Wrapped Ether", 18, "weth", "#627eea"),
  // ── Arc Testnet: native USDC (18dp native / 6dp ERC-20 view) + EURC + cirBTC
  t(5042002, "0x3600000000000000000000000000000000000000", "USDC", "USD Coin (native on Arc)", 6, "usdc", "#2775ca"),
  t(5042002, "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", "EURC", "Euro Coin", 6, "token", "#1a5cff"),
  t(5042002, "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", "cirBTC", "Circle Wrapped BTC (verify before use)", 8, "token", "#f7931a"),
  // ── USD Coin on the remaining CCTP testnets (needed for bridge balances + portfolio)
  t(43113, "0x5425890298aed601595a70AB815c96711a31Bc65", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(421614, "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(80002, "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(59141, "0xFEce4462D57bD51A6A552365A011b95f0E16d9B7", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(812242, "0x6d7f141b6819C2c9CC2f818e6ad549E7Ca090F8f", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(4801, "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(10143, "0x534b2f3A21130d7a60830c2Df862319e593943A3", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(1328, "0x4fCF1784B31630811181f670Aea7A7bEF803eaED", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(763373, "0xFabab97dCE620294D2B0b0e46C68964e326300Ac", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(1439, "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(9746, "0xE67Fb267022cBA8064Dd388CC2FED724F3120D9D", "USDC", "USD Coin", 6, "usdc", "#2775ca"),
  t(1952, "0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3", "USDC", "USD Coin", 6, "usdc", "#2775ca")
];
function tokensForChain(chainId) {
  if (chainId == null) return [];
  return TOKENS.filter((tk) => tk.chainId === chainId);
}
function findToken(chainId, address) {
  if (!address) return void 0;
  const a = address.toLowerCase();
  return TOKENS.find((tk) => tk.chainId === chainId && tk.address.toLowerCase() === a);
}
var USDC_OF = (chainId) => {
  const c = getChain(chainId);
  if (!c?.usdc) return void 0;
  return findToken(chainId, c.usdc) ?? void 0;
};
var NATIVE_SENTINEL = "0x0000000000000000000000000000000000000000";
var NATIVE = (chainId) => {
  const c = getChain(chainId);
  return {
    symbol: c?.viem.nativeCurrency.symbol ?? "ETH",
    name: c?.viem.nativeCurrency.name ?? "Ether",
    decimals: c?.viem.nativeCurrency.decimals ?? 18
  };
};
function nativeToken(chainId) {
  const n = NATIVE(chainId);
  const c = getChain(chainId);
  return {
    chainId,
    address: NATIVE_SENTINEL,
    symbol: n.symbol,
    name: `${n.name} (native)`,
    decimals: n.decimals,
    kind: "token",
    color: c?.gradient[0] ?? "#64748b",
    verified: true
  };
}

// src/config/pools.ts
var POOLS = [
  {
    "chainId": 1301,
    "address": "0xE87b0A6C6611119deCF5C4e9203E1c46F561BdAE",
    "fee": 100,
    "token0": "0x31d0220469e10c4E71834a79b1f276d740d3768F",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "42014588378",
    "verifiedReserve1": "3772514428467693984",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 1301,
    "address": "0xBeAD5792bB6C299AB11Eaa425aC3fE11ebA47b3B",
    "fee": 500,
    "token0": "0x31d0220469e10c4E71834a79b1f276d740d3768F",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "2076600831",
    "verifiedReserve1": "2673961759605389782",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 1301,
    "address": "0x8F463126bBEA80A10DF9Bf6FF5455B6B0292B34e",
    "fee": 3e3,
    "token0": "0x31d0220469e10c4E71834a79b1f276d740d3768F",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "13747449155",
    "verifiedReserve1": "12514608542111072502",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 1301,
    "address": "0xa88bF2bF5583b386B19E73D1a26A5Ab0Fa90f12D",
    "fee": 1e4,
    "token0": "0x31d0220469e10c4E71834a79b1f276d740d3768F",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "208608076643",
    "verifiedReserve1": "42083414198080918051",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 84532,
    "address": "0x57183717A087d2fe3Ad890873877244c3B96156c",
    "fee": 100,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "136332682",
    "verifiedReserve1": "52275803144775563",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 84532,
    "address": "0x94bfc0574FF48E92cE43d495376C477B1d0EEeC0",
    "fee": 500,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "503563173",
    "verifiedReserve1": "25926487314142203",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 84532,
    "address": "0x46880b404CD35c165EDdefF7421019F8dD25F4Ad",
    "fee": 3e3,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "44244626292",
    "verifiedReserve1": "4420791961596887455",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 84532,
    "address": "0x4664755562152EDDa3a3073850FB62835451926a",
    "fee": 1e4,
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0x4200000000000000000000000000000000000006",
    "verifiedReserve0": "16507710",
    "verifiedReserve1": "19714730856043871",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 5042002,
    "address": "0x911aFa2C1B51a8fe23511359AB58F73AD7b81D94",
    "fee": 100,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "verifiedReserve0": "4640228",
    "verifiedReserve1": "1000196",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 5042002,
    "address": "0xFC1109e67e39C697819b69A34561c5330c952a8F",
    "fee": 3e3,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "verifiedReserve0": "3715075",
    "verifiedReserve1": "543972",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 5042002,
    "address": "0x7A1ccE68c3AA18E02Ad60F68e58c8161fd2CB155",
    "fee": 1e4,
    "token0": "0x3600000000000000000000000000000000000000",
    "token1": "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    "verifiedReserve0": "28684438",
    "verifiedReserve1": "1266691",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x294A263412D5Be965b45Bd93121CA58813F68b07",
    "fee": 100,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "verifiedReserve0": "31704233762",
    "verifiedReserve1": "54958582749590138",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x6E81F4a9bE879CE9FCBAD4Eafc9311fB9e766299",
    "fee": 500,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "verifiedReserve0": "51020132184",
    "verifiedReserve1": "107456147709604103",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x349492f65C8B27efEF83456189b85D0Fa32afCcd",
    "fee": 3e3,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "verifiedReserve0": "197740020",
    "verifiedReserve1": "168011091714084",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x3855551c7c0c9E38e1a936f9939F2e187c22B767",
    "fee": 1e4,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "verifiedReserve0": "11756579340",
    "verifiedReserve1": "34242001569025153",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x1Ba31Bd4650Cd9720Ee8837Bc6cCa5e1BdB151D4",
    "fee": 3e3,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x29f2D40B0605204364af54EC677bD022dA425d03",
    "verifiedReserve0": "19642654",
    "verifiedReserve1": "628857682",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x2d021e62D1aE41946846462d4bD8A85BB3d49C2c",
    "fee": 3e3,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "verifiedReserve0": "6170079729",
    "verifiedReserve1": "35912816523503120771",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x9C02D38A5A61bdc83b63B73f3776C4622a21d3cc",
    "fee": 100,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "22508834",
    "verifiedReserve1": "2795493373",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xfef3Ae91E2050AcCB4dA6033C6EB3b1BC4E3a1a5",
    "fee": 500,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "448778653",
    "verifiedReserve1": "13303686223601",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xCfDFab545198cC61da2156aA25607023F01814dF",
    "fee": 3e3,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "32295670",
    "verifiedReserve1": "4218851631",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xFeEd501c2B21D315F04946F85fC6416B640240b5",
    "fee": 100,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "429579893696",
    "verifiedReserve1": "5959801456846468805",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1",
    "fee": 500,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "53481441798010",
    "verifiedReserve1": "119401705596513896128",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x6Ce0896eAE6D4BD668fDe41BB784548fb8F59b50",
    "fee": 3e3,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "3431725151673",
    "verifiedReserve1": "65722329114594688632",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x6418EEC70f50913ff0d756B48d32Ce7C02b47C47",
    "fee": 1e4,
    "token0": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "42485836784454",
    "verifiedReserve1": "1333764216040580066061",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xAb3Aa251Ca3E750f630d2EEb6e0d72F65b4865B0",
    "fee": 1e4,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "verifiedReserve0": "55258667403973668",
    "verifiedReserve1": "355488692466765791653",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xa23B8f156d2158836cc815cB35f0f18B853A386e",
    "fee": 3e3,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "211193068586640",
    "verifiedReserve1": "12237817326",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xb8b672bdd9cFF3D0979e7344c7358CA12E78a1F0",
    "fee": 100,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "1133013168814814610",
    "verifiedReserve1": "21964909819986693711",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x224Cc4e5b50036108C1d862442365054600c260C",
    "fee": 500,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "5719532514076937388",
    "verifiedReserve1": "114604961547648782414",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x287B0e934ed0439E2a7b1d5F0FC25eA2c24b64f7",
    "fee": 3e3,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "64823265417907541040",
    "verifiedReserve1": "863760944578764886184",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x51aDC79e7760aC5317a0d05e7a64c4f9cB2d4369",
    "fee": 1e4,
    "token0": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "20797636586969661060",
    "verifiedReserve1": "312713682542607439298",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x39CCc2b87c54c7bA26D7DeDF215652F6a10a7d7c",
    "fee": 3e3,
    "token0": "0x29f2D40B0605204364af54EC677bD022dA425d03",
    "token1": "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
    "verifiedReserve0": "10009078",
    "verifiedReserve1": "1078524187662633",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x4b053461dd564CF8e0d2F9E3b73D78BD837de765",
    "fee": 3e3,
    "token0": "0x29f2D40B0605204364af54EC677bD022dA425d03",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "2925071340267",
    "verifiedReserve1": "314371578211",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x1293173e5426C03ba6E9a3067cA235b8C5BC646F",
    "fee": 1e4,
    "token0": "0x29f2D40B0605204364af54EC677bD022dA425d03",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "192917924",
    "verifiedReserve1": "1121846004",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xD1787BA366fea7F69212Dfc0a3637ACfEFdf7f25",
    "fee": 500,
    "token0": "0x29f2D40B0605204364af54EC677bD022dA425d03",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "1404337859279",
    "verifiedReserve1": "67557434745940148",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x695F5440917727B19E58D712A2f259dac905B790",
    "fee": 500,
    "token0": "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
    "token1": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "verifiedReserve0": "586885864321001461929",
    "verifiedReserve1": "1719526730469639196",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x8F0630E71579ADa6A26187818A4AB792fF2F62C8",
    "fee": 3e3,
    "token0": "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "6416913369123347759066",
    "verifiedReserve1": "28614150895190067",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x61F4FC9E845edC6F9E5af4eF82cdD8D9c26B0c90",
    "fee": 1e4,
    "token0": "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "211049999999584513349",
    "verifiedReserve1": "377668274619",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x3C36878e3060AD03bD0B8C03E6DAB2D1686Aa38B",
    "fee": 100,
    "token0": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "token1": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "verifiedReserve0": "262303740925040273",
    "verifiedReserve1": "2945352005",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x9e2bCA4c6ac6cC5028403AeC9D2cAF901EbA5D08",
    "fee": 100,
    "token0": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "177705163295251145994",
    "verifiedReserve1": "330004310629861611",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x9BB3Ea0b68491F2a0cf2776C850cbB566022B345",
    "fee": 500,
    "token0": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "123352475905658304440",
    "verifiedReserve1": "374170608650676244",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xDD7CC9a0dA070fB8B60dC6680b596133fb4A7100",
    "fee": 3e3,
    "token0": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "1481457728158353181821",
    "verifiedReserve1": "2688396282227118368",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xA470a353577901AA8cDCb828BB616ef41d58B88a",
    "fee": 1e4,
    "token0": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "13920262518399146945660",
    "verifiedReserve1": "35145573798139944297",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xF34a455337252055B0398FB77a091eeBCEd36224",
    "fee": 100,
    "token0": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "8994571746",
    "verifiedReserve1": "392827503197233",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0xA8e0af24d703845504b0841e53777793Ea56120b",
    "fee": 500,
    "token0": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "288304424548",
    "verifiedReserve1": "14711015649021356",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x46bb6bb1b27069C652AA40ddbF47854b1C426428",
    "fee": 3e3,
    "token0": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "4303196526513",
    "verifiedReserve1": "468137319229272995",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155111,
    "address": "0x58D850667c47981a1b6E7cA0b8Dc2eb937Cd4119",
    "fee": 1e4,
    "token0": "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    "token1": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "verifiedReserve0": "730835354608815",
    "verifiedReserve1": "28105863939487609555",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155420,
    "address": "0xEB18BA6D2d8408A87EE5Ac4264C8dbb73ad538eb",
    "fee": 500,
    "token0": "0x4200000000000000000000000000000000000006",
    "token1": "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    "verifiedReserve0": "141435615166534429",
    "verifiedReserve1": "81514024",
    "verifiedAt": "2026-11-23"
  },
  {
    "chainId": 11155420,
    "address": "0x8955C97261722d87D83D00708Bbe5f6B5b4477d6",
    "fee": 3e3,
    "token0": "0x4200000000000000000000000000000000000006",
    "token1": "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    "verifiedReserve0": "3292538100106825",
    "verifiedReserve1": "413241",
    "verifiedAt": "2026-11-23"
  }
];
function poolsForChain(chainId) {
  return POOLS.filter((p) => p.chainId === chainId);
}

// node_modules/viem/_esm/index.js
init_exports();

// src/lib/opstack.ts
function getPortalAddress(chain) {
  const parent = chain.opStackParent;
  if (!parent) return null;
  const contracts2 = chain.viem.contracts;
  return contracts2?.portal?.[parent]?.address ?? null;
}
var portalAbi = parseAbi([
  "function depositTransaction(address _to, uint256 _value, uint64 _gasLimit, bool _isCreation, bytes _data) payable"
]);

// src/config/orbit.ts
var ORBIT_BRIDGES = {
  // Robinhood Chain Testnet — Arbitrum Orbit chain settling to Ethereum Sepolia.
  // https://docs.robinhood.com/chain/protocol-contracts/
  46630: {
    chainId: 46630,
    parentChainId: 11155111,
    rollup: "0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D",
    inbox: "0xF2939afA86F6f933A3CE17fCAB007907B6b0B7a4",
    bridge: "0x96295BDad104eaD97cC08797b3dC68efF59CcF30",
    outbox: "0x8D180Caf588f3Da027BEf1F42a106Da93F90b166",
    l1GatewayRouter: "0xF6F11aAEE80875776C264d93B37B34cE437382D1",
    l1Erc20Gateway: "0x52C2976cbDEf48BcC51d07d3c523769F76ECBd09",
    l1WethGateway: "0x8f8A6799F2b1978c6586318543c73D8Fb12f218f",
    l1Weth: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
    l2GatewayRouter: "0x77bF00A6A90c600f214b34BAFBB7918c0cF113A8",
    l2Weth: "0x7943e237c7F95DA44E0301572D358911207852Fa",
    source: "https://docs.robinhood.com/chain/protocol-contracts/"
  }
};
function orbitBridgeFor(chainId) {
  return ORBIT_BRIDGES[chainId] ?? null;
}

// src/lib/arbitrumOrbit.ts
var orbitInboxAbi = parseAbi([
  "function createRetryableTicket(address to, uint256 l2CallValue, uint256 maxSubmissionCost, address excessFeeRefundAddress, address callValueRefundAddress, uint256 gasLimit, uint256 maxFeePerGas, bytes data) payable returns (uint256)"
]);
var orbitRouterAbi = parseAbi([
  "function outboundTransfer(address _token, address _to, uint256 _amount, uint256 _maxGas, uint256 _gasPriceBid, bytes _data) payable returns (bytes)",
  "function getGateway(address l1Token) view returns (address)",
  "function defaultGateway() view returns (address)"
]);
var orbitGatewayAbi = parseAbi(["function calculateL2TokenAddress(address l1Token) view returns (address)"]);
var erc20ApproveAbi = parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]);
function orbitRouteExists(fromId, toId) {
  const cfg = orbitBridgeFor(toId);
  return Boolean(cfg) && cfg.parentChainId === fromId;
}

// src/lib/routes.ts
function assetKey(chainId, address) {
  const a = address.toLowerCase();
  const weth = WETH[chainId];
  if (weth && a === weth.toLowerCase()) return `${chainId}:${NATIVE_SENTINEL.toLowerCase()}`;
  return `${chainId}:${a}`;
}
function nativeOf(chainId) {
  return nativeToken(chainId);
}
function poolPairs(chainId) {
  return poolsForChain(chainId).map((p) => ({ a: p.token0, b: p.token1, fee: p.fee }));
}
function swapNeighbours(chainId, token) {
  const native = token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase();
  const key = native ? (WETH[chainId] ?? "").toLowerCase() : token.address.toLowerCase();
  if (!key) return [];
  const out = /* @__PURE__ */ new Map();
  for (const pair of poolPairs(chainId)) {
    let other = null;
    if (pair.a.toLowerCase() === key) other = pair.b;
    else if (pair.b.toLowerCase() === key) other = pair.a;
    if (!other) continue;
    const t2 = findToken(chainId, other);
    if (t2) out.set(assetKey(chainId, t2.address), t2);
  }
  return [...out.values()];
}
function bridgeEdges(chainId) {
  const chain = mustChain(chainId);
  const edges = [];
  if (chain.cctpDomain != null && chain.usdc) {
    const usdc = findToken(chainId, chain.usdc);
    for (const other of CHAINS) {
      if (other.id === chainId) continue;
      if (other.cctpDomain == null || !other.usdc) continue;
      edges.push({
        toChain: other.id,
        token: findToken(other.id, other.usdc),
        leg: { kind: "cctp", from: chainId, to: other.id, token: chain.usdc }
      });
      void usdc;
    }
  }
  for (const l2 of CHAINS) {
    if (l2.opStackParent !== chainId) continue;
    const portal = getPortalAddress(l2);
    if (!portal) continue;
    edges.push({
      toChain: l2.id,
      token: nativeOf(l2.id),
      leg: { kind: "portal", from: chainId, to: l2.id }
    });
  }
  for (const l2 of CHAINS) {
    if (!orbitRouteExists(chainId, l2.id)) continue;
    edges.push({
      toChain: l2.id,
      token: nativeOf(l2.id),
      leg: { kind: "arbitrum", from: chainId, to: l2.id }
    });
  }
  return edges;
}
function directRoute(fromId, toId, token) {
  if (fromId === toId) return null;
  const from = mustChain(fromId);
  const to = mustChain(toId);
  const dest = (() => {
    if (token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) {
      return to.viem.nativeCurrency.symbol === from.viem.nativeCurrency.symbol ? nativeOf(toId) : null;
    }
    if (token.kind === "usdc" && from.usdc && to.usdc) return findToken(toId, to.usdc) ?? null;
    return null;
  })();
  if (!dest) return null;
  if (token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) {
    if (to.opStackParent === fromId && getPortalAddress(to)) {
      return {
        id: `portal-${fromId}-${toId}`,
        type: "direct",
        legs: [{ kind: "portal", from: fromId, to: toId }],
        inToken: token,
        outToken: dest,
        txCount: 1,
        label: `${token.symbol} \u2192 Native bridge \u2192 ${dest.symbol}`,
        detail: `Canonical OP Stack deposit from ${from.short} into ${to.short}. Deposits are one-way; the 7-day withdrawal window is not offered.`
      };
    }
    if (orbitRouteExists(fromId, toId)) {
      return {
        id: `orbit-${fromId}-${toId}`,
        type: "direct",
        legs: [{ kind: "arbitrum", from: fromId, to: toId }],
        inToken: token,
        outToken: dest,
        txCount: 1,
        label: `${token.symbol} \u2192 Arbitrum bridge \u2192 ${dest.symbol}`,
        detail: `Canonical Arbitrum Orbit deposit from ${from.short} into ${to.short}. It is a retryable ticket: the sequencer usually redeems it within minutes, and the 7-day withdrawal window is not offered.`
      };
    }
    return null;
  }
  if (token.kind === "usdc" && from.cctpDomain != null && to.cctpDomain != null && from.usdc && to.usdc) {
    return {
      id: `cctp-${fromId}-${toId}`,
      type: "direct",
      legs: [{ kind: "cctp", from: fromId, to: toId, token: from.usdc }],
      inToken: token,
      outToken: dest,
      txCount: 2,
      label: `${token.symbol} \u2192 Circle CCTP \u2192 ${dest.symbol}`,
      detail: `Circle CCTP v2 burn-and-mint. You sign the burn, Circle attests, then you sign the mint on ${to.short}.`
    };
  }
  return null;
}
function findRoutes(fromId, toId, inToken, outToken) {
  if (fromId === toId) return [];
  const direct = directRoute(fromId, toId, inToken);
  const directId = direct && sameAsset(direct.outToken, outToken) ? direct.id : null;
  const goalKey = assetKey(toId, outToken.address);
  const found = [];
  const visited = /* @__PURE__ */ new Set();
  const queue = [{ chainId: fromId, token: inToken, legs: [] }];
  visited.add(assetKey(fromId, inToken.address));
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.legs.length >= 4) continue;
    for (const next of swapNeighbours(cur.chainId, cur.token)) {
      const curKey = assetKey(cur.chainId, cur.token.address);
      if (assetKey(cur.chainId, next.address) === curKey) continue;
      const pair = poolPairs(cur.chainId).find(
        (p) => p.a.toLowerCase() === cur.token.address.toLowerCase() && p.b.toLowerCase() === next.address.toLowerCase() || p.b.toLowerCase() === cur.token.address.toLowerCase() && p.a.toLowerCase() === next.address.toLowerCase() || curKey === assetKey(cur.chainId, p.a) && assetKey(cur.chainId, next.address) === assetKey(cur.chainId, p.b) || curKey === assetKey(cur.chainId, p.b) && assetKey(cur.chainId, next.address) === assetKey(cur.chainId, p.a)
      );
      if (!pair) continue;
      const tokenIn = cur.token.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase() ? WETH[cur.chainId] ?? cur.token.address : cur.token.address;
      const tokenOut = next.address;
      push(cur, { chainId: cur.chainId, token: next }, cur.legs.concat([{ kind: "swap", chainId: cur.chainId, tokenIn, tokenOut, fee: pair.fee }]), goalKey, visited, queue, found, fromId, toId, inToken, outToken);
    }
    for (const edge of bridgeEdges(cur.chainId)) {
      const leg = edge.leg;
      const curIsUsdc = cur.token.kind === "usdc";
      const curIsNative = assetKey(cur.chainId, cur.token.address) === assetKey(cur.chainId, NATIVE_SENTINEL);
      if (leg.kind === "cctp" && !curIsUsdc) continue;
      if (leg.kind === "portal" && !curIsNative) continue;
      if (leg.kind === "arbitrum" && !curIsNative) continue;
      if (assetKey(edge.toChain, edge.token.address) === assetKey(cur.chainId, cur.token.address) && edge.toChain === cur.chainId) continue;
      push(cur, { chainId: edge.toChain, token: edge.token }, cur.legs.concat([leg]), goalKey, visited, queue, found, fromId, toId, inToken, outToken);
    }
  }
  const seen = /* @__PURE__ */ new Set();
  const unique = found.filter((r) => {
    const sig = r.legs.map((l) => `${l.kind}:${l.kind === "swap" ? `${l.tokenIn}-${l.tokenOut}-${l.fee}` : `${l.from}-${l.to}`}`).join("|");
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
  if (direct && directId) {
    return [direct];
  }
  const all = unique.filter((r) => r.id !== directId);
  all.sort((a, b) => a.txCount - b.txCount);
  return all;
}
function push(cur, next, legs, goalKey, visited, queue, found, fromId, toId, inToken, outToken) {
  const pathKey = `${assetKey(next.chainId, next.token.address)}|${legs.map((l) => l.kind[0]).join("")}`;
  if (visited.has(pathKey)) return;
  visited.add(pathKey);
  const stateKey = assetKey(next.chainId, next.token.address);
  if (!visited.has(stateKey)) {
    visited.add(stateKey);
    queue.push({ chainId: next.chainId, token: next.token, legs });
  }
  if (assetKey(next.chainId, next.token.address) !== goalKey) return;
  const type = legs.length === 1 && (legs[0].kind === "cctp" || legs[0].kind === "portal" || legs[0].kind === "arbitrum") ? "direct" : "composite";
  const txCount = legs.length;
  found.push({
    id: `${type}-${legs.map((l) => `${l.kind}${l.kind === "swap" ? l.fee : ""}`).join("-")}-${fromId}-${toId}`,
    type,
    legs,
    inToken,
    outToken,
    txCount,
    label: describeLegs(legs, fromId, toId),
    detail: legs.length === 1 ? "Single verified operation." : "Composite route: every step below is a verified operation you sign yourself."
  });
}
function describeLegs(legs, fromId, toId) {
  const parts = [];
  for (const leg of legs) {
    if (leg.kind === "cctp") parts.push(`${getChain(leg.from)?.short} USDC \u2192 CCTP \u2192 ${getChain(leg.to)?.short} USDC`);
    else if (leg.kind === "portal") parts.push(`${getChain(leg.from)?.short} ETH \u2192 Native bridge \u2192 ${getChain(leg.to)?.short} ETH`);
    else if (leg.kind === "arbitrum") parts.push(`${getChain(leg.from)?.short} ETH \u2192 Arbitrum bridge \u2192 ${getChain(leg.to)?.short} ETH`);
    else {
      const a = findToken(leg.chainId, leg.tokenIn);
      const b = findToken(leg.chainId, leg.tokenOut);
      parts.push(`${a?.symbol ?? "?"} \u2192 ${b?.symbol ?? "?"} on ${getChain(leg.chainId)?.short}`);
    }
  }
  void fromId;
  void toId;
  return parts.join("  +  ");
}
function sameAsset(a, b) {
  return a.address.toLowerCase() === b.address.toLowerCase();
}
function hasAnyRoute(fromId, toId, token) {
  for (const dest of reachableDestTokens(fromId, toId, token)) {
    if (findRoutes(fromId, toId, token, dest).length > 0) return true;
  }
  return false;
}
function usableSourceTokens(fromId, toId) {
  const all = [...tokensForChain(fromId)];
  const native = nativeOf(fromId);
  const hasNative = all.some((t2) => t2.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase());
  const list = hasNative ? all : [native, ...all];
  return list.filter((t2) => hasAnyRoute(fromId, toId, t2));
}
function reachableDestTokens(fromId, toId, inToken) {
  const out = /* @__PURE__ */ new Map();
  const all = tokensForChain(toId);
  const native = nativeOf(toId);
  const candidates = all.some((t2) => t2.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) ? all : [...all, native];
  for (const t2 of candidates) {
    if (findRoutes(fromId, toId, inToken, t2).length === 0) continue;
    const key = assetKey(toId, t2.address);
    const prev = out.get(key);
    if (!prev || t2.address.toLowerCase() === NATIVE_SENTINEL.toLowerCase()) out.set(key, t2);
  }
  return [...out.values()];
}

// scripts/routes-check.ts
var N = (id) => nativeToken(id);
var U = (id) => USDC_OF(id);
var ARC_EURC = findToken(5042002, "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a");
var ARC_CIRBTC = findToken(5042002, "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF");
var CASES = [
  { name: "Sepolia ETH -> Base ETH", from: 11155111, to: 84532, in: N(11155111), out: N(84532), expect: "direct", expectTx: 1 },
  { name: "Sepolia USDC -> Base USDC", from: 11155111, to: 84532, in: U(11155111), out: U(84532), expect: "direct", expectTx: 2 },
  { name: "Sepolia USDC -> Base ETH", from: 11155111, to: 84532, in: U(11155111), out: N(84532), expect: "composite" },
  { name: "Sepolia USDC -> Arc USDC", from: 11155111, to: 5042002, in: U(11155111), out: U(5042002), expect: "direct", expectTx: 2 },
  { name: "Sepolia ETH -> Arc USDC", from: 11155111, to: 5042002, in: N(11155111), out: U(5042002), expect: "composite" },
  { name: "Arc USDC -> GIWA ETH", from: 5042002, to: 91342, in: U(5042002), out: N(91342), expect: "composite", expectTx: 3 },
  { name: "Arc EURC -> GIWA ETH", from: 5042002, to: 91342, in: ARC_EURC, out: N(91342), expect: "composite", expectTx: 4 },
  { name: "Arc cirBTC -> GIWA ETH", from: 5042002, to: 91342, in: ARC_CIRBTC, out: N(91342), expect: "none" },
  { name: "Base ETH -> GIWA ETH", from: 84532, to: 91342, in: N(84532), out: N(91342), expect: "composite", expectTx: 4 },
  { name: "Base USDC -> GIWA ETH", from: 84532, to: 91342, in: U(84532), out: N(91342), expect: "composite", expectTx: 3 },
  { name: "Sepolia ETH -> GIWA ETH", from: 11155111, to: 91342, in: N(11155111), out: N(91342), expect: "direct", expectTx: 1 },
  { name: "Robinhood -> GIWA (no provider)", from: 46630, to: 91342, in: N(46630), out: N(91342), expect: "none" },
  { name: "Sepolia ETH -> Robinhood ETH", from: 11155111, to: 46630, in: N(11155111), out: N(46630), expect: "direct", expectTx: 1 },
  { name: "Base ETH -> Robinhood ETH", from: 84532, to: 46630, in: N(84532), out: N(46630), expect: "composite", expectTx: 4 }
];
var pass = 0;
var failures = [];
console.log("=== Bridge route matrix ===");
for (const c of CASES) {
  const routes = findRoutes(c.from, c.to, c.in, c.out);
  const best = routes[0];
  const ok = c.expect === "none" ? routes.length === 0 : Boolean(best) && best.type === c.expect && (c.expectTx == null || best.txCount === c.expectTx);
  if (ok) pass++;
  else failures.push(c.name);
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${c.name.padEnd(32)} ${best ? `${best.type} tx=${best.txCount} | ${best.label}` : "NO ROUTE"}`
  );
}
console.log("\n=== route-aware selectors ===");
var sepBase = usableSourceTokens(11155111, 84532).map((t2) => t2.symbol);
console.log(`Sepolia -> Base usable sources: ${sepBase.join(", ")}`);
if (!sepBase.includes("ETH") || !sepBase.includes("USDC")) failures.push("Sepolia source list incomplete");
var baseGiwa = usableSourceTokens(84532, 91342).map((t2) => t2.symbol);
console.log(`Base -> GIWA usable sources: ${baseGiwa.join(", ") || "none"}`);
if (!baseGiwa.includes("USDC")) failures.push("Base -> GIWA should offer USDC");
var dests = reachableDestTokens(11155111, 84532, U(11155111)).map((t2) => t2.symbol);
console.log(`Sepolia USDC -> Base reachable destinations: ${dests.join(", ")}`);
if (!dests.includes("USDC") || !dests.includes("ETH")) failures.push("destination list incomplete");
console.log(`
=== ${pass}/${CASES.length} route checks passed ===`);
if (failures.length) {
  console.log("FAILED: " + failures.join(" | "));
  process.exit(1);
}
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
