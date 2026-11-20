export type Category =
  | "personnel"
  | "formation"
  | "motion"
  | "tag"
  | "concept"
  | "alignment"
  | "coverage"
  | "blitz"
  | "stunt";
export interface CallEntry {
  id: string;
  category: Category;
  name: string;
  coverageType?: "Man" | "Zone";
}
export const categories: {
  id: Category;
  name: string;
  side: "offense" | "defense";
}[] = [
  { id: "personnel", name: "Personnel", side: "offense" },
  { id: "formation", name: "Formation", side: "offense" },
  { id: "motion", name: "Motion", side: "offense" },
  { id: "tag", name: "Tag", side: "offense" },
  { id: "concept", name: "Konzept", side: "offense" },
  { id: "alignment", name: "Front / Alignment", side: "defense" },
  { id: "coverage", name: "Coverage", side: "defense" },
  { id: "blitz", name: "Blitz", side: "defense" },
  { id: "stunt", name: "D-Line Stunt", side: "defense" },
];
export const defaultPlaybook = (): CallEntry[] =>
  Object.entries({
    personnel: ["10", "11", "12", "21", "22"],
    formation: [
      "Shotgun",
      "Trips Right",
      "Trips Left",
      "Pistol",
      "I-Formation",
      "Empty",
    ],
    motion: ["Zac", "Zip", "Jet", "Orbit"],
    tag: ["X Out", "Z Fade", "H Slant", "RPO"],
    concept: [
      "Inside Zone",
      "Outside Zone",
      "Power",
      "Counter",
      "Mesh",
      "Four Verticals",
      "Flood",
      "Stick",
    ],
    alignment: ["3–3", "3–4", "4–3", "4–2–5", "Bear"],
    coverage: [
      "Cover 0",
      "Cover 1",
      "Cover 2",
      "Cover 3",
      "Cover 4",
      "Cover 6",
    ],
    blitz: ["Mike", "Will", "Sam", "Double A", "Corner", "Safety"],
    stunt: ["Texas", "TEX", "EX", "Nose Loop", "Tackle Twist", "Pirate"],
  }).flatMap(([category, names]) =>
    names.map((name, index) => ({
      id: `${category}-${index}`,
      category: category as Category,
      name,
      ...(category === "coverage"
        ? { coverageType: index < 2 ? ("Man" as const) : ("Zone" as const) }
        : {}),
    })),
  );
