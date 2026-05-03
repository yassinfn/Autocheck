-- ============================================================
-- MIGRATION : RLS sur la table `analyses`
-- ⚠️  À APPLIQUER SEULEMENT après le Chantier 2 (auth SMS Twilio)
--     Appliquer avant = app inaccessible (aucune politique = accès bloqué)
-- ============================================================

-- 1. Activer RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- 2. Politique de lecture : un utilisateur ne voit que ses propres analyses
--    La colonne `user_id` doit être créée par le Chantier 2 (ex: uuid ref auth.users)
CREATE POLICY "analyses_select_own"
  ON analyses FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Politique d'insertion : un utilisateur ne peut insérer que pour lui-même
CREATE POLICY "analyses_insert_own"
  ON analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Politique de mise à jour : un utilisateur ne peut modifier que ses analyses
CREATE POLICY "analyses_update_own"
  ON analyses FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Politique de suppression
CREATE POLICY "analyses_delete_own"
  ON analyses FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Tables annexes (pas de données sensibles — RLS optionnel)
-- ============================================================

-- reputation_cache : données publiques (réputation modèle), pas besoin de RLS
-- bookmarklet_tokens : TTL 5 min + usage unique, RLS via service_role_key déjà
-- etapes_images : données publiques (images Google), pas besoin de RLS

-- ============================================================
-- COLONNE user_id à ajouter lors du Chantier 2 :
--   ALTER TABLE analyses ADD COLUMN user_id uuid REFERENCES auth.users(id);
--   UPDATE analyses SET user_id = NULL; -- géré par le Chantier 2 (migration des sessions)
-- ============================================================
