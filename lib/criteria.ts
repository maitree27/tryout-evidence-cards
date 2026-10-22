// The same five criteria are used for every player, so comparisons are fair.
export const CRITERIA = [
  { id: "first_touch", label: "First touch", hint: "How well the player receives and controls the ball" },
  { id: "ball_control", label: "Ball control", hint: "Close control while dribbling or turning" },
  { id: "passing", label: "Passing", hint: "Choice and quality of passes" },
  { id: "movement", label: "Movement off the ball", hint: "Finding space, supporting teammates" },
  { id: "defending", label: "Defensive effort", hint: "Pressing, tracking back, positioning" },
] as const;

export type CriterionId = (typeof CRITERIA)[number]["id"];
export const CRITERION_IDS = CRITERIA.map((c) => c.id) as CriterionId[];

export const RATINGS = ["strong", "developing", "limited", "cant_tell"] as const;
export type Rating = (typeof RATINGS)[number];
