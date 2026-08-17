export function capitalizeWords(str: string): string {
  return str
    .trim()
    .split(" ")
    .map(word => word && word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function toCamelCase(str: string): string {
  const words = str.trim().split(/\s+/).filter(Boolean);
  return words
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}
