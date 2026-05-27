import * as schema from "@relayhaven/db-schema";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const client = createClient({
	url: process.env.DATABASE_URL || "file:./relayhaven.db",
});

export const db = drizzle(client, { schema });

export { schema };
