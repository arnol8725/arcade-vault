import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/games";

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("id, title, short, long, cat, cover, color, best, plays")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as Game[];
}

export async function getGameById(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("id, title, short, long, cat, cover, color, best, plays")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Game | null;
}
