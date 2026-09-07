import { createClient } from "@/lib/supabase/server";
import type { LeaderboardRow, UserBest } from "@/lib/scores";

export async function getTopScoresByGame(
  gameId: string,
  limit = 10,
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("user_name, score, achieved_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row, index) => ({
    rank: index + 1,
    userName: row.user_name,
    score: row.score,
    achievedAt: row.achieved_at,
  }));
}

export async function getGlobalTopScores(
  limit = 10,
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("user_name, score, achieved_at")
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row, index) => ({
    rank: index + 1,
    userName: row.user_name,
    score: row.score,
    achievedAt: row.achieved_at,
  }));
}

export async function getUserBestForGame(
  gameId: string,
): Promise<UserBest | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: best, error: bestError } = await supabase
    .from("scores")
    .select("score")
    .eq("game_id", gameId)
    .eq("user_id", session.user.id)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bestError) throw bestError;
  if (!best) return null;

  const { count, error: countError } = await supabase
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId)
    .gt("score", best.score);

  if (countError) throw countError;

  return { score: best.score, rank: (count ?? 0) + 1 };
}
