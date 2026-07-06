declare module 'multer' {
  export interface StorageEngine {}
  export function memoryStorage(): StorageEngine;
}

declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }
  }
}
