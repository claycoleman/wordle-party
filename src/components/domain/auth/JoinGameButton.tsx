import { getFirestore } from "~/lib/firebase";
import { collection, addDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { queryLobbyGamesWithUniqueCode } from "~/lib/game";

type Props = { user: User; fromGameOver?: boolean };

const gamesCollection = collection(getFirestore(), "games");

const MODAL_ID = "join-game-modal";
const INPUT_ID = "join-game-modal-input";

export const JoinGameButton = ({ user, fromGameOver }: Props) => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const attemptJoin = async () => {
    if (user == null) {
      return;
    }

    const uniqueCode = ((document.getElementById(INPUT_ID) as HTMLInputElement)?.value ?? "").toUpperCase();
    if (uniqueCode.length < 4) {
      setError(`Every game code is 4 letters long`);
      return;
    }

    const res = await queryLobbyGamesWithUniqueCode(uniqueCode);

    if (res.docs.length === 0) {
      setError(`Couldn't find a game matching ${uniqueCode}`);
      return;
    }

    const newPlayers = res.docs[0].data().players;
    newPlayers[user.uid] = {
      id: user.uid,
      name: user.displayName,
    };

    // create a game with that code
    await updateDoc(res.docs[0].ref, {
      players: newPlayers,
    });

    navigate(`/game/${res.docs[0].id}`);
  };

  return (
    <>
      <label
        htmlFor={MODAL_ID}
        className="btn btn-secondary modal-button "
        onClick={() => {
          setTimeout(() => inputRef.current?.focus(), 250);
        }}
      >
        Join {fromGameOver ? "another" : "a"} game
      </label>

      <input type="checkbox" id={MODAL_ID} className="modal-toggle" />
      <label htmlFor={MODAL_ID} className="modal cursor-pointer">
        <label className="modal-box relative" htmlFor="">
          <label htmlFor={MODAL_ID} className="btn btn-sm btn-circle absolute right-2 top-2">
            ✕
          </label>
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold">Enter a game code.</h3>
            <input
              ref={inputRef}
              id={INPUT_ID}
              className="input input-sm input-bordered uppercase"
              type="text"
              maxLength={4}
              autoFocus
              placeholder="ABCD"
              onInput={() => {
                if (error != null) {
                  setError(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  attemptJoin();
                } else if (e.key === "Escape") {
                  console.log(document.getElementById(MODAL_ID));
                  document.getElementById(MODAL_ID)?.click();
                }
              }}
            />
            <button onClick={attemptJoin} type="button" className="btn btn-sm  btn-primary rounded-md ">
              Join
            </button>
            {error != null && (
              <div className="alert  alert-sm rounded-md alert-error shadow-lg">
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current flex-shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>
        </label>
      </label>
    </>
  );
};
