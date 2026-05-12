import { useCallback, useState } from "react";

export function useFormData<T extends object>(_initialState: T) {
  const [initialState, setInitialState] = useState<T>(_initialState);
  const [formData, setFormData] = useState<T>(initialState);
  const [formError, setFormError] = useState<string | null>(null);

  const onFormChange = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFormData = useCallback(() => {
    setFormData(initialState);
    setFormError(null);
  }, [initialState]);

  return {
    formData,
    setFormData,
    onFormChange,
    formError,
    setFormError,
    resetFormData,
    setInitialState,
  };
}
