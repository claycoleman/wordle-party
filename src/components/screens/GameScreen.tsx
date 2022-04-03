import { ReactElement, useState } from "react";
import { Head } from "~/components/shared/Head";
import { updateProfile } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useDocument } from "react-firebase-hooks/firestore";
import { getAuth, getFirestore } from "~/lib/firebase";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { doc, updateDoc, deleteDoc, DocumentReference, getDoc } from "firebase/firestore";
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

const NAME_INPUT_ID = "wp-game-name-input";
const NAME_BUTTON_ID = "wp-game-name-button";

let copiedTimeout: ReturnType<typeof setTimeout> | null = null;

function GameScreen(): ReactElement {
  const [editingName, setEditingName] = useState<string | false>(false);
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
  const players = gameData.players as { [userID: string]: { id: string; name: string | null | undefined } };

  if (players[user.uid] == null) {
    return <Navigate to="/" />;
  }

  const needName = players[user.uid].name == null || players[user.uid].name!.length === 0;

  if (gameData.status === GameStatus.Lobby) {
    return (
      <>
        <Head title="Lobby" />
        <div className="hero min-h-screen-with-header">
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
                {Object.values(players)
                  .sort((p1, p2) => p1.id.localeCompare(p2.id))
                  .map((player) => {
                    return (
                      <p key={player.id}>
                        {player.name ? player.name : <i>Waiting for name...</i>} -{" "}
                        {player.id === user.uid ? (
                          <span
                            className="link"
                            onClick={async () => {
                              setEditingName(player.name!);
                            }}
                          >
                            Change name
                          </span>
                        ) : (
                          <span
                            className="link"
                            onClick={async () => {
                              const players = gameData.players as { id: string }[];
                              const newPlayers = simpleDeepCopy(players);
                              delete newPlayers[player.id];

                              // update game to have new players
                              await updateDoc(game.ref, { players: newPlayers });
                            }}
                          >
                            Kick
                          </span>
                        )}
                      </p>
                    );
                  })}
                <div className="divider" />
                {needName || editingName !== false ? (
                  <>
                    <input
                      id={NAME_INPUT_ID}
                      defaultValue={typeof editingName === "string" ? editingName : ""}
                      className="input input-bordered"
                      placeholder="Enter your name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          document.getElementById(NAME_BUTTON_ID)?.click();
                        }
                      }}
                    />
                    <button
                      id={NAME_BUTTON_ID}
                      type="button"
                      className="btn btn-primary"
                      onClick={async () => {
                        const name = (document.getElementById(NAME_INPUT_ID) as HTMLInputElement).value.trim();
                        if (name.length === 0) {
                          return;
                        }

                        setEditingName(false);

                        const newPlayers = simpleDeepCopy(players);
                        newPlayers[user.uid] = {
                          ...newPlayers[user.uid],
                          name,
                        };
                        await updateDoc(game.ref, { players: newPlayers });

                        // also update user
                        await updateProfile(user, { displayName: name });
                      }}
                    >
                      Save name
                    </button>
                  </>
                ) : (
                  <button
                    onClick={async () => {
                      if (
                        Object.values(players).some((player) => player.name == null || player.name.trim().length === 0)
                      ) {
                        return;
                      }

                      if (Object.values(players).length <= 1 && !confirm("Are you sure you want to play alone?")) {
                        return;
                      }

                      await createNewRoundForGame(game);

                      await updateDoc(game.ref, { status: GameStatus.InProgress });
                    }}
                    className={`btn ${
                      Object.values(players).every((player) => player.name != null && player.name.trim().length > 0) &&
                      Object.values(players).length > 1
                        ? "btn-primary"
                        : "btn-disabled"
                    } pointer-events-auto `}
                  >
                    {Object.values(players).every((player) => player.name != null && player.name.trim().length > 0)
                      ? "Start game"
                      : "Waiting for names..."}
                  </button>
                )}
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
