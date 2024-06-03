import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { getClient } from "./db";
import bcrypt from "bcryptjs";
import { generateToken } from "./auth";

export async function login(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const body = event.body ? JSON.parse(event.body) : {};
  const { username, password } = body;

  // Validate the request body
  if (!username || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Username and password are required" }),
    };
  }

  const client = getClient();
  await client.connect();

  try {
    // Check if the user exists
    const userCheck = await client.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (userCheck.rows.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid username or password" }),
      };
    }

    const user = userCheck.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid username or password" }),
      };
    }

    // Generate a JWT token
    const token = generateToken(username);
    return {
      statusCode: 200,
      body: JSON.stringify({ token }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error logging in user",
        error,
      }),
    };
  } finally {
    await client.end();
  }
}
