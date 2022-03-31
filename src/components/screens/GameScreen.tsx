import { ReactElement, useState } from "react";
import { Head } from "~/components/shared/Head";
import { useAuthState } from "react-firebase-hooks/auth";
import { useDocument } from "react-firebase-hooks/firestore";
import { getAuth, getFirestore } from "~/lib/firebase";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { createNewRoundForGame, GameStatus } from "~/lib/game";
import PlayGame from "./Game/PlayGame";
import { simpleDeepCopy } from "~/lib/common";
import GameSummary from "./Game/GameSummary";

enum GuessResult {
  Empty = "empty",
  Incorrect = "incorrect",
  Correct = "correct",
  WrongLocation = "wrong-location",
}

let copiedTimeout: ReturnType<typeof setTimeout> | null = null;

function GameScreen(): ReactElement {
  const navigate = useNavigate();
  const [user, loading, error] = useAuthState(getAuth());
  const params = useParams<"gameID">();
  const [showCopied, setShowCopied] = useState(false);

  const [game, gameLoading, gameError] = useDocument(doc(getFirestore(), "games", params.gameID ?? ""), {
    snapshotListenOptions: { includeMetadataChanges: true },
  });

  if (user == null) {
    return loading ? <>Loading...</> : <Navigate to="/" />;
  }

  if (game == null || game.exists() === false) {
    return gameLoading ? <>Loading...</> : <Navigate to="/" />;
  }

  const gameData = game.data()!;
  const players = gameData.players as { [userID: string]: { id: string; name: string } };

  if (players[user.uid] == null) {
    return <Navigate to="/" />;
  }

  if (gameData.status === GameStatus.Lobby) {
    return (
      <>
        <Head title="Lobby" />
        <div className="hero min-h-screen">
          <div className="text-center hero-content">
            <div>
              <h1 className="text-3xl font-bold">
                Invite others to join!{" "}
                <span
                  className="link"
                  onClick={() => {
                    copiedTimeout != null && clearTimeout(copiedTimeout);
                    copiedTimeout = setTimeout(() => setShowCopied(false), 1000);
                    navigator.clipboard.writeText(gameData.uniqueCode);
                    setShowCopied(true);
                  }}
                >
                  {showCopied ? "Copied!" : gameData.uniqueCode}
                </span>
              </h1>
              <div className="mt-4 grid gap-2">
                <p className="font-semibold text-xl">Players</p>
                {Object.values(players).map((p) => {
                  return (
                    <p key={p.id}>
                      {p.name}{" "}
                      {p.id !== user.uid && (
                        <>
                          -{" "}
                          <span
                            className="link"
                            onClick={async () => {
                              const players = gameData.players as { id: string }[];
                              const newPlayers = simpleDeepCopy(players);
                              delete newPlayers[p.id];

                              // update game to have new players
                              await updateDoc(game.ref, { players: newPlayers });
                            }}
                          >
                            Kick
                          </span>
                        </>
                      )}
                    </p>
                  );
                })}
                <div className="divider" />
                <button
                  onClick={async () => {
                    if (Object.values(players).length <= 1 && !confirm("Are you sure you want to play alone?")) {
                      return;
                    }

                    await createNewRoundForGame(game);

                    await updateDoc(game.ref, { status: GameStatus.InProgress });
                  }}
                  className={`btn ${
                    Object.values(players).length > 1 ? "btn-primary" : "btn-disabled"
                  } pointer-events-auto `}
                >
                  Start game
                </button>
                <button
                  onClick={async () => {
                    const players = gameData.players as { id: string }[];
                    const newPlayers = simpleDeepCopy(players);
                    delete newPlayers[user.uid];

                    if (Object.keys(newPlayers).length === 0) {
                      // delete game
                      await deleteDoc(game.ref);
                    } else {
                      // update game to have new players
                      await updateDoc(game.ref, { players: newPlayers });
                    }

                    navigate("/");
                  }}
                  className={`btn btn-ghost  `}
                >
                  Leave game
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (gameData.status === GameStatus.InProgress) {
    return <PlayGame user={user} game={game} />;
  }

  return <GameSummary user={user} game={game} />;
}

export default GameScreen;
