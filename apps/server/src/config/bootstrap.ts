import { runMigrations } from "./database";
import { seedDefaultSettings } from "../services/settingsService";
import { seedDefaultStyles } from "../services/styleService";

export function bootstrapDatabase(): void {
  runMigrations();
  seedDefaultSettings();
  seedDefaultStyles();
}
