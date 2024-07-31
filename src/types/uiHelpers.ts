import * as Yup from 'yup';
import { ABIEnum, ABIFunctionInputs, ABIStruct } from '.';
import { isACoreType } from './dataTypes';
import { extractSubTypesFromType, hasArrayOfSubType } from './helper';

// name: {type: core | array | struct, validation: yupSchema, content: [] | {} | ''}

function functionFindFromStructs(structs: ABIStruct[], name: string) {
  if (name) {
    return structs.findIndex((struct) => struct?.name === name);
  }
  return -1;
}

function functionFindFromEnums(enums: ABIEnum[], name: string) {
  if (name) {
    return enums.findIndex((enm) => enm?.name === name);
  }
  return -1;
}

type UIType = {
  abi_type: string;
  content: string | any[] | {};
  type: 'core' | 'array' | 'struct' | 'enum';
  validationSchema?: null | Yup.AnySchema;
};
const expandStructsAndReduce = (
  struct: ABIStruct,
  structs: ABIStruct[],
  enums: ABIEnum[]
): UIType | {} => {
  if (struct && typeof struct === 'object') {
    if (
      struct.members &&
      Array.isArray(struct.members) &&
      struct.members.length > 0
    ) {
      return struct.members.reduce((pMember, cMember) => {
        if (isACoreType(cMember.type)) {
          return {
            ...pMember,
            [cMember.name]: {
              type: 'core',
              abi_type: cMember.type,
              validationSchema: Yup.string()
                .required()
                // @ts-expect-error because validate_core_type is not a function of Yup
                .validate_core_type(cMember.type),
              content: '',
            },
          };
        }
        if (hasArrayOfSubType(cMember.type)) {
          const isSubTypes = extractSubTypesFromType(cMember.type);
          if (isSubTypes && isSubTypes?.contains && isSubTypes?.types) {
            const subArrType = isSubTypes.types[0];
            // Is Array is of core type return,
            if (isACoreType(subArrType)) {
              return {
                ...pMember,
                [cMember.name]: {
                  type: 'array',
                  abi_type: cMember.type,
                  validationSchema: Yup.array(
                    Yup.string()
                      .required()
                      // @ts-expect-error because validate_core_type is not a function of Yup
                      .validate_core_type(subArrType)
                  ),
                  content: [''],
                },
              };
            }
            // Else call recursively
            const structArrIdx = functionFindFromStructs(structs, subArrType);
            if (structArrIdx > -1) {
              const reducedStruct = expandStructsAndReduce(
                structs[structArrIdx],
                structs,
                enums
              );

              return {
                ...pMember,
                [cMember.name]: {
                  type: 'array',
                  validationSchema: null,
                  abi_type: cMember.type,
                  content: [
                    {
                      ...reducedStruct,
                    },
                  ],
                },
              };
            }

            const enumArrIdx = functionFindFromEnums(enums, subArrType);

            if (enumArrIdx > -1) {
              const reducedEnum = expandEnumsAndReduce(
                enums[enumArrIdx],
                enums,
                structs
              );

              return {
                ...pMember,
                [cMember.name]: {
                  type: 'array',
                  validationSchema: null,
                  abi_type: cMember.type,
                  content: [
                    {
                      ...reducedEnum,
                    },
                  ],
                },
              };
            }

            return {
              ...pMember,
              [cMember.name]: {
                type: 'raw',
                abi_type: cMember.type,
                validationSchema: Yup.string(),
                content: '',
              },
            };
          }
        }

        const structIdx = functionFindFromStructs(structs, cMember.type);

        if (structIdx > -1) {
          const reducedStruct = expandStructsAndReduce(
            structs[structIdx],
            structs,
            enums
          );

          return {
            ...pMember,
            [cMember.name]: {
              type: 'struct',
              abi_type: cMember.type,
              validationSchema: null,
              content: {
                ...reducedStruct,
              },
            },
          };
        }

        const enumArrIdx = functionFindFromEnums(enums, cMember.type);

        if (enumArrIdx > -1) {
          const reducedEnum = expandEnumsAndReduce(
            enums[enumArrIdx],
            enums,
            structs
          );

          return {
            ...pMember,
            [cMember.name]: {
              type: 'enum',
              validationSchema: null,
              abi_type: cMember.type,
              content: {
                ...reducedEnum,
              },
            },
          };
        }

        return {
          ...pMember,
        };
      }, {});
    }
    return {};
  }
  return {};
};

