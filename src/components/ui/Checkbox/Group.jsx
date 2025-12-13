import { forwardRef, useState, useCallback, useMemo, useEffect } from "react";
import classNames from "classnames";
import { CheckboxGroupContextProvider } from "./context";
import cloneDeep from "lodash/cloneDeep";
import remove from "lodash/remove";
import shallowEqual from "../utils/shallowEqual";

const Group = forwardRef((props, ref) => {
  const {
    children,
    className,
    color,
    name,
    onChange,
    value: valueProp,
    vertical,
    ...rest
  } = props;

  const [value, setValue] = useState(valueProp);

  const onCheckboxGroupChange = useCallback(
    (itemValue, itemChecked, event) => {
      const nextValue = cloneDeep(value) || [];
      if (itemChecked) {
        nextValue.push(itemValue);
      } else {
        remove(nextValue, (i) => shallowEqual(i, itemValue));
      }

      setValue(nextValue);
      onChange?.(nextValue, event);
    },
    [onChange, setValue, value]
  );

  useEffect(() => {
    setValue(valueProp);
  }, [valueProp]);

  const checkboxGroupDefaultClass = `inline-flex ${
    vertical ? "flex-col gap-y-2" : ""
  }`;

  const checkBoxGroupClass = classNames(checkboxGroupDefaultClass, className);

  const contextValue = useMemo(
    () => ({
      vertical,
      name,
      value,
      color,
      onChange: onCheckboxGroupChange,
    }),
    [vertical, onCheckboxGroupChange, name, color, value]
  );

  return (
    <CheckboxGroupContextProvider value={contextValue}>
      <div ref={ref} className={checkBoxGroupClass} {...rest}>
        {children}
      </div>
    </CheckboxGroupContextProvider>
  );
});

Group.displayName = "CheckboxGroup";

export default Group;
