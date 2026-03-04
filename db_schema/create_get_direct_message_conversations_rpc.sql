-- Create RPC function to get direct message conversations with unread count
CREATE OR REPLACE FUNCTION get_direct_message_conversations(user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  last_message text,
  last_message_time timestamptz,
  avatar_url text,
  unread_messages integer
) AS $func$
BEGIN
  RETURN QUERY
  SELECT
    other_user.id,
    other_user.name::text,
    dm.content AS last_message,
    dm.created_at AS last_message_time,
    other_user.avatar_url,
    (
      SELECT COUNT(*)
      FROM direct_messages
      WHERE sender_id = last_msgs.other_user_id
        AND recipient_id = user_id
        AND is_read = false
    )::integer AS unread_messages
  FROM (
    SELECT
      CASE WHEN sender_id = user_id THEN recipient_id ELSE sender_id END AS other_user_id,
      MAX(created_at) AS last_time
    FROM direct_messages
    WHERE sender_id = user_id OR recipient_id = user_id
    GROUP BY other_user_id
  ) AS last_msgs
  JOIN users other_user ON other_user.id = last_msgs.other_user_id
  JOIN direct_messages dm
    ON ((dm.sender_id = user_id AND dm.recipient_id = other_user.id)
        OR (dm.sender_id = other_user.id AND dm.recipient_id = user_id))
    AND dm.created_at = last_msgs.last_time
  ORDER BY last_msgs.last_time DESC;
END;
$func$ LANGUAGE plpgsql;