export const expandEnumsAndReduce = (
  enumObj: ABIEnum,
  enums: ABIEnum[],
  structs: ABIStruct[]
): UIType | {} => {
  if (enumObj && typeof enumObj === 'object') {
    if (
      enumObj.variants &&
      Array.isArray(enumObj.variants) &&
      enumObj.variants.length > 0
    ) {
      console.log({ enumObj });
      return {
        selected: { type: enumObj.name, content: '' },
        variants: enumObj.variants.reduce((pMember, cMember) => {
          if (cMember.type === '()') {
            return {
              ...pMember,
              [cMember.name]: {
                type: '()',
                abi_type: cMember.type,
                validationSchema: null,
                content: '',
              },
            };
          }
          if (isACoreType(cMember.type)) {
            return {
              ...pMember,
              [cMember.name]: {
                type: 'core',
                abi_type: cMember.type,
                validationSchema: Yup.string()
                  .required()
                  // @ts-expect-error because validate_core_type is not a function of Yup
                  .validate_core_type(cMember.type),
                content: '',
              },
            };
          }
          if (hasArrayOfSubType(cMember.type)) {
            const isSubTypes = extractSubTypesFromType(cMember.type);
            if (isSubTypes && isSubTypes?.contains && isSubTypes?.types) {
              const subArrType = isSubTypes.types[0];
              // Is Array is of core type return,
              if (isACoreType(subArrType)) {
                return {
                  ...pMember,
                  [cMember.name]: {
                    type: 'array',
                    abi_type: cMember.type,
                    validationSchema: Yup.array(
                      Yup.string()
                        // @ts-expect-error because validate_core_type is not a function of Yup
                        .validate_core_type(subArrType)
                    ),
                    content: [''],
                  },
                };
              }
              // Else call recursively
              const structArrIdx = functionFindFromStructs(structs, subArrType);
              if (structArrIdx > -1) {
                const reducedStruct = expandStructsAndReduce(
                  structs[structArrIdx],
                  structs,
                  enums
                );

                return {
                  ...pMember,
                  [cMember.name]: {
                    type: 'array',
                    validationSchema: null,
                    abi_type: cMember.type,
                    content: [
                      {
                        $types: 'struct',
                        ...reducedStruct,
                      },
                    ],
                  },
                };
              }

              const enumArrIdx = functionFindFromEnums(enums, subArrType);

              if (enumArrIdx > -1) {
                const reducedEnum = expandEnumsAndReduce(
                  enums[enumArrIdx],
                  enums,
                  structs
                );

                return {
                  ...pMember,
                  [cMember.name]: {
                    type: 'array',
                    validationSchema: null,
                    abi_type: cMember.type,
                    content: [
                      {
                        $type: 'enum',
                        ...reducedEnum,
                      },
                    ],
                  },
                };
              }

              return {
                ...pMember,
                [cMember.name]: {
                  type: 'raw',
                  abi_type: cMember.type,
                  validationSchema: Yup.string(),
                  content: '',
                },
              };
            }
          }

          const structIdx = functionFindFromStructs(structs, cMember.type);

          if (structIdx > -1) {
            const reducedStruct = expandStructsAndReduce(
              structs[structIdx],
              structs,
              enums
            );

            return {
              ...pMember,
              [cMember.name]: {
                type: 'struct',
                abi_type: cMember.type,
                validationSchema: null,
                content: {
                  ...reducedStruct,
                },
              },
            };
          }

          const enumArrIdx = functionFindFromEnums(enums, cMember.type);

          if (enumArrIdx > -1) {
            const reducedEnum = expandEnumsAndReduce(
              enums[enumArrIdx],
              enums,
              structs
            );

            return {
              ...pMember,
              [cMember.name]: {
                type: 'enum',
                validationSchema: null,
                abi_type: cMember.type,
                content: {
                  ...reducedEnum,
                },
              },
            };
          }

          return {
            ...pMember,
          };
        }, {}),
      };
    }
    return {};
  }
  return {};
};

