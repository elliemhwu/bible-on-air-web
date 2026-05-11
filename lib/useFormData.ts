import { useCallback, useState } from "react";

export function useFormData<T extends object>(initialState: T) {
  const [formData, setFormData] = useState<T>(initialState);
  const [formError, setFormError] = useState<string | null>(null);

  const onFormChange = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { formData, setFormData, onFormChange, formError, setFormError };
}
