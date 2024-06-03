import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { register } from "./register";
import { login } from "./login";
import { authenticate } from "./auth";
import {
  deleteFile,
  getFileDownloadUrl,
  getFileUploadUrl,
  listFiles,
} from "./file-storage";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const { requestContext, rawPath, pathParameters } = event;
  const method = requestContext.http.method;

  if (rawPath === "/api/login" && method === "POST") {
    return await login(event);
  } else if (rawPath === "/api/register" && method === "POST") {
    return await register(event);
  } else {
    // All endpoints below require authentication
    const usernameOrError = authenticate(event);
    if (typeof usernameOrError !== "string") {
      return usernameOrError; // Return the error response from authenticate
    }
    const username = usernameOrError;

    if (rawPath === "/api/files" && method === "GET") {
      return await listFiles(username);
    } else if (rawPath.startsWith("/api/files/") && method === "PUT") {
      const key = pathParameters?.key;
      return await getFileUploadUrl(username, key);
    } else if (rawPath.startsWith("/api/files/") && method === "GET") {
      const key = pathParameters?.key;
      return await getFileDownloadUrl(username, key);
    } else if (rawPath.startsWith("/api/files/") && method === "DELETE") {
      const key = pathParameters?.key;
      return await deleteFile(username, key);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Not Found" }),
      };
    }
  }
};
