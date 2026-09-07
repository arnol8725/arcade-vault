import { getGames } from "@/lib/games-server";
import { HallOfFameClient } from "@/components/hall-of-fame-client";

export default async function HallOfFamePage() {
  const games = await getGames();

  return <HallOfFameClient games={games} />;
}
