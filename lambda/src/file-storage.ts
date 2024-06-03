import { AWSError, S3 } from "aws-sdk";

const s3 = new S3();

export async function createUserBucket(username: string) {
  await s3.createBucket({ Bucket: username }).promise();

  // Set CORS configuration for the new user bucket.
  // Needed to enable upload via signed urls from the React app.
  const corsParams = {
    Bucket: username,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["PUT"],
          AllowedOrigins: ["*"],
          ExposeHeaders: [],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  };
  await s3.putBucketCors(corsParams).promise();
}

async function listFilesInBucket(bucketName: string): Promise<string[]> {
  const objects = await s3
    .listObjectsV2({
      Bucket: bucketName,
    })
    .promise();
  const keys = objects.Contents
    ? objects.Contents.map((obj) => obj.Key || "")
    : [];
  return keys;
}

export async function listFiles(username: string) {
  try {
    const keys = await listFilesInBucket(username);
    return {
      statusCode: 200,
      body: JSON.stringify({ files: keys }),
    };
  } catch (error) {
    const awsError = error as AWSError;
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error listing files",
        error: awsError.message,
      }),
    };
  }
}

async function generateSignedUrl(
  bucketName: string,
  key: string,
  operation: string
): Promise<string> {
  const params = {
    Bucket: bucketName,
    Key: key,
    Expires: 60 * 5, // URL expires in 5 minutes
  };

  return s3.getSignedUrlPromise(operation, params);
}

export async function getFileDownloadUrl(
  username: string,
  key: string | undefined
) {
  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "File key is required" }),
    };
  }

  try {
    const signedUrl = await generateSignedUrl(username, key, "getObject");
    return {
      statusCode: 200,
      body: JSON.stringify({ url: signedUrl }),
    };
  } catch (error) {
    const awsError = error as AWSError;
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error generating signed URL",
        error: awsError.message,
      }),
    };
  }
}

export async function getFileUploadUrl(
  username: string,
  key: string | undefined
) {
  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "File key is required" }),
    };
  }

  try {
    const signedUrl = await generateSignedUrl(username, key, "putObject");
    return {
      statusCode: 200,
      body: JSON.stringify({ url: signedUrl }),
    };
  } catch (error) {
    const awsError = error as AWSError;
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error generating signed URL",
        error: awsError.message,
      }),
    };
  }
}

async function deleteFileFromBucket(bucketName: string, key: string) {
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  await s3.deleteObject(params).promise();
}

export async function deleteFile(username: string, key: string | undefined) {
  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "File key is required" }),
    };
  }

  try {
    await deleteFileFromBucket(username, key);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "File deleted successfully" }),
    };
  } catch (error) {
    const awsError = error as AWSError;
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error deleting file",
        error: awsError.message,
      }),
    };
  }
}
