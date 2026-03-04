-- Supabase SQL migration for direct messages
CREATE TABLE IF NOT EXISTS direct_messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    is_read boolean DEFAULT false
);

-- Index for fast retrieval
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id, created_at DESC);
