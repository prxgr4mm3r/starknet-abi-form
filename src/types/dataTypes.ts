import * as Yup from 'yup';

export const ZERO = 0n;
export const MASK_250 = 2n ** 250n - 1n; // 2 ** 250 - 1
export const MASK_251 = 2n ** 251n;
export const P = 2n ** 251n + 17n * 2n ** 192n + 1n;

export const CoreTypes = [
  'core::felt252',
  'core::bool',
  'core::integer::u8',
  'core::integer::u16',
  'core::integer::u32',
  'core::integer::usize',
  'core::integer::u64',
  'core::integer::u128',
  'core::integer::u256',
  'core::integer::i8',
  'core::integer::i16',
  'core::integer::i32',
  'core::integer::i64',
  'core::integer::i128',
  'core::starknet::contract_address::ContractAddress',
  'core::starknet::class_hash::ClassHash',
  'core::starknet::eth_address::EthAddress',
  'core::starknet::storage_access::StorageAddress',
  'core::ByteArray',
];

export const isACoreType = (type: string): boolean => {
  if (type && typeof type === 'string') {
    return CoreTypes.includes(type);
  }

  return false;
};

export function isStringButNotDecimalOrHex(value: string) {
  if (typeof value === 'string') {
    if (!/^(?!0x[\da-fA-F]+$)(?!\d+(\.\d+)?$)/.test(value)) {
      return true;
    }
  }
  return false;
}

export function stringToUTF8Hex(inputString: string) {
  // Return empty string in case no string is input to the function params
  if (!inputString) return [];

  const utf8Hex = [];

  for (let i = 0; i < inputString.length; i++) {
    const charCode = inputString.charCodeAt(i);
    utf8Hex.push(charCode.toString(16));
  }

  return utf8Hex;
}

export function finalTransformedValue(value: string) {
  if (!isStringButNotDecimalOrHex(value) && typeof value === 'string') {
    if (value.length === 0) return '';
    return `0x${stringToUTF8Hex(value).join('')}`;
  }
  return value;
}

export function validateCoreType(type: string, val: string): boolean {
  const value = BigInt(finalTransformedValue(val));
  switch (type) {
    case 'core::integer::i8':
      return value <= 2n ** 7n - 1n && value >= -(2n ** 7n - 1n);
    case 'core::integer::i16':
      return value <= 2n ** 15n - 1n && value >= -(2n ** 15n - 1n);
    case 'core::integer::i32':
      return value <= 2n ** 31n - 1n && value >= -(2n ** 31n - 1n);
    case 'core::integer::i64':
      return value <= 2n ** 63n - 1n && value >= -(2n ** 63n - 1n);
    case 'core::integer::i128':
      return value <= 2n ** 127n - 1n && value >= -(2n ** 127n - 1n);
    default:
  }
  if (value < 0n) return false;
  switch (type) {
    case 'core::bool':
      return value <= 1;
    case 'core::integer::u8':
      return value <= 2n ** 8n - 1n;
    case 'core::integer::u16':
      return value <= 2n ** 16n - 1n;
    case 'core::integer::u32':
    case 'core::integer::usize':
      return value <= 2n ** 32n - 1n;
    case 'core::integer::u64':
      return value <= 2n ** 64n - 1n;
    case 'core::integer::u128':
      return value <= 2n ** 128n - 1n;
    case 'core::integer::u256':
      return value <= 2n ** 256n - 1n;
    case 'core::felt252':
      return value < P;
    case 'core::starknet::class_hash::ClassHash':
    case 'core::starknet::contract_address::ContractAddress':
    case 'core::starknet::eth_address::EthAddress':
    case 'core::starknet::storage_access::StorageAddress':
      // Contract Address must be less then felt252 range.
      return value <= P;
    case 'core::ByteArray':
      return true;
    default:
      return false;
  }
}

// Add Methods here
// @ts-ignore
Yup.addMethod(Yup.string, 'validate_core_type', function (type: string) {
  return this.test('check inputs', type, function (val) {
    const { createError } = this;
    if (val !== undefined) {
      try {
        const isValid = validateCoreType(type, val);
        if (!isValid) {
          return createError(
            new Yup.ValidationError(
              `${val} is not correct value for type ${type}`
            )
          );
        }
        return true;
      } catch (e: any) {
        return createError(new Yup.ValidationError(e?.message || e));
      }
    }
    return createError(new Yup.ValidationError('value is required'));
  });
});
