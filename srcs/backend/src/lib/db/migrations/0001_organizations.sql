CREATE TABLE IF NOT EXISTS organizations (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  owner_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id serial PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'MEMBER',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organization_user_unique UNIQUE (organization_id, user_id),
  CONSTRAINT organization_member_role_check CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER'))
);

CREATE TABLE IF NOT EXISTS organization_messages (
  id serial PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_members_user_id_idx
  ON organization_members(user_id);

CREATE INDEX IF NOT EXISTS organization_messages_organization_id_created_at_idx
  ON organization_messages(organization_id, created_at);
