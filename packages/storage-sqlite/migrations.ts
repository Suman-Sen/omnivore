const schema=`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS profiles (
 id TEXT PRIMARY KEY NOT NULL, display_name TEXT NOT NULL, timezone TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS profile_auth (
 profile_id TEXT PRIMARY KEY NOT NULL REFERENCES profiles(id), mode TEXT NOT NULL,
 salt TEXT NOT NULL, iterations INTEGER NOT NULL, wrapped_key TEXT NOT NULL,
 failed_attempts INTEGER NOT NULL, locked_until INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS profile_settings (
 profile_id TEXT PRIMARY KEY NOT NULL REFERENCES profiles(id), encrypted_value TEXT NOT NULL
);`;

export const profileUpgrades=[
      {toVersion:5,statements:['CREATE TABLE calendar_gallery (profile_id TEXT PRIMARY KEY NOT NULL REFERENCES profiles(id),encrypted_value TEXT NOT NULL);']},
      {toVersion:4,statements:['CREATE TABLE profile_backgrounds (profile_id TEXT PRIMARY KEY NOT NULL REFERENCES profiles(id),encrypted_value TEXT NOT NULL);']},
      {toVersion:1,statements:schema.split(';').map(statement=>statement.trim()).filter(Boolean)},
      {toVersion:3,statements:[
        'CREATE TABLE records (profile_id TEXT NOT NULL REFERENCES profiles(id),id TEXT NOT NULL,kind TEXT NOT NULL,revision INTEGER NOT NULL,encrypted_value TEXT NOT NULL,PRIMARY KEY(profile_id,id));',
        'CREATE INDEX records_profile_kind ON records(profile_id,kind);',
      ]},
      {toVersion:2,statements:[
        "ALTER TABLE profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active';",
        "ALTER TABLE profiles ADD COLUMN profile_type TEXT NOT NULL DEFAULT 'standard';",
      ]},
];
