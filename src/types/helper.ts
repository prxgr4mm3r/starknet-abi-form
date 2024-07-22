import _ from 'lodash';
import { ABI, ABIFunction, ABIStruct, ABIEnum } from '.';
import { finalTransformedValue } from './dataTypes';

export function extractFunctionFromRawAbi(abi: ABI, functions: ABIFunction[]) {
  // Considering any here because it can be any of types.
  let lFunctions = [...functions];
  abi?.forEach((item: any) => {
    if (typeof item === 'object' && item.type && item.type === 'function') {
      lFunctions = [...lFunctions, item];
    }
    // As per specifications, only interface can have functions inside them other then root level abi with key `items`
    if (
      typeof item === 'object' &&
      item.type &&
      item.type === 'interface' &&
      item.items &&
      Array.isArray(item.items)
    ) {
      lFunctions = [...lFunctions, ...item.items];
    }
  });
  return lFunctions;
}

type ReturnFunctions = {
  externalFunctions: ABIFunction[];
  viewFunctions: ABIFunction[];
};

export function extractConstructorFromRawAbi(abi: ABI): ReturnConstructor {
  const constructor = abi?.find(
    (item: any) => item.type && item.type === 'constructor'
  );
  if (constructor) {
    return constructor as ReturnConstructor;
  }
  return {
    type: 'constructor',
    name: 'constructor',
    inputs: [],
  };
}

interface ReturnConstructor {
  inputs: { name: string; type: string }[];
  name: string;
  type: string;
}

export const convertConstructorToFunction = (
  constructor: ReturnConstructor
): ABIFunction => ({
  type: constructor.type,
  name: constructor.name,
  inputs: constructor.inputs,
  outputs: [],
  state_mutability: 'external',
});

export const EMPTY_CONSTRUCTOR_FUNCTION: ABIFunction = {
  type: 'constructor',
  name: 'constructor',
  inputs: [],
  outputs: [],
  state_mutability: 'external',
};

export function segregateViewAndExternalFunctions(
  functions: ABIFunction[]
): ReturnFunctions {
  const viewFunctions: ABIFunction[] = [];
  const externalFunctions: ABIFunction[] = [];

  if (Array.isArray(functions)) {
    functions.forEach((fn) => {
      if (fn && typeof fn === 'object' && fn.state_mutability === 'view') {
        viewFunctions.push(fn);
      }
      if (fn && typeof fn === 'object' && fn.state_mutability === 'external') {
        externalFunctions.push(fn);
      }
    });
  }

  return {
    viewFunctions,
    externalFunctions,
  };
}

export function extractStructFromABI(abi: ABI) {
  const structs: ABIStruct[] = [];
  abi?.forEach((item: any) => {
    if (typeof item === 'object' && item.type && item.type === 'struct') {
      structs.push(item);
    }
  });
  return structs;
}

export function extractEnumFromABI(abi: ABI) {
  const enums: ABIEnum[] = [];
  abi?.forEach((item: any) => {
    if (typeof item === 'object' && item.type && item.type === 'enum') {
      enums.push(item);
    }
  });
  return enums;
}

export function extractEnumsFromABI(abi: ABI) {
  const enums: ABIEnum[] = [];
  abi?.forEach((item: any) => {
    if (typeof item === 'object' && item.type && item.type === 'enum') {
      enums.push(item);
    }
  });
  return enums;
}

type ReturnExtractedSubTypes = {
  contains: boolean;
  types?: string[];
};

export function hasSubTypes(type: string): boolean {
  const regex = /<[^<>]*>/g;
  if (type && typeof type === 'string') {
    return regex.test(type);
  }
  return false;
}

export function hasArrayOfSubType(type: string): boolean {
  const regex = /^core::array/g;
  if (type && typeof type === 'string') {
    return regex.test(type);
  }
  return false;
}

export function extractSubTypesFromType(type: string): ReturnExtractedSubTypes {
  const regex = /<[^<>]*>/g;
  if (type) {
    if (hasSubTypes(type)) {
      const matches = type.match(regex) || [];
      const finalMatch = matches.map((lType) =>
        lType.substring(1, lType.length - 1)
      );
      if (matches.length === 0) {
        return {
          contains: false,
        };
      }
      return {
        contains: true,
        types: finalMatch,
      };
    }
  }
  return {
    contains: false,
  };
}

export const flattenArrays = (value: any) => _.flattenDeep(value);

export const transformStringArrayToInteger = (value: string[]): bigint[] =>
  value.map((lValue) => {
    if (typeof lValue === 'string') {
      return BigInt(lValue);
    }
    return lValue;
  });

// export function finalizeValues(value: any): any {
//   if (typeof value === 'string') {
//     return finalTransformedValue(value);
//   }
//
//   if (Array.isArray(value)) {
//     return value.map((val) => {
//       if (typeof val === 'string') {
//         return finalTransformedValue(val);
//       }
//       return finalizeValues(val);
//     });
//   }
//
//   if (typeof value === 'object') {
//     return Object.keys(value).reduce((prev, key) => {
//       const curr = value[key];
//       const currFVal = finalizeValues(curr);
//       return {
//         ...prev,
//         [key]: currFVal,
//       };
//     }, {});
//   }
//   return value;
// }

export function finalizeValues(val: any, type: string): any {
  if (typeof val === 'object') {
    return Object.keys(val).reduce((prev, key) => {
      const curr = val[key];
      const currFVal = finalizeValues(curr, type);
      return {
        ...prev,
        [key]: currFVal,
      };
    }, {});
  }
  // const value = BigInt(finalTransformedValue(val));
  // console.log(typeof value);
  // if (type.startsWith('core::integer::u256')) {
  //   const first = value && 2n ** 128n;
  //   const binary = value.toString(2);
  //   const second = binary.slice(0, 128);
  //   console.log('u256 serialize: ', first, second, binary);
  // } else if (
  //   type.startsWith('core::integer::u') ||
  //   type.startsWith('core::felt252')
  // ) {
  //   // todo
  // } else if (type.startsWith('core::integer::i')) {
  //   // todo
  // }
  if (typeof val === 'string') {
    return finalTransformedValue(val);
  }

  if (Array.isArray(val)) {
    return val.map((v) => {
      if (typeof v === 'string') {
        return finalTransformedValue(v);
      }
      return finalizeValues(v, type);
    });
  }
  return val;
}

export function flattenToRawCallData(value: any): any {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return [
      value.length,
      ...value.map((lValue) => {
        if (typeof lValue === 'string') {
          return lValue;
        }
        return flattenToRawCallData(lValue);
      }),
    ];
  }
  if (typeof value === 'object') {
    return Object.keys(value).map((key) => {
      const curr = value[key];
      return flattenToRawCallData(curr);
    });
  }
  return '';
}
