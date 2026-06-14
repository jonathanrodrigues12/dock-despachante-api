export interface IStorageService {
  uploadFile(
    file: Buffer,
    fileName: string,
    folder?: string,
    contentType?: string,
  ): Promise<string>;

  deleteFile(fileUrl: string): Promise<void>;

  getFileUrl(fileName: string, folder?: string): string;
}

export interface UploadResult {
  url: string;
  fileName: string;
  thumbnailUrl?: string;
}

