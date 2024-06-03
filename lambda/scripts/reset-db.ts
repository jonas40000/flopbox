import { getClient } from "../src/db";

const dropUserTable = async () => {
  const client = getClient();
  await client.connect();

  const dropTableQuery = `
    DROP TABLE users;
  `;

  try {
    await client.query(dropTableQuery);
    console.log("User Table dropped successfully");
  } catch (err) {
    console.error("Error dropping table", err);
  } finally {
    await client.end();
  }
};

dropUserTable().catch((err) => console.error(err));
