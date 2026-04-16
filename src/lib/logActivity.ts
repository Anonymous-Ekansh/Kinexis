import { supabase } from "@/lib/supabase";

/**
 * Log a user activity to the `activity` table.
 *
 * The table schema uses:
 *   - activity_type (string) — the action kind
 *   - target_title  (string | null) — human-readable label
 *   - target_id     (string | null) — UUID of the target entity
 *   - target_type   (string | null) — e.g. "user", "club", "event", "post"
 */
export async function logActivity(opts: {
  userId: string;
  activityType: string;
  targetTitle?: string | null;
  targetId?: string | null;
  targetType?: string | null;
}) {
  try {
    await supabase.from("activity").insert({
      user_id: opts.userId,
      activity_type: opts.activityType,
      type: opts.activityType, // Satisfy not-null constraint on legacy column 'type'
      description: opts.targetTitle || "", // Fallback for legacy 'description'
      target_title: opts.targetTitle || null,
      target_id: opts.targetId || null,
      target_type: opts.targetType || null,
    });
  } catch (err) {
    console.error("logActivity error:", err);
  }
}
