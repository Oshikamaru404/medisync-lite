import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

const navigationViewState = new Map<string, unknown>();

export const useNavigationViewState = <T,>(
  key: string,
  initialValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    if (navigationViewState.has(key)) return navigationViewState.get(key) as T;
    return typeof initialValue === "function"
      ? (initialValue as () => T)()
      : initialValue;
  });

  const setNavigationValue = useCallback<Dispatch<SetStateAction<T>>>((nextValue) => {
    setValue((previousValue) => {
      const resolvedValue = typeof nextValue === "function"
        ? (nextValue as (previous: T) => T)(previousValue)
        : nextValue;
      navigationViewState.set(key, resolvedValue);
      return resolvedValue;
    });
  }, [key]);

  return [value, setNavigationValue];
};
