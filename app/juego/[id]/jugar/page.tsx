import { notFound } from "next/navigation";
import { getGameById } from "@/lib/games-server";
import { GamePlayer } from "@/components/game-player";

export default async function GamePlayerPage({
  params,
}: PageProps<"/juego/[id]/jugar">) {
  const { id } = await params;
  const game = await getGameById(id);

  if (!game) notFound();

  return <GamePlayer game={game} />;
}
