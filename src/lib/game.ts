import { addDoc, collection, DocumentData, DocumentSnapshot, getDocs, query, where } from "firebase/firestore";
import { getFirestore } from "./firebase";
import { getRandomWord } from "./words";

export enum GameStatus {
  Lobby = "lobby",
  InProgress = "in-progress",
  Finished = "finished",
}

export const gamesCollection = collection(getFirestore(), "games");

export function getRoundCollectionForGame(game: DocumentSnapshot<DocumentData>) {
  return collection(getFirestore(), "games", game.id, "rounds");
}

export async function createNewRoundForGame(game: DocumentSnapshot<DocumentData>) {
  const players = game.data()!.players as { [userID: string]: { id: string; name: string } };

  const userGuesses: { [userID: string]: any } = {};
  Object.values(players).forEach((p) => {
    userGuesses[p.id] = [];
  });

  const targetWord = await getRandomWord();
  // figure out how to add a subcollection
  const newRound = await addDoc(getRoundCollectionForGame(game), {
    createdAt: new Date(),
    targetWord,
    userGuesses,
  });

  return newRound;
}

export async function queryLobbyGamesWithUniqueCode(uniqueCode: string) {
  return getDocs(
    query(gamesCollection, where("uniqueCode", "==", uniqueCode), where("status", "==", GameStatus.Lobby))
  );
}
