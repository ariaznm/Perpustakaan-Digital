import { useState, useEffect } from 'react';

/**
 * useDebounce - Custom hook untuk menunda update nilai
 * 
 * Berguna untuk pencarian dimana kita ingin menunggu user
 * selesai mengetik sebelum memproses pencarian
 * 
 * @param value - Nilai yang akan di-debounce
 * @param delay - Delay dalam milliseconds (default 500ms)
 * @returns Nilai yang sudah di-debounce
 * 
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 500);
 * 
 * // debouncedQuery akan update 500ms setelah user berhenti mengetik
 */
export function useDebounce<T>(value: T, delay: number = 1000): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timeout untuk update nilai setelah delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: clear timeout jika value berubah sebelum delay selesai
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

