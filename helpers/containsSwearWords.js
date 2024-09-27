const { checkEnglishText, checkGreekText } = require("bad-words-checker");

export const containsSwearWord = (text) => {
  const isEnglishProfane = checkEnglishText(text).isProfane;
  const isGreekProfane = checkGreekText(text).isProfane;

  return isEnglishProfane || isGreekProfane;
};
