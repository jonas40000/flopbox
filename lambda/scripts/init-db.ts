import { getClient } from "../src/db";

const createUserTable = async () => {
  const client = getClient();
  await client.connect();

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL
    );
  `;

  try {
    await client.query(createTableQuery);
    console.log("Table created successfully");
  } catch (err) {
    console.error("Error creating table", err);
  } finally {
    await client.end();
  }
};

createUserTable().catch((err) => console.error(err));
