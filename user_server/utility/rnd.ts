export const id = (len = 16) =>
  Math.random()
    .toString(36)
    .substring(2, 2 + len);
