import { Injectable } from "@nestjs/common";
import { Client } from "minio";
import { newTokenId } from "../../common/utils/hash.util";

@Injectable()
export class StorageService {
  private readonly client = new Client({
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin123"
  });

  buildKycPlaceholderKey(userId: string, kind: string, extension: string): string {
    const cleanExtension = extension.replace(/^\./, "").toLowerCase() || "bin";
    return `local/kyc/${userId}/${kind.toLowerCase()}/${newTokenId()}.${cleanExtension}`;
  }

  buildTaskSupportingPlaceholderKey(userId: string, taskId: string, extension: string): string {
    const cleanExtension = extension.replace(/^\./, "").toLowerCase() || "bin";
    return `local/tasks/${userId}/${taskId}/supporting/${newTokenId()}.${cleanExtension}`;
  }

  async healthCheck(): Promise<boolean> {
    await this.client.listBuckets();
    return true;
  }
}
