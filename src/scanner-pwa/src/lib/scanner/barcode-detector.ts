export type DetectedCode = {
  rawValue: string;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<DetectedCode[]>;
};

type BarcodeDetectorConstructorLike = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructorLike;
  }
}

export function getBarcodeDetector(): BarcodeDetectorLike | null {
  if (typeof window === "undefined" || !window.BarcodeDetector) {
    return null;
  }

  return new window.BarcodeDetector({
    formats: ["qr_code"],
  });
}
