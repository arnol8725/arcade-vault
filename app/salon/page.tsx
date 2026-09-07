import { getGames } from "@/lib/games-server";
import {
  getGlobalTopScores,
  getTopScoresByGame,
  getUserBestForGame,
} from "@/lib/scores-server";
import { SalonClient, type GameLeaderboard } from "@/components/salon-client";

export default async function HallOfFamePage() {
  const games = await getGames();

  const [globalTop, perGame] = await Promise.all([
    getGlobalTopScores(10),
    Promise.all(
      games.map(async (game): Promise<GameLeaderboard> => {
        const [top, userBest] = await Promise.all([
          getTopScoresByGame(game.id, 10),
          getUserBestForGame(game.id),
        ]);
        return { gameId: game.id, top, userBest };
      }),
    ),
  ]);

  return <SalonClient games={games} globalTop={globalTop} perGame={perGame} />;
}
