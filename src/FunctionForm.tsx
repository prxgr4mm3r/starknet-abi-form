import React, { useState } from 'react';
import Select from 'react-select';

import * as Yup from 'yup';
import { Formik, FormikErrors, FormikProps } from 'formik';
import loadashFp from 'lodash';
import { ABIEnum, ABIFunction, ABIStruct, yupAbiFunctionSchema } from './types';

import './FunctionForm.css';
import {
  extractAbiTypes,
  extractInitialValues,
  extractValidationSchema,
  reduceFunctionInputs,
} from './types/uiHelpers';
import {
  AccordionRoot,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './UIComponents/Accordian/Accordian';
import { Button, ButtonColorsClasses } from './UIComponents/Button/Button';
import Tag, { TagColors } from './UIComponents/Tag/Tag';
import {
  finalizeValues,
  flattenArrays,
  flattenToRawCallData,
  transformStringArrayToInteger,
} from './types/helper';
import { CallbackReturnType } from './ABIForm';
import { finalTransformedValue } from './types/dataTypes';
import { Content, Portal, Root, Trigger } from './UIComponents/Tooltip/Tooltip';

const typeToTagColor = (name: string): TagColors => {
  try {
    const pathNames = name?.split('::');
    const coreType = pathNames[pathNames.length - 1];
    // console.log({pathNames, coreType})
    switch (coreType) {
      case 'u8':
      case 'u16':
      case 'u32':
      case 'u64':
      case 'u128':
      case 'u256':
        return 'green';
      case 'i8':
      case 'i16':
      case 'i32':
      case 'i64':
      case 'i128':
        return 'blue';
      case 'bool':
        return 'indigo';
      case 'felt252':
        return 'yellow';
      case 'ContractAddress':
        return 'pink';
      case 'ByteArray':
        return 'purple';
      default:
        return 'gray';
    }
  } catch (e) {
    return 'gray';
  }
};

type IParseInputFieldsFromObject = {
  abiTypes: Record<string, string | {} | Array<{}>>;
  errors: Record<string, string | {} | Array<{}>>;
  handleArrayPop: (
    path: string[],
    index: number,
    props: FormikProps<any>
  ) => void;
  handleArrayPush: (
    path: string[],
    value: string | {},
    props: FormikProps<any>
  ) => void;
  handleChange: (e: React.ChangeEvent<any>) => any;
  initialValues: Record<string, string | {} | Array<{}>>;
  parentKeys?: string[];
  props: FormikProps<any>;
  setFieldValue: (
    field: string,
    value: any,
    shouldValidate?: boolean | undefined
  ) => Promise<void | FormikErrors<{}>>;
  values: Record<string, string | {} | Array<{}>>;
};
const ParseInputFieldsFromObject: React.FC<IParseInputFieldsFromObject> = ({
  values,
  errors,
  abiTypes,
  initialValues,
  parentKeys,
  handleChange,
  handleArrayPush,
  handleArrayPop,
  setFieldValue,
  props,
}) => {
  if (typeof values === 'object') {
    const keys = Object.keys(values);
    // console.log('Values on parse from object:', values);

    return keys.map((key) => {
      const currentValueObject = values[key];
      // console.log({ currentValueObject, parentKeys });
      const fullPath = parentKeys ? [...parentKeys, key] : [key];
      // console.log({ fullPath });
      // Since Type conform to initial state,
      // For arrays index 0 will have the valid type.
      const initialFullPath = fullPath.map((pathItem) => {
        if (Number.isNaN(parseInt(pathItem, 10))) {
          return pathItem;
        }
        return '0';
      });

      let abiTypeInfo = '';

      if (typeof currentValueObject === 'string') {
        let name =
          parentKeys && parentKeys?.length > 0
            ? parentKeys?.reduce((p, c) => {
                if (Number.isNaN(parseInt(c, 10))) {
                  return `${p}.${c}`;
                }
                return `${p}[${c}]`;
              }, '')
            : '';
        if (name.length > 0 && name.startsWith('.')) {
          name = name.slice(1);
        }
        // console.log({ name });
        // console.log({ has: loadashFp.has(abiTypes, initialFullPath) });
        if (loadashFp.has(abiTypes, initialFullPath)) {
          abiTypeInfo = loadashFp.get(abiTypes, initialFullPath);
        }
        // console.log({ abiTypeInfo });
        // console.log({ initialFullPath });
        let error = '';

        if (loadashFp.has(errors, fullPath)) {
          error = loadashFp.get(errors, fullPath);
        }

        return (
          <div
            className="my-2 w-full px-2 py-1 border-gray-200 border-2 rounded function-form-input-wrapper"
            key={fullPath?.join('|')}
          >
            <label
              htmlFor={`${name ? `${name}.` : ''}${key}`}
              className="block mb-2 text-sm font-medium input-label"
            >
              {`${name ? `${name}.` : ''}${key}`}
              <Tag
                style={{ marginLeft: '1rem' }}
                tag={typeToTagColor(abiTypeInfo)}
                className="input-tag"
              >
                {abiTypeInfo}
              </Tag>
            </label>
            <input
              type="text"
              id={`${name ? `${name}.` : ''}${key}`}
              name={`${name ? `${name}.` : ''}${key}`}
              placeholder={`${name ? `${name}.` : ''}${key}`}
              value={currentValueObject}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 function-form-input"
              onChange={handleChange}
            />
            <Root>
              <Trigger>
                <p className="tooltip-input-final-value">
                  {finalTransformedValue(currentValueObject)}
                </p>
              </Trigger>
              <Portal>
                <Content>
                  <p className="tooltip-input-text-hint">
                    Finalized Value which will go for to contract
                  </p>
                </Content>
              </Portal>
            </Root>
            <p className="input-error">{error}</p>
          </div>
        );
      }
      if (
        typeof currentValueObject === 'object' &&
        !Array.isArray(currentValueObject)
      ) {
        let lParentKeys = parentKeys ? [...parentKeys, key] : [key];
        if (loadashFp.has(abiTypes, initialFullPath)) {
          abiTypeInfo = loadashFp.get(abiTypes, initialFullPath);
        }
        // console.log({ abiTypes, initialFullPath, abiTypeInfo });
        if (Object.keys(abiTypeInfo).includes('$type')) {
          lParentKeys = [...lParentKeys, 'variants'];

          let name =
            parentKeys && parentKeys?.length > 0
              ? parentKeys?.reduce((p, c) => {
                  if (Number.isNaN(parseInt(c, 10))) {
                    return `${p}.${c}`;
                  }
                  return `${p}[${c}]`;
                }, '')
              : '';
          if (name.length > 0 && name.startsWith('.')) {
            name = name.slice(1);
          }

          const options = [{ value: '', label: 'Select an option' }];
          Object.entries(Object.entries(abiTypeInfo)[2][1]).forEach(
            ([k, val]) => options.push({ value: k, label: `${k}(${val})` })
          );
          // console.log(
          //   'currentValueObject when parsing enum:',
          //   currentValueObject
          // );
          let newValues = {};
          Object.entries(Object.values(currentValueObject)[1]).forEach(
            ([k, v]) => {
              const abiEntries = Object.entries(Object.values(abiTypeInfo)[2]);
              const variantAbi = abiEntries.find((entry) => entry[0] === k);
              if (
                Object.values(currentValueObject)[0] === k &&
                variantAbi &&
                variantAbi[1] !== '()'
              ) {
                newValues = {
                  ...newValues,
                  [k]: v,
                };
                props.registerField(
                  `${name ? `${name}.` : ''}${key}.variants.${variantAbi[0]}`,
                  {
                    validate: (value) => {
                      if (value === '') {
                        return `${
                          name ? `${name}.` : ''
                        }${key} is a required field`;
                      }
                      return '';
                    },
                  }
                );
              } else if (variantAbi) {
                props.unregisterField(
                  `${name ? `${name}.` : ''}${key}.variants.${variantAbi[0]}`
                );
              }
            }
          );
          const selectError = props.getFieldMeta(
            `${name ? `${name}.` : ''}${key}.selected`
          ).error;
          // console.log({
          //   newValues,
          //   abi: Object.entries(Object.values(abiTypeInfo)[2]),
          // });
          return (
            <div
              className="w-full flex flex-col shadow-md shadow-green-500 rounded p-2 my-2 bg-green-50 function-struct"
              key={lParentKeys.join('|')}
            >
              <p className="text-xl font-bold function-struct-header">
                {typeof currentValueObject === 'object'
                  ? (Object.entries(abiTypeInfo)[1][1] as string)
                  : ''}{' '}
                : {key}
              </p>
              <div
                className="my-2 w-full px-2 py-1 border-gray-200 border-2 rounded function-form-input-wrapper"
                key={fullPath?.join('|')}
              >
                <label
                  htmlFor={`${name ? `${name}.` : ''}${key}.selected}`}
                  className="block mb-2 text-sm font-medium input-label"
                >
                  {`${name ? `${name}.` : ''}${key}.selected`}
                  <Tag
                    style={{ marginLeft: '1rem' }}
                    tag={typeToTagColor(Object.entries(abiTypeInfo)[1][1])}
                    className="input-tag"
                  >
                    {Object.entries(abiTypeInfo)[1][1]}
                  </Tag>
                </label>
                <Select
                  options={options}
                  onChange={(value) =>
                    setFieldValue(
                      `${name ? `${name}.` : ''}${key}.selected`,
                      value?.value
                    )
                  }
                />
                <ParseInputFieldsFromObject
                  values={{ ...newValues }}
                  errors={errors}
                  initialValues={initialValues}
                  abiTypes={abiTypes}
                  parentKeys={lParentKeys}
                  handleChange={handleChange}
                  handleArrayPush={handleArrayPush}
                  handleArrayPop={handleArrayPop}
                  setFieldValue={setFieldValue}
                  props={props}
                />
                <Root>
                  <Portal>
                    <Content>
                      <p className="tooltip-input-text-hint">
                        Finalized Value which will go for to contract
                      </p>
                    </Content>
                  </Portal>
                </Root>
                <p className="input-error">{selectError}</p>
              </div>
            </div>
          );
        }
        return (
          <div
            className="w-full flex flex-col shadow-md shadow-green-500 rounded p-2 my-2 bg-green-50 function-struct"
            key={lParentKeys.join('|')}
          >
            <p className="text-xl font-bold function-struct-header">
              struct: {key}
            </p>
            <ParseInputFieldsFromObject
              values={{ ...currentValueObject }}
              errors={errors}
              initialValues={initialValues}
              abiTypes={abiTypes}
              parentKeys={lParentKeys}
              handleChange={handleChange}
              handleArrayPush={handleArrayPush}
              handleArrayPop={handleArrayPop}
              setFieldValue={setFieldValue}
              props={props}
            />
          </div>
        );
      }
      if (Array.isArray(currentValueObject)) {
        const pathKeys = parentKeys ? [...parentKeys, key] : [key];
        const initialArrPath = pathKeys.map((pathItem) => {
          if (Number.isNaN(parseInt(pathItem, 10))) {
            return pathItem;
          }
          return '0';
        });
        let initialObj = '';
        if (loadashFp.has(initialValues, initialArrPath)) {
          const initalArr = loadashFp.get(initialValues, initialArrPath);
          if (initalArr && Array.isArray(initalArr) && initalArr.length > 0) {
            [initialObj] = initalArr;
          }
        }

        const [accordianTabsState, setAccordianTabsState] = useState<string[]>(
          (): string[] => {
            const retArr = currentValueObject
              ? currentValueObject?.map((_, index) => {
                  const lParentKeys = parentKeys
                    ? [...parentKeys, key, index.toString()]
                    : [key, index.toString()];
                  return lParentKeys.join('|');
                })
              : [];
            return retArr;
          }
        );

        return (
          <AccordionRoot
            type="multiple"
            key={`accordion-root|${pathKeys.join('|')}`}
            className="w-full shadow-sm shadow-purple-500 p-2 rounded bg-purple-50 function-array-root"
            value={accordianTabsState}
            onValueChange={(value) => {
              const diff = loadashFp.difference(accordianTabsState, value);
              if (diff.length > 0) {
                const filteredAccordianTabsState = accordianTabsState.filter(
                  (activeTab) => !diff.includes(activeTab)
                );
                setAccordianTabsState([...filteredAccordianTabsState]);
                return;
              }
              setAccordianTabsState([...accordianTabsState, ...value]);
            }}
          >
            <div className="flex justify-between items-center function-array-header">
              <h5 className="text-xl array-title">Array: {key}</h5>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleArrayPush(pathKeys, initialObj, props);
                }}
                className="array-add"
              >
                ADD +
              </Button>
            </div>
            {currentValueObject?.map((obj, index) => {
              const lParentKeys = parentKeys
                ? [...parentKeys, key, index.toString()]
                : [key, index.toString()];

              if (typeof obj === 'string') {
                // In this case it is an array of coreDataType, so don't have to call recursively here.
                // Stop Condition

                let name =
                  lParentKeys && lParentKeys?.length > 0
                    ? lParentKeys?.reduce((p, c) => {
                        if (Number.isNaN(parseInt(c, 10))) {
                          return `${p}.${c}`;
                        }
                        return `${p}[${c}]`;
                      }, '')
                    : '';
                if (name.length > 0 && name.startsWith('.')) {
                  name = name.slice(1);
                }
                let error = '';
                let coreArrAbiTypeInfo = '';

                if (loadashFp.has(errors, fullPath)) {
                  error = loadashFp.get(errors, fullPath);
                }

                // Since Type conform to initial state,
                // For arrays index 0 will have the valid type.
                const initialFullPathCoreArr = fullPath.map((pathItem) => {
                  if (Number.isNaN(parseInt(pathItem, 10))) {
                    return pathItem;
                  }
                  return '0';
                });
                if (loadashFp.has(abiTypes, initialFullPathCoreArr)) {
                  coreArrAbiTypeInfo = loadashFp.get(
                    abiTypes,
                    initialFullPathCoreArr
                  );
                }

                return (
                  <div
                    className="w-full flex flex-col items-end shadow-md shadow-green-500 rounded p-2 bg-green-50 my-2 array-core-item"
                    key={fullPath.join('|')}
                  >
                    <Button
                      className="w-max array-core-item-delete"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArrayPop(pathKeys, index, props);
                      }}
                    >
                      DELETE
                    </Button>
                    <div className="my-2 w-full px-2 py-1 border-gray-200 border-2 rounded function-form-input-wrapper">
                      <label
                        htmlFor={`${name}`}
                        className="block mb-2 text-sm font-medium input-label"
                      >
                        {`${name}`}{' '}
                        <Tag
                          style={{ marginLeft: '1rem' }}
                          tag={typeToTagColor(coreArrAbiTypeInfo)}
                          className="input-tag"
                        >
                          {coreArrAbiTypeInfo}
                        </Tag>{' '}
                      </label>
                      <input
                        type="text"
                        name={`${name}`}
                        id={`${name}`}
                        value={obj}
                        placeholder={`${name}`}
                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 function-form-input"
                        onChange={handleChange}
                      />
                      <p className="input-error">{error}</p>
                    </div>
                  </div>
                );
              }

              return (
                <AccordionItem
                  value={lParentKeys.join('|')}
                  className="w-full flex flex-col shadow-md shadow-green-500 rounded p-2 bg-green-50 my-2 array-complex-item"
                  key={lParentKeys.join('|')}
                >
                  <AccordionTrigger className="w-full hover:shadow-md hover:bg-slate-50 rounded array-complex-item-trigger">
                    <div className="flex justify-between items-center w-full px-2">
                      <p className="text-xl font-bold array-complex-item-header">
                        {index + 1}. struct: {key}
                      </p>
                      <div
                        className={`${ButtonColorsClasses.red} array-complex-item-delete`}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArrayPop(pathKeys, index, props);
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          handleArrayPop(pathKeys, index, props);
                        }}
                      >
                        DELETE -
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="array-complex-item-content">
                    <ParseInputFieldsFromObject
                      values={{ ...obj }}
                      errors={errors}
                      initialValues={initialValues}
                      abiTypes={abiTypes}
                      parentKeys={lParentKeys}
                      handleChange={handleChange}
                      handleArrayPush={handleArrayPush}
                      handleArrayPop={handleArrayPop}
                      setFieldValue={setFieldValue}
                      props={props}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </AccordionRoot>
        );
      }
      return '';
    });
  }
  return <p className="failed-parse-type">Could not parse type!!</p>;
};

