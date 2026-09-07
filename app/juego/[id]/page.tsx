import { notFound } from "next/navigation";
import { seededScores } from "@/lib/games";
import { getGameById } from "@/lib/games-server";
import { GameDetail } from "@/components/game-detail";

export default async function GameDetailPage({
  params,
}: PageProps<"/juego/[id]">) {
  const { id } = await params;
  const game = await getGameById(id);

  if (!game) notFound();

  const scores = seededScores(id.length * 17 + 3, 10);

  return <GameDetail game={game} scores={scores} />;
}