export const reduceFunctionInputs = (
  inputs: ABIFunctionInputs[],
  structs: ABIStruct[],
  enums: ABIEnum[]
): UIType | {} =>
  inputs?.reduce((p, c) => {
    if (isACoreType(c.type)) {
      return {
        ...p,
        [c.name]: {
          type: 'core',
          abi_type: c.type,
          validationSchema: Yup.string()
            .required()
            // @ts-expect-error because validate_core_type is not a function of Yup
            .validate_core_type(c.type),
          content: '',
        },
      };
    }

    if (hasArrayOfSubType(c.type)) {
      const isSubTypes = extractSubTypesFromType(c.type);
      if (isSubTypes && isSubTypes?.contains && isSubTypes?.types) {
        const subArrType = isSubTypes.types[0];
        console.log({ c });
        if (isACoreType(subArrType)) {
          return {
            ...p,
            [c.name]: {
              type: 'array',
              abi_type: c.type,
              validationSchema: Yup.array(
                Yup.string()
                  .required()
                  // @ts-expect-error because validate_core_type is not a function of Yup
                  .validate_core_type(subArrType)
              ),
              content: [''],
            },
          };
        }
        const structArrIdx = functionFindFromStructs(structs, subArrType);

        if (structArrIdx > -1) {
          const reducedStruct = expandStructsAndReduce(
            structs[structArrIdx],
            structs,
            enums
          );
          return {
            ...p,
            [c.name]: {
              type: 'array',
              validationSchema: null,
              abi_type: c.type,
              content: [
                {
                  $type: 'struct',
                  ...reducedStruct,
                },
              ],
            },
          };
        }

        const enumArrIdx = functionFindFromEnums(enums, subArrType);

        if (enumArrIdx > -1) {
          const reducedEnum = expandEnumsAndReduce(
            enums[enumArrIdx],
            enums,
            structs
          );
          return {
            ...p,
            [c.name]: {
              type: 'array',
              validationSchema: null,
              abi_type: c.type,
              content: [
                {
                  $type: 'enum',
                  ...reducedEnum,
                },
              ],
            },
          };
        }

        return {
          ...p,
          [c.name]: {
            type: 'raw',
            abi_type: c.type,
            validationSchema: Yup.string().required(),
            content: '',
          },
        };
      }
    }

    const structIdx = functionFindFromStructs(structs, c.type);

    if (structIdx > -1) {
      const reducedStruct = expandStructsAndReduce(
        structs[structIdx],
        structs,
        enums
      );
      return {
        ...p,
        [c.name]: {
          type: 'struct',
          abi_type: c.type,
          validationSchema: null,
          content: {
            ...reducedStruct,
          },
        },
      };
    }

    const enumIdx = functionFindFromEnums(enums, c.type);

    if (enumIdx > -1) {
      const reducedEnum = expandEnumsAndReduce(enums[enumIdx], enums, structs);
      return {
        ...p,
        [c.name]: {
          type: 'enum',
          abi_type: c.type,
          validationSchema: null,
          content: {
            ...reducedEnum,
          },
        },
      };
    }

    return {
      ...p,
    };
  }, {});