type IFunctionForm = {
  buttonLabel?: string;
  callbackFn: (value: CallbackReturnType) => void;
  enums: ABIEnum[];
  functionAbi: ABIFunction;
  response?: React.ReactNode;
  structs: ABIStruct[];
};

const FunctionForm: React.FC<IFunctionForm> = ({
  functionAbi,
  structs,
  callbackFn,
  response,
  buttonLabel,
  enums,
}) => {
  // Check if functionAbi is correct with yup validation schema
  try {
    yupAbiFunctionSchema.validateSync(functionAbi);
  } catch (e) {
    console.error(e);
    return (
      <p className="invalid-abi">
        Not a valid function ABI {JSON.stringify(functionAbi)}
      </p>
    );
  }

  const initialValuesMap = reduceFunctionInputs(
    functionAbi?.inputs,
    structs,
    enums
  );
  // Freezing object, as these are reference maps used to make initial forms
  // also helpers like type info + validation schema
  const initialValues = Object.freeze(extractInitialValues(initialValuesMap));
  const validationSchema = Object.freeze(
    extractValidationSchema(initialValuesMap)
  );
  const abiTypesInfo = Object.freeze(extractAbiTypes(initialValuesMap));
  // console.log({
  //   functionAbi,
  //   initialValuesMap,
  //   initialValues,
  //   validationSchema,
  //   abiTypesInfo,
  // });
  const handleArrayPush = async (
    path: string[],
    value: string | {},
    props: FormikProps<any>
  ) => {
    if (loadashFp.has(props.values, path)) {
      const oldValues = loadashFp.get(props.values, path);
      const newValues = [...oldValues, value];
      loadashFp.set(props.values, path, newValues);
      await props.setValues({ ...props.values });
    }
  };

  const handleArrayPop = async (
    path: string[],
    index: number,
    props: FormikProps<any>
  ) => {
    if (loadashFp.has(props.values, path)) {
      const oldValues = loadashFp.get(props.values, path);
      const newValues = [
        ...oldValues.filter((_: any, i: number) => i !== index),
      ];
      loadashFp.set(props.values, path, newValues);
      await props.setValues({ ...props.values });
    }
  };

  return (
    <div className="bg-slate-100 p-3 rounded my-2 shadow-md function-root">
      <div className="flex items-center function-header">
        <p className="mr-2 text-md font-bold text-black  ">
          {functionAbi?.name}
        </p>
        (
        {functionAbi?.inputs?.map((ip) => (
          <React.Fragment key={ip?.name}>
            <span className="mr-2 text-sm font-normal dark:text-gray-400">
              {ip?.name}:
            </span>
            <Tag color={typeToTagColor(ip?.type)}>{ip?.type}</Tag>
          </React.Fragment>
        ))}
        )
      </div>
      <Formik
        initialValues={{
          ...initialValues,
        }}
        enableReinitialize
        validationSchema={Yup.object(validationSchema)}
        onSubmit={(finalValues) => {
          try {
            // console.log({ finalValues });
            const finalizedValues = finalizeValues(
              finalValues,
              'core::integer::u256'
            );
            const rawArrayValues = flattenToRawCallData(finalizedValues);
            // console.log('rawArrayValues:', rawArrayValues);
            const starkliValues = transformStringArrayToInteger(
              flattenArrays(rawArrayValues) as string[]
            );
            // console.log('starkliValues', starkliValues);
            const starknetValues = Object.keys(finalizedValues).map(
              // @ts-ignore
              (key) => finalizedValues[key]
            );
            // console.log('starknetValues', starknetValues);

            const callbackReturnValues: CallbackReturnType = {
              raw: finalValues,
              functionName: functionAbi?.name,
              stateMutability: functionAbi?.state_mutability,
              starknetjs: starknetValues,
              starkli: {
                bigint: starkliValues,
                decimal: starkliValues.map((v) => v.toString(10)).join(' '),
                hex: starkliValues.map((v) => `0x${v.toString(16)}`).join(' '),
              },
            };
            callbackFn(callbackReturnValues);
          } catch (e) {
            console.error(e);
            callbackFn({
              raw: finalValues,
              functionName: functionAbi?.name,
              stateMutability: functionAbi?.state_mutability,
            });
          }
        }}
      >
        {(props) => (
          <form onSubmit={props.handleSubmit} className="function-form">
            <ParseInputFieldsFromObject
              values={props.values}
              errors={props.errors}
              initialValues={props.initialValues}
              abiTypes={abiTypesInfo}
              handleChange={props.handleChange}
              handleArrayPush={handleArrayPush}
              handleArrayPop={handleArrayPop}
              setFieldValue={props.setFieldValue}
              props={props}
            />
            <Button
              type="submit"
              color="purple"
              className="my-2 function-form-su  bmit"
            >
              {buttonLabel || 'Call'}
            </Button>
          </form>
        )}
      </Formik>
      <div className="my-2 function-response">{response}</div>
    </div>
  );
};

export default FunctionForm;
