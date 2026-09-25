import fs from "fs";
import path from "path";

const migrationsDir = path.resolve("supabase/migrations");
const bootstrapFile = path.resolve("supabase/bootstrap/01_super_admin.sql");
const outputFile = path.resolve("supabase/combined_migrations.sql");

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Found ${files.length} migration files.`);

let combinedContent = `-- ==========================================================\n`;
combinedContent += `-- COMBINED MIGRATIONS AND BOOTSTRAP FOR ASTROBOT ACADEMY\n`;
combinedContent += `-- Generated at: ${new Date().toISOString()}\n`;
combinedContent += `-- Target Supabase Project: asxwugnxcjiuituwpkyi\n`;
combinedContent += `-- ==========================================================\n\n`;

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, "utf8");
  combinedContent += `-- ----------------------------------------------------------\n`;
  combinedContent += `-- Migration: ${file}\n`;
  combinedContent += `-- ----------------------------------------------------------\n\n`;
  combinedContent += content + `\n\n`;
}

if (fs.existsSync(bootstrapFile)) {
  const bootstrapContent = fs.readFileSync(bootstrapFile, "utf8");
  combinedContent += `-- ----------------------------------------------------------\n`;
  combinedContent += `-- Bootstrap: 01_super_admin.sql\n`;
  combinedContent += `-- ----------------------------------------------------------\n\n`;
  combinedContent += bootstrapContent + `\n\n`;
}

fs.writeFileSync(outputFile, combinedContent, "utf8");
console.log(
  `Successfully generated ${outputFile} (${(combinedContent.length / 1024).toFixed(1)} KB)`,
);
