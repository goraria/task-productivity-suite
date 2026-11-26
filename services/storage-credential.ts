import { CrudError } from "@/database/crud"
import { taskStorageConfigurationSchema } from "@/schemas/storage-credential"
import {
  awsAccessKeyId,
  awsBucket,
  awsEndpointUrlS3,
  awsRegion,
  awsSecretAccessKey,
} from "@/utils/environment"
import "server-only"
export function rawGetStorageCredential(bucket: string) {
  const config = taskStorageConfigurationSchema.safeParse({
    endpoint: awsEndpointUrlS3,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion,
    bucketName: awsBucket,
  })
  if (!config.success)
    throw new CrudError(503, "storage_unavailable", "Storage is unavailable")
  if (bucket !== config.data.bucketName)
    throw new CrudError(
      403,
      "forbidden_storage_bucket",
      "Bucket is not allowed"
    )
  return config.data
}
