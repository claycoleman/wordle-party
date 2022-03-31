const fs = require("fs");

// Returns the path to the word list which is separated by `\n`
const wordListPath = require("word-list");

const wordArray = fs.readFileSync(wordListPath, "utf8").split("\n");

const wordsWith5Letters = wordArray.filter((word) => word.length === 5);

fs.writeFileSync("./words.txt", wordsWith5Letters.join("\n"));
