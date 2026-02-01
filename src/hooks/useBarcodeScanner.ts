import { useState, useEffect, useCallback, useRef } from 'react';

interface UseBarcodeScanner {
  barcode: string;
  isScanning: boolean;
  lastScan: string | null;
  clearBarcode: () => void;
}

interface Options {
  onScan?: (barcode: string) => void;
  minLength?: number;
  maxDelay?: number;
  enabled?: boolean;
}

/**
 * Hook para detectar entrada de scanner de código de barras
 * Los scanners USB envían caracteres rápidamente seguidos de Enter
 * Este hook detecta esa entrada rápida y la diferencia de escritura manual
 */
export function useBarcodeScanner(options: Options = {}): UseBarcodeScanner {
  const {
    onScan,
    minLength = 4,
    maxDelay = 50, // ms entre caracteres para considerar scanner
    enabled = true,
  } = options;

  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearBarcode = useCallback(() => {
    setBarcode('');
    setLastScan(null);
    bufferRef.current = '';
  }, []);

  const processBarcode = useCallback(
    (code: string) => {
      if (code.length >= minLength) {
        setBarcode(code);
        setLastScan(code);
        setIsScanning(false);
        onScan?.(code);
      }
      bufferRef.current = '';
    },
    [minLength, onScan]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Enter key - process buffer
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          e.preventDefault();
          processBarcode(bufferRef.current);
        }
        bufferRef.current = '';
        setIsScanning(false);
        return;
      }

      // Tab key - also used by some scanners
      if (e.key === 'Tab' && bufferRef.current.length >= minLength) {
        e.preventDefault();
        processBarcode(bufferRef.current);
        bufferRef.current = '';
        setIsScanning(false);
        return;
      }

      // Only process printable characters
      if (e.key.length !== 1) return;

      // Check if input is from scanner (rapid input)
      if (timeDiff < maxDelay || bufferRef.current === '') {
        // Likely scanner input
        bufferRef.current += e.key;
        setIsScanning(true);

        // Set timeout to clear buffer if no more input
        timeoutRef.current = setTimeout(() => {
          if (bufferRef.current.length >= minLength) {
            processBarcode(bufferRef.current);
          }
          bufferRef.current = '';
          setIsScanning(false);
        }, 100);
      } else {
        // Manual typing - reset buffer
        bufferRef.current = e.key;
        setIsScanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, maxDelay, minLength, processBarcode]);

  return { barcode, isScanning, lastScan, clearBarcode };
}

/**
 * Hook simplificado para input específico con scanner
 * Útil cuando quieres que el scanner escriba en un input específico
 */
export function useBarcodeInput(
  inputRef: React.RefObject<HTMLInputElement>,
  onScan?: (barcode: string) => void
) {
  const [value, setValue] = useState('');
  const lastInputTimeRef = useRef(0);
  const bufferRef = useRef('');

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const now = Date.now();
      const timeDiff = now - lastInputTimeRef.current;
      lastInputTimeRef.current = now;

      // If input came very fast, it's likely from scanner
      if (timeDiff < 30 && bufferRef.current.length > 0) {
        bufferRef.current = target.value;
      } else {
        bufferRef.current = target.value;
      }

      setValue(target.value);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && bufferRef.current.length >= 4) {
        e.preventDefault();
        onScan?.(bufferRef.current);
        setValue('');
        bufferRef.current = '';
        input.value = '';
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeyDown);

    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputRef, onScan]);

  return { value, setValue };
}
