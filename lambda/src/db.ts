import { Client } from "pg";

export function getClient() {
  return new Client({
    host: "cdkstack-flopboxdb49c5a7cb-acavegy7cphh.c44lsxxwsdts.eu-central-1.rds.amazonaws.com",
    user: "FlopboxDbUser",
    // Ask your senior dev colleague for the real value and insert it here. Never check it into the git repo!!!
    password: "XXXXXXXXXXXXX Redacted XXXXXXXXXXXXX",
    database: "FlopboxDb",
    port: 5432,
  });
}
