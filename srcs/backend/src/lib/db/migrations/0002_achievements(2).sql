-- Progressão: XP e nível no usuário
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "xp" integer NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "level" integer NOT NULL DEFAULT 1;

-- Catálogo de conquistas
CREATE TABLE IF NOT EXISTS "achievements" (
  "id" serial PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "icon" text,
  "category" text NOT NULL DEFAULT 'GENERAL',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Conquistas desbloqueadas por usuário
CREATE TABLE IF NOT EXISTS "user_achievements" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "achievement_id" integer NOT NULL REFERENCES "achievements"("id") ON DELETE CASCADE,
  "unlocked_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_achievement_unique" UNIQUE ("user_id", "achievement_id")
);

-- Seed do catálogo inicial de achievements (deve refletir ACHIEVEMENT_DEFINITIONS em progression.ts)
INSERT INTO "achievements" ("key", "name", "description", "icon", "category") VALUES
  ('FIRST_WIN', 'Primeira Vitória', 'Vença sua primeira partida.', 'trophy', 'COMBAT'),
  ('WINS_10', 'Veterano', 'Vença 10 partidas.', 'medal', 'COMBAT'),
  ('WINS_50', 'Lenda da Arena', 'Vença 50 partidas.', 'crown', 'COMBAT'),
  ('MATCHES_50', 'Combatente Dedicado', 'Complete 50 partidas, vencendo ou perdendo.', 'swords', 'GENERAL'),
  ('FLAWLESS_VICTORY', 'Vitória Impecável', 'Vença uma partida sem perder nenhum round.', 'shield-check', 'COMBAT'),
  ('ONE_TRICK', 'Especialista', 'Vença uma partida usando o mesmo elemental em todos os rounds.', 'target', 'COMBAT'),
  ('COMEBACK_KING', 'Virada Épica', 'Vença uma partida depois de perder o primeiro round.', 'flame', 'COMBAT'),
  ('LEVEL_5', 'Em Ascensão', 'Alcance o nível 5.', 'trending-up', 'PROGRESSION'),
  ('LEVEL_10', 'Mestre Elemental', 'Alcance o nível 10.', 'star', 'PROGRESSION')
ON CONFLICT ("key") DO NOTHING;
