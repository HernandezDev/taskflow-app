// @ts-expect-error: Tipos de Node excluidos para proteger el entorno Edge (Cloudflare)
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { sqliteGenerate } from "drizzle-mermaid-generator";
import * as schema from "../src/server/db";

// 1. Aseguramos que la carpeta exista
if (!existsSync("./docs")) {
	mkdirSync("./docs");
}

// 2. Generamos el código crudo de Drizzle
const mermaidCode = sqliteGenerate({ schema, relational: true });

// 3. Lo envolvemos en formato Markdown estándar
const markdown = `# Diagrama Entidad-Relación (DER)\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n`;

// 4. Escribimos el archivo
writeFileSync("./docs/ERD.md", markdown);
console.log("✔️ Archivo docs/ERD.md generado con éxito.");
