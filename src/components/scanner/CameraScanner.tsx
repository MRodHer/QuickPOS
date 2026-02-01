import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, X, SwitchCamera } from 'lucide-react';

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

export function CameraScanner({ onScan, onClose, isOpen = true }: CameraScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanning = async () => {
    if (!containerRef.current) return;

    try {
      setError(null);
      const scanner = new Html5Qrcode('camera-scanner-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Successful scan
          onScan(decodedText);
          // Vibrate if supported
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
        },
        () => {
          // Ignore scan errors (no code found)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Camera error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo acceder a la cámara. Verifica los permisos.'
      );
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Stop error:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const switchCamera = async () => {
    await stopScanning();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    if (isOpen && !isScanning) {
      startScanning();
    }
    return () => {
      stopScanning();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Escanear Código
        </h2>
        <div className="flex gap-2">
          <button
            onClick={switchCamera}
            className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              stopScanning();
              onClose?.();
            }}
            className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex items-center justify-center">
        {error ? (
          <div className="text-center p-6">
            <CameraOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={startScanning}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="relative w-full max-w-md">
            <div
              id="camera-scanner-container"
              ref={containerRef}
              className="w-full"
            />
            {/* Scan guide overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-40 border-2 border-white/50 rounded-lg relative">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-black/50 text-center">
        <p className="text-white/70 text-sm">
          Centra el código de barras en el recuadro
        </p>
      </div>
    </div>
  );
}

// Floating scan button for mobile
interface ScanButtonProps {
  onClick: () => void;
  className?: string;
}

export function ScanButton({ onClick, className = '' }: ScanButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition z-40 ${className}`}
    >
      <Camera className="w-6 h-6" />
    </button>
  );
}
