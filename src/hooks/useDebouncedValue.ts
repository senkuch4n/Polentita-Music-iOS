import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // Matches android-source's search debounce: instant when the field is
    // cleared, delayed while the user is still typing.
    const delay = value === '' ? 0 : delayMs;
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
