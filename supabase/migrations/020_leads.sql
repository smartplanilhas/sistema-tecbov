CREATE TABLE leads (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text,
  email      text        NOT NULL,
  whatsapp   text,
  plan       text,
  created_at timestamptz DEFAULT now()
);
