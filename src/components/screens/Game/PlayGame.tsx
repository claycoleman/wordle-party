import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";

import { range } from "lodash";
import { Head } from "~/components/shared/Head";
import { useCollection } from "react-firebase-hooks/firestore";
import { getFirestore } from "~/lib/firebase";
import { collection, updateDoc, DocumentSnapshot, DocumentData } from "firebase/firestore";
import { createNewRoundForGame, GameStatus, getRoundCollectionForGame } from "~/lib/game";
import { isGuessInWordList } from "~/lib/words";
import { User } from "firebase/auth";
import { simpleDeepCopy } from "~/lib/common";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const INPUT_ID = "guess-word-input";

enum GuessResult {
  Empty = 0,
  Incorrect = 1,
  WrongLocation = 2,
  Correct = 3,
}

type Props = {
  user: User;
  game: DocumentSnapshot<DocumentData>;
};

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");
const ALPHABET_KEYBOARD = ["qwertyuiop".split(""), "asdfghjkl".split(""), "zxcvbnm".split("")];

let invalidWordTimeout: ReturnType<typeof setTimeout> | null = null;
let animateInvalidWordTimeout: ReturnType<typeof setTimeout> | null = null;
const INVALID_WORD_TIME = 3000;

function PlayGame({ user, game }: Props): ReactElement {
  const gameData = game.data()!;
  const [invalidWord, setInvalidWord] = useState<{ word: string; animateOut: boolean } | null>(null);

  const [rounds, roundsLoading, roundsError] = useCollection(getRoundCollectionForGame(game), {
    snapshotListenOptions: { includeMetadataChanges: true },
  });
  const [currentGuessText, setCurrentGuessText] = useState("");

  const currentRound = (() => {
    if (rounds == null || rounds.docs.length === 0) {
      return null;
    }
    const sortedRounds = rounds.docs.sort((roundA, roundB) => {
      // descending
      return (roundB.data().createdAt ?? 0) - (roundA.data().createdAt ?? 0);
    });

    return {
      ref: sortedRounds[0].ref,
      data: sortedRounds[0].data(),
      roundNumber: sortedRounds.length,
    };
  })();

  const submitGuess = useCallback(
    async (_guess: string) => {
      if (currentRound == null) {
        return;
      }

      const guess = _guess.toLowerCase();
      if (guess.length !== 5) {
        return;
      }

      if (!(await isGuessInWordList(guess))) {
        // handle timeouts
        animateInvalidWordTimeout != null && clearTimeout(animateInvalidWordTimeout);
        animateInvalidWordTimeout = setTimeout(() => {
          setInvalidWord((old) => ({
            ...old!,
            animateOut: true,
          }));
        }, INVALID_WORD_TIME);

        invalidWordTimeout != null && clearTimeout(invalidWordTimeout);
        invalidWordTimeout = setTimeout(() => {
          setInvalidWord(null);
        }, INVALID_WORD_TIME + 100);

        setInvalidWord({ word: guess, animateOut: false });
        return;
      }
      setInvalidWord(null);

      setCurrentGuessText("");

      const userGuesses = simpleDeepCopy(currentRound.data.userGuesses);
      userGuesses[user.uid].push(guess);

      await updateDoc(currentRound.ref, {
        userGuesses,
      });
    },
    [currentRound, user.uid]
  );

  useEffect(() => {
    function onKeyPress(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === "Backspace") {
        return;
      }

      setCurrentGuessText((old) =>
        `${old}${e.key}`
          .replaceAll(/[^a-zA-Z]/gi, "")
          .slice(0, 5)
          .toLowerCase()
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") {
        submitGuess(currentGuessText);
      } else if (e.key === "Backspace") {
        if (e.metaKey || e.ctrlKey) {
          setCurrentGuessText("");
        } else {
          setCurrentGuessText((old) => old.slice(0, -1));
        }
      }
    }

    document.addEventListener("keypress", onKeyPress, { once: false });
    document.addEventListener("keydown", onKeyDown, { once: false });
    return () => {
      document.removeEventListener("keypress", onKeyPress);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [currentGuessText, submitGuess]);

  if (currentRound == null) {
    return <>No round found...</>;
  }

  const guesses = currentRound.data.userGuesses[user.uid];
  const nextGuessIndex = guesses.length;

  const { didUserWin, isTerminalGuessingState } = areGuessesComplete(guesses, currentRound.data.targetWord);

  return (
    <>
      <Head title="Play" />
      <div className="p-4 min-h-screen">
        <div className="text-center">
          <div className="w-full flex flex-col justify-center items-center">
            <h1 className="text-3xl font-bold">Round #{currentRound.roundNumber}</h1>
            <div className="flex flex-row justify-start gap-4 max-w-full overflow-x-scroll">
              {Object.entries(currentRound.data.userGuesses)
                .sort(([userIDA], [userIDB]) => userIDA.localeCompare(userIDB))
                .map(([userID, guesses]) => {
                  if (userID === user.uid) {
                    return null;
                  }

                  return (
                    <div key={userID}>
                      <p className="mb-2">{gameData.players[userID]?.name ?? "Unknown name..."}</p>
                      <GuessBoxes
                        guesses={guesses as string[]}
                        targetWord={currentRound.data.targetWord}
                        size="small"
                      />
                    </div>
                  );
                })}
            </div>
            <div className="mt-4 grid gap-4  w-full max-w-120">
              <GuessBoxes
                guesses={guesses}
                targetWord={currentRound.data.targetWord}
                activeInput={{ currentGuessText, nextGuessIndex }}
              />
              {isTerminalGuessingState ? (
                <>
                  {didUserWin ? (
                    `${guesses.length} guess${guesses.length > 1 ? "es" : ""}? Nice!`
                  ) : (
                    <span>
                      Nice try, the word was{" "}
                      <div className="badge badge-success font-semibold py-1 px-1.5">
                        {currentRound.data.targetWord}
                      </div>
                    </span>
                  )}
                </>
              ) : (
                <>
                  <UsedLetters
                    guesses={guesses}
                    targetWord={currentRound.data.targetWord}
                    addLetter={(letter) => {
                      setCurrentGuessText((oldText) => {
                        if (oldText.length === 5) {
                          return oldText;
                        }
                        return `${oldText}${letter}`.toLowerCase();
                      });
                    }}
                    deleteLetter={() => {
                      setCurrentGuessText((old) => old.slice(0, -1));
                    }}
                    submitGuess={() => {
                      submitGuess(currentGuessText);
                    }}
                  />
                  {invalidWord != null && (
                    <div
                      className={`w-full flex items-center justify-center  ${
                        invalidWord.animateOut
                          ? "animate-out fade-out slide-out-to-top-40"
                          : "animate-in fade-in slide-in-from-top-20"
                      } fill-mode-forwards `}
                    >
                      <div className="alert rounded-md alert-warning shadow-lg max-w-120 ">
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
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <span>&quot;{invalidWord.word.toUpperCase()}&quot; is not in word list</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => submitGuess(currentGuessText)}
                    className={`btn btn-primary  ${currentGuessText.length < WORD_LENGTH && "btn-disabled"}`}
                  >
                    Enter guess
                  </button>
                </>
              )}
              {Object.values(currentRound.data.userGuesses).every(
                (guesses) =>
                  areGuessesComplete(guesses as string[], currentRound.data.targetWord).isTerminalGuessingState
              ) ? (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      await createNewRoundForGame(game);
                    }}
                    className={`btn btn-primary  ${gameData.players.length === 1 && "btn-disabled"}`}
                  >
                    Next round
                  </button>
                  <button
                    onClick={async () => {
                      await updateDoc(game.ref, { status: GameStatus.Finished });
                    }}
                    className={`btn btn-accent  ${gameData.players.length === 1 && "btn-disabled"}`}
                  >
                    End game
                  </button>
                </div>
              ) : (
                isTerminalGuessingState && <p>Waiting on others to finish...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type GuessBoxesProps = {
  guesses: string[];
  targetWord: string;
  size?: "small" | "normal";
  activeInput?: {
    currentGuessText: string;
    nextGuessIndex: number;
  };
};

function GuessBoxes({ guesses, targetWord, size = "normal", activeInput }: GuessBoxesProps): ReactElement {
  return (
    <div className="flex flex-grow flex-row justify-center w-full">
      {/* column */}
      <div className="flex flex-grow flex-col justify-center gap-2 max-w-120">
        {range(MAX_GUESSES).map((guessIndex) => {
          const currentGuess = guesses[guessIndex];
          const currentGuessResults = computeGuessResults(guesses[guessIndex], targetWord);

          // // maybe don't show empty guess rows
          // if (activeInput == null && currentGuess == null) {
          //   return null;
          // }

          return (
            // row
            <div key={guessIndex} className={`flex flex-row gap-2 ${size === "normal" ? "max-w-120" : "max-w-120"}`}>
              {range(WORD_LENGTH).map((letterIndex) => {
                const resultClasses: string = getClassesForGuessResult(currentGuessResults[letterIndex]);
                let text: string | null = null;
                switch (currentGuessResults[letterIndex]) {
                  case GuessResult.Empty:
                    text =
                      activeInput != null && activeInput.nextGuessIndex === guessIndex
                        ? activeInput.currentGuessText.charAt(letterIndex)
                        : null;
                    break;
                  case GuessResult.Incorrect:
                    text = activeInput != null ? currentGuess!.charAt(letterIndex) : null;
                    break;
                  case GuessResult.Correct:
                    text = activeInput != null ? currentGuess!.charAt(letterIndex) : null;
                    break;
                  case GuessResult.WrongLocation:
                    text = activeInput != null ? currentGuess!.charAt(letterIndex) : null;
                    break;
                }

                // box
                return (
                  <div
                    key={letterIndex}
                    className={` border-2 uppercase card flex flex-1 aspect-square select-none ${
                      activeInput != null &&
                      activeInput.nextGuessIndex === guessIndex &&
                      activeInput.currentGuessText.length > letterIndex &&
                      "animate-pop"
                    } transition-colors duration-300 ${
                      (activeInput == null || guessIndex < activeInput.nextGuessIndex) &&
                      `delay-${letterIndex * 300 + 300}`
                    }  ${size === "normal" ? "" : " w-5 h-5 rounded-md"} ${resultClasses}`}
                  >
                    <div className="card-body aspect-square p-0 flex items-center justify-center">
                      <h2 className="card-title m-0">{text}</h2>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type UsedLettersProps = {
  guesses: string[];
  targetWord: string;
  addLetter: (letter: string) => void;
  submitGuess: () => void;
  deleteLetter: () => void;
};

function UsedLetters({ guesses, targetWord, addLetter, deleteLetter, submitGuess }: UsedLettersProps) {
  const lettersMap = useMemo(() => {
    const newLettersMap: { [key: string]: GuessResult } = {};
    ALPHABET.forEach((letter) => {
      newLettersMap[letter] = GuessResult.Empty;
    });
    guesses.forEach((guess) => {
      const guessResults = computeGuessResults(guess, targetWord);
      for (let letterIndex = 0; letterIndex < WORD_LENGTH; letterIndex++) {
        const letter = guess.charAt(letterIndex);
        const result = guessResults[letterIndex];
        newLettersMap[letter] = Math.max(newLettersMap[letter], result);
      }
    });

    return newLettersMap;
  }, [guesses, targetWord]);
  return (
    <div className="w-full flex flex-row justify-center items-center">
      <div className="flex flex-row flex-wrap gap-2 w-full justify-center">
        {ALPHABET_KEYBOARD.map((row, rowIndex) => {
          return (
            <div key={rowIndex} className=" flex flex-row gap-2 flex-wrap max-w-120">
              {rowIndex === ALPHABET_KEYBOARD.length - 1 && (
                <div
                  className={`flex flex-0 justify-center items-center cursor-pointer active:scale-110 border-2 uppercase card aspect-square w-16 h-10 rounded-md text-xs select-none ${getClassesForGuessResult(
                    GuessResult.Incorrect
                  )}`}
                  onClick={() => {
                    submitGuess();
                  }}
                >
                  Enter
                </div>
              )}
              {row.map((letter) => (
                <div
                  key={letter}
                  className={`flex flex-0 justify-center items-center cursor-pointer active:scale-110  transition-colors duration-300 delay-${
                    (MAX_GUESSES - 1) * 300 + 300
                  } border-2 uppercase card aspect-square w-10 h-10 rounded-md text-xs select-none ${getClassesForGuessResult(
                    lettersMap[letter]
                  )}`}
                  onClick={() => {
                    addLetter(letter);
                  }}
                >
                  {letter}
                </div>
              ))}
              {rowIndex === ALPHABET_KEYBOARD.length - 1 && (
                <div
                  className={`flex flex-0 justify-center items-center cursor-pointer active:scale-110 border-2 uppercase card aspect-square w-16 h-10 rounded-md text-xs select-none ${getClassesForGuessResult(
                    GuessResult.Incorrect
                  )}`}
                  onClick={() => {
                    deleteLetter();
                  }}
                >
                  Delete
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// helpers

function computeGuessResults(
  _currentGuess: string | undefined,
  _targetWord: string
): [GuessResult, GuessResult, GuessResult, GuessResult, GuessResult] {
  const currentGuess = _currentGuess?.toLowerCase();
  const targetWord = _targetWord?.toLowerCase();

  const targetWordMap: { [letter: string]: number } = {};
  for (let index = 0; index < WORD_LENGTH; index++) {
    const letter = targetWord.charAt(index);
    if (targetWordMap[letter] == null) {
      targetWordMap[letter] = 0;
    }
    targetWordMap[letter] += 1;
  }

  const currentGuessResults: [GuessResult, GuessResult, GuessResult, GuessResult, GuessResult] = [
    GuessResult.Empty,
    GuessResult.Empty,
    GuessResult.Empty,
    GuessResult.Empty,
    GuessResult.Empty,
  ];

  if (currentGuess != null) {
    const guessMap: { [letter: string]: Set<number> } = {};
    for (let index = 0; index < WORD_LENGTH; index++) {
      const letter = currentGuess.charAt(index);
      if (guessMap[letter] == null) {
        guessMap[letter] = new Set();
      }
      guessMap[letter].add(index);
    }

    // do successes first
    for (let index = 0; index < WORD_LENGTH; index++) {
      // set each to incorrect
      currentGuessResults[index] = GuessResult.Incorrect;

      const guessLetter = currentGuess.charAt(index);
      const targetWordLetter = targetWord.charAt(index);

      if (guessLetter === targetWordLetter) {
        currentGuessResults[index] = GuessResult.Correct;
        guessMap[guessLetter].delete(index);
        targetWordMap[guessLetter] -= 1;
      }
    }

    // next do wrong location
    for (let index = 0; index < WORD_LENGTH; index++) {
      if (currentGuessResults[index] === GuessResult.Correct) {
        continue;
      }

      const guessLetter = currentGuess.charAt(index);

      if (guessMap[guessLetter].has(index) && targetWordMap[guessLetter] != null && targetWordMap[guessLetter] > 0) {
        currentGuessResults[index] = GuessResult.WrongLocation;
        targetWordMap[guessLetter] -= 1;
      }
    }
  }
  return currentGuessResults;
}

function areGuessesComplete(
  guesses: string[],
  targetWord: string
): { isTerminalGuessingState: boolean; didUserWin: boolean } {
  const didUserWin = guesses.includes(targetWord);
  const isTerminalGuessingState = guesses.length === MAX_GUESSES || didUserWin;
  return { didUserWin, isTerminalGuessingState };
}

function getClassesForGuessResult(result: GuessResult): string {
  switch (result) {
    case GuessResult.Empty:
      return "border-neutral text-base-content";
    case GuessResult.Incorrect:
      return "border-transparent bg-neutral text-neutral-content";
    case GuessResult.Correct:
      return "border-transparent bg-success text-success-content";
    case GuessResult.WrongLocation:
      return "border-transparent bg-warning text-warning-content";
  }
}

export default PlayGame;
