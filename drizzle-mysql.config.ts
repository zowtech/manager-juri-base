import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema-mysql.ts",
  out: "./drizzle-mysql",
  dialect: "mysql",
  dbCredentials: {
    host: "localhost",
    user: "root",
    password: "",
    database: "legal_management",
    port: 3306,
  },
});