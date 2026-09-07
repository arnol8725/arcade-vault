import { createClient } from "@/lib/supabase/client";

export interface LeaderboardRow {
  rank: number;
  userName: string;
  score: number;
  achievedAt: string;
}

export interface UserBest {
  score: number;
  rank: number; // count de scores mayores en ese juego + 1
}

export async function saveScoreToLeaderboard(
  gameId: string,
  score: number,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const { error } = await supabase.from("scores").insert({
    user_id: session.user.id,
    user_name: session.user.user_metadata?.name,
    game_id: gameId,
    score,
  });

  if (error) throw error;
}
