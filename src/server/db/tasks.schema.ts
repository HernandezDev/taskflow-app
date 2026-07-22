import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema";

export const task = sqliteTable(
	"task",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		title: text("title").notNull(),
		status: text("status", { enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] })
			.default("PENDING")
			.notNull(),
		deadline: integer("deadline", { mode: "timestamp_ms" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("task_userId_idx").on(table.userId)],
);

// Relación: Una tarea pertenece a un usuario
export const taskRelations = relations(task, ({ one }) => ({
	user: one(user, {
		fields: [task.userId],
		references: [user.id],
	}),
}));

// Tipos inferidos
export type Task = typeof task.$inferSelect;
export type InsertTask = typeof task.$inferInsert;
