import { ReactElement, useMemo, useState } from "react";

import { range } from "lodash";
import { Head } from "~/components/shared/Head";
import { useCollection } from "react-firebase-hooks/firestore";
import { getFirestore } from "~/lib/firebase";
import { collection, updateDoc, DocumentSnapshot, DocumentData } from "firebase/firestore";
import { createNewRoundForGame, GameStatus, getRoundCollectionForGame } from "~/lib/game";
import { isGuessInWordList } from "~/lib/words";
import { User } from "firebase/auth";
import { simpleDeepCopy } from "~/lib/common";
import { CreateGameButton } from "~/components/domain/auth/CreateGameButton";
import { JoinGameButton } from "~/components/domain/auth/JoinGameButton";
import { useNavigate } from "react-router-dom";

type Props = {
  user: User;
  game: DocumentSnapshot<DocumentData>;
};

const MISS_GUESS_COUNT = 8;

function GameSummary({ user, game }: Props): ReactElement {
  const gameData = game.data()!;

  const [rounds, roundsLoading, roundsError] = useCollection(getRoundCollectionForGame(game), {
    snapshotListenOptions: { includeMetadataChanges: true },
  });

  const { winnerIDs, orderedIDs, scoreMap } = useMemo((): {
    winnerIDs: string[];
    orderedIDs: string[];
    scoreMap: { [userID: string]: number };
  } => {
    const newScoreMap: { [userID: string]: number } = {};

    if (rounds?.docs == null) {
      return { winnerIDs: [], orderedIDs: [], scoreMap: newScoreMap };
    }

    Object.keys(gameData.players).forEach((userID) => {
      newScoreMap[userID] = 0;
    });

    rounds.docs.forEach((round) => {
      Object.entries(round.data().userGuesses).forEach(([userID, guesses]) => {
        const correctGuessIndex = (guesses as string[]).indexOf(round.data().targetWord);
        newScoreMap[userID] +=
          correctGuessIndex === -1
            ? // missing the word is MISS_GUESS_COUNT
              MISS_GUESS_COUNT
            : correctGuessIndex + 1;
      });
    });

    let winners: string[] = [];
    let lowScore = Number.POSITIVE_INFINITY;
    Object.keys(gameData.players).forEach((userID) => {
      if (newScoreMap[userID] === lowScore) {
        winners.push(userID);
      } else if (newScoreMap[userID] < lowScore) {
        winners = [userID];
        lowScore = newScoreMap[userID];
      }
      newScoreMap[userID] = newScoreMap[userID] / rounds.docs.length;
    });

    return {
      winnerIDs: winners,
      orderedIDs: Object.keys(newScoreMap).sort((userIDA, userIDB) => {
        return newScoreMap[userIDA] - newScoreMap[userIDB];
      }),
      scoreMap: newScoreMap,
    };
  }, [gameData.players, rounds?.docs]);

  const navigate = useNavigate();

  return (
    <>
      <Head title="Play" />
      <div className="p-4 min-h-screen-with-header">
        <div className="flex justify-center">
          <div className="max-w-120 w-full">
            <h1 className="text-3xl font-bold w-full text-center">Game over!</h1>
            <div className="flex flex-col gap-2  w-full text-center">
              <i className="text-sm">Missed words count as a round with {MISS_GUESS_COUNT} guesses.</i>
              <p className="font-semibold text-xl">
                Winner{winnerIDs.length > 1 ? "s" : ""}:{" "}
                {winnerIDs.map((winnerID) => gameData.players[winnerID].name).join(", ")}
              </p>
              {orderedIDs.map((userID) => {
                return (
                  <div key={userID}>
                    <span className="font-semibold">{gameData.players[userID].name}:</span>{" "}
                    {scoreMap[userID].toFixed(1)} guesses / round
                  </div>
                );
              })}
              <div className="divider" />
              <CreateGameButton fromGameOver />
              <JoinGameButton fromGameOver />
              <button className="btn btn-ghost " onClick={() => navigate("/")}>
                Back to home
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default GameSummary;