export function extractInitialValues(values: UIType | {}): {} {
  if (typeof values === 'object' && Object.keys(values).length > 0) {
    return Object.keys(values).reduce((p, c) => {
      // @ts-ignore
      const currentObj = values[c];
      // console.log(currentObj);
      if (currentObj?.type === 'core') {
        return {
          ...p,
          [c]: currentObj?.content,
        };
      }

      if (currentObj?.type === 'struct') {
        return {
          ...p,
          [c]: extractInitialValues(currentObj?.content),
        };
      }

      if (currentObj?.type === 'enum') {
        return {
          ...p,
          [c]: {
            $type: 'enum',
            selected: currentObj?.content.selected.content,
            variants: extractInitialValues(currentObj?.content.variants),
          },
        };
      }

      if (currentObj?.type === 'array') {
        if (currentObj?.content.length > 0) {
          // We can safely take 0th object from array since
          // we have assigned in our default parsing for presenting arrays.
          if (typeof currentObj?.content[0] === 'string') {
            return {
              ...p,
              [c]: [''],
            };
          }
          if (
            Object.keys(currentObj?.content[0]).includes('$type') &&
            Object.values(currentObj?.content[0])[0] === 'enum'
          ) {
            return {
              ...p,
              [c]: [
                {
                  $type: 'enum',
                  selected: currentObj?.content[0].selected.content,
                  variants: extractInitialValues(
                    currentObj?.content[0].variants
                  ),
                },
              ],
            };
          }
          return {
            ...p,
            [c]: [extractInitialValues(currentObj?.content[0])],
          };
        }
        return {
          ...p,
          [c]: [''],
        };
      }

      if (currentObj?.type === '()') {
        return {
          ...p,
          [c]: '',
        };
      }

      return {
        ...p,
      };
    }, {});
  }
  return {};
}

export function extractValidationSchema(values: UIType | {}): {} {
  if (typeof values === 'object' && Object.keys(values).length > 0) {
    return Object.keys(values).reduce((p, c) => {
      // @ts-ignore
      const currentObj = values[c];
      //   console.log(currentObj);
      if (currentObj?.type === 'core' || currentObj?.type === '()') {
        return {
          ...p,
          [c]: currentObj?.validationSchema,
        };
      }

      if (currentObj?.type === 'struct') {
        return {
          ...p,
          [c]: Yup.object(extractValidationSchema(currentObj?.content)),
        };
      }

      if (currentObj?.type === 'enum') {
        return {
          ...p,
          [c]: Yup.object().shape({
            selected: Yup.string().required(),
            variants: Yup.object(),
          }),
        };
      }

      if (currentObj?.type === 'array') {
        // We can safely take 0th object from array since
        // we have assigned in our default parsing for presenting arrays.
        return {
          ...p,
          [c]: currentObj?.validationSchema
            ? currentObj?.validationSchema
            : Yup.array(
                Yup.object(extractValidationSchema(currentObj?.content[0]))
              ).required(),
        };
      }

      return {
        ...p,
      };
    }, {});
  }
  return {};
}

export function extractAbiTypes(values: UIType | {}): {} {
  if (typeof values === 'object' && Object.keys(values).length > 0) {
    return Object.keys(values).reduce((p, c) => {
      // @ts-ignore
      const currentObj = values[c];

      if (currentObj?.type === 'core' || currentObj?.type === '()') {
        return {
          ...p,
          [c]: currentObj?.abi_type,
        };
      }

      if (currentObj?.type === 'struct') {
        return {
          ...p,
          [c]: extractAbiTypes(currentObj?.content),
        };
      }

      if (currentObj?.type === 'enum') {
        return {
          ...p,
          [c]: {
            $type: 'enum',
            selected: currentObj?.abi_type,
            variants: extractAbiTypes(currentObj?.content.variants),
          },
        };
      }

      if (currentObj?.type === 'array') {
        // We can safely take 0th object from array since
        // we have assigned in our default parsing for presenting arrays.
        if (
          currentObj?.content.length > 0 &&
          typeof currentObj?.content[0] === 'object'
        ) {
          if (Object.values(currentObj?.content[0])[0] === 'enum') {
            return {
              ...p,
              [c]: [
                {
                  $type: Object.values(currentObj?.content[0])[0],
                  selected: currentObj?.content[0].selected.type,
                  variants: extractAbiTypes(currentObj?.content[0].variants),
                },
              ],
            };
          }
          return {
            ...p,
            [c]: [{ ...extractAbiTypes(currentObj?.content[0]) }],
          };
        }
        const { contains, types } = extractSubTypesFromType(
          currentObj?.abi_type
        );
        if (contains && types && types?.length > 0) {
          return {
            ...p,
            [c]: [types[0]],
          };
        }
        return {
          ...p,
          [c]: [currentObj?.abi_type],
        };
      }

      return {
        ...p,
      };
    }, {});
  }
  return {};
}
