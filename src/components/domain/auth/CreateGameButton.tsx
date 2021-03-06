import { getAuth, getFirestore } from "~/lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { signInAnonymously, updateProfile } from "firebase/auth";
import { GameStatus, queryLobbyGamesWithUniqueCode } from "~/lib/game";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState } from "react";

type Props = { fromGameOver?: boolean };

function generateUniqueCode() {
  let newStr = Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .slice(0, 4);
  while (newStr.length < 4) {
    newStr = Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, "")
      .slice(0, 4);
  }

  return newStr.toUpperCase();
}

const gamesCollection = collection(getFirestore(), "games");

export const CreateGameButton = ({ fromGameOver }: Props) => {
  const [creatingGame, setCreatingGame] = useState(false);
  const [_user, loadingUser] = useAuthState(getAuth());
  const navigate = useNavigate();

  const handleClick = async () => {
    if (loadingUser || creatingGame) {
      return;
    }

    setCreatingGame(true);

    let user = _user;
    if (user == null) {
      const res = await signInAnonymously(getAuth());
      user = res.user;
    }

    // find a truly unique code
    let uniqueCode = generateUniqueCode();
    let docs = await queryLobbyGamesWithUniqueCode(uniqueCode);
    while (docs.docs.length > 0) {
      uniqueCode = generateUniqueCode();
      docs = await queryLobbyGamesWithUniqueCode(uniqueCode);
    }

    // create a game with that code
    const res = await addDoc(gamesCollection, {
      uniqueCode,
      players: {
        [user.uid]: {
          id: user.uid,
          name: user.displayName,
        },
      },
      status: GameStatus.Lobby,
      rounds: [],
    });

    navigate(`/game/${res.id}`);
  };

  return (
    <button onClick={handleClick} type="button" className={`btn btn-primary ${creatingGame && "loading btn-disabled"}`}>
      Create a {fromGameOver && "new"} game
    </button>
  );
};
