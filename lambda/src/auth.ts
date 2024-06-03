import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import jwt, { JwtPayload } from "jsonwebtoken";

const jwtSecret =
  // Ask your senior dev colleague for the real value and insert it here. Never check it into the git repo!!!
  "XXXXXXXXXXXXX Redacted XXXXXXXXXXXXX";

export function generateToken(username: string) {
  return jwt.sign({ username }, jwtSecret, { expiresIn: "1h" });
}

export function authenticate(
  event: APIGatewayProxyEventV2
): APIGatewayProxyResultV2 | string {
  const authorizationHeader =
    event.headers.authorization || event.headers.Authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: `"Unauthorized: No or invalid authorization header."`,
      }),
    };
  }

  const token = authorizationHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    return decoded.username;
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Unauthorized: Invalid or expired token",
      }),
    };
  }
}
