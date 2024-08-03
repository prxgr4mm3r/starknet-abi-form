import './ABIForm.css';

import React, { useMemo } from 'react';

import { ABI, abiSchema } from './types/index';
import {
  convertConstructorToFunction,
  EMPTY_CONSTRUCTOR_FUNCTION,
  extractConstructorFromRawAbi,
  extractEnumFromABI,
  extractStructFromABI,
} from './types/helper';
import FunctionForm from './FunctionForm';
import { Provider } from './UIComponents/Tooltip/Tooltip';
import { CallbackReturnType } from './ABIForm';

export type ConstructorFormProps = {
  abi?: ABI;
  callBackFn: (value: CallbackReturnType) => void;
};

export const ConstructorForm: React.FC<ConstructorFormProps> = ({
  abi,
  callBackFn,
}) => {
  try {
    abiSchema.validateSync(abi);
  } catch (e) {
    console.error(e);
    return <p className="invalid-abi">Not a Valid ABI Schema Cairo v2</p>;
  }

  const constructor = useMemo(() => {
    try {
      const constructorFromAbi = extractConstructorFromRawAbi(abi);
      return convertConstructorToFunction(constructorFromAbi);
    } catch (e) {
      return EMPTY_CONSTRUCTOR_FUNCTION;
    }
  }, [abi]);

  const structs = useMemo(() => {
    try {
      return extractStructFromABI(abi);
    } catch (e) {
      return [];
    }
  }, [abi]);

  const enums = useMemo(() => {
    try {
      return extractEnumFromABI(abi);
    } catch (e) {
      return [];
    }
  }, [abi]);

  return (
    <Provider>
      <FunctionForm
        callbackFn={callBackFn}
        functionAbi={constructor}
        abi={abi}
        structs={structs}
        enums={enums}
        buttonLabel="Deploy"
      />
    </Provider>
  );
};

export default ConstructorForm;
