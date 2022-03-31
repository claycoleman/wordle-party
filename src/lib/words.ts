let targetWordList: string[];
let acceptedGuessWordSet: Set<string>;

export async function getTargetWordList() {
  if (targetWordList == null) {
    targetWordList = (await import("./words/target-words.json")).default;
    targetWordList = targetWordList.map((word) => word.toLowerCase());
  }
  return targetWordList;
}

export async function isGuessInWordList(guess: string) {
  if (acceptedGuessWordSet == null) {
    acceptedGuessWordSet = new Set((await import("./words/all-words.json")).default);
  }
  return acceptedGuessWordSet.has(guess.toLowerCase());
}

export async function getRandomWord() {
  const words = await getTargetWordList();
  return words[Math.floor(Math.random() * words.length)];
}
