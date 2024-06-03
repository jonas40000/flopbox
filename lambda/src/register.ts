import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { AWSError, S3 } from "aws-sdk";
import { getClient } from "./db";
import bcrypt from "bcryptjs";
import { generateToken } from "./auth";
import { createUserBucket } from "./file-storage";

const accessSecret = "Flopbox2024";

const s3 = new S3();

export async function register(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const body = event.body ? JSON.parse(event.body) : {};

  const { username, password, earlyAccessSecret } = body;

  // Validate the request body
  if (!username || !password || !earlyAccessSecret) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Username, password and early accesss code are required",
      }),
    };
  }

  // Only allow users who got the early access code
  if (earlyAccessSecret !== accessSecret) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        message: "The early access code you entered is not correct.",
      }),
    };
  }

  // Validate the username
  if (!isValidS3BucketName(username)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message:
          "The username can only contain lowercase letters and slashes. It must be between 3 and 63 characters long.",
      }),
    };
  }

  // Check if we this bucket name is taken by another AWS account
  if (await isBucketNameTaken(username)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message:
          "This username can not be assigned due to technical reasons. Pleas try another one.",
      }),
    };
  }

  const client = getClient();
  await client.connect();

  try {
    // Check if the user already exists
    const userCheck = await client.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (userCheck.rows.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "User already exists" }),
      };
    }

    // Hash the password and create the new user
    const passwordHash = await bcrypt.hash(password, 10);
    await client.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
      [username, passwordHash]
    );

    // Create an S3 bucket for the new user
    await createUserBucket(username);
    console.log(`Bucket created: ${username}`);

    // Generate a JWT token
    const token = generateToken(username);
    return {
      statusCode: 201,
      body: JSON.stringify({ token }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error registering user",
        error,
      }),
    };
  } finally {
    await client.end();
  }
}

/**
 * Checks if the given username is valid for use as an S3 bucket name.
 */
function isValidS3BucketName(username: string): boolean {
  // Check length requirements
  if (username.length < 3 || username.length > 63) {
    return false;
  }

  // Check for allowed characters
  const regex = /^[a-z0-9-]+$/;
  if (!regex.test(username)) {
    return false;
  }

  return true;
}

/**
 * Checks if the given username is already taken as an S3 bucket name by another AWS account.
 */
async function isBucketNameTaken(username: string): Promise<boolean> {
  try {
    await s3.headBucket({ Bucket: username }).promise();
    return false;
  } catch (error) {
    const awsError = error as AWSError;
    if (awsError.code === "NotFound") {
      return false;
    } else if (awsError.code === "Forbidden") {
      // The bucket exists but we don't have permission to access it
      return true;
    }
    throw error;
  }
}
