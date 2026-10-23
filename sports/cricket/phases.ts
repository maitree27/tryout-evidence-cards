// How a batting shot breaks into moves, and what to practise for each metric.
// Plain-language text for players. Like all scoring here, treat it as guidance, not a verdict; the coach has the final say.

export type MomentKey = "start" | "backlift" | "landing" | "contact" | "finish";

export const PHASES: { key: string; title: string; blurb: string; moment: MomentKey; metrics: string[] }[] = [
  { key: "setup", title: "Set-up", blurb: "Your stance before the ball arrives.", moment: "start", metrics: ["stance_balance", "head_stillness"] },
  { key: "backlift", title: "Backlift", blurb: "Lifting the bat ready to swing.", moment: "backlift", metrics: ["backlift"] },
  { key: "stride", title: "Stride", blurb: "Moving your front foot and weight towards the ball.", moment: "landing", metrics: ["footwork", "weight_transfer"] },
  { key: "contact", title: "Contact", blurb: "Meeting the ball: head position, timing and the swing.", moment: "contact", metrics: ["head_over_knee", "timing", "swing_path"] },
  { key: "finish", title: "Follow-through", blurb: "Where your hands finish after the shot.", moment: "finish", metrics: ["follow_through"] },
];

export const MOMENT_LABEL: Record<MomentKey, string> = {
  start: "Start",
  backlift: "Backlift top",
  landing: "Front foot lands",
  contact: "Contact",
  finish: "Follow-through",
};

export const DRILLS: Record<string, { weak: string; drill: string }> = {
  stance_balance: {
    weak: "Your weight isn't centred before the shot starts, so you're slightly off-balance before you even move.",
    drill: "Stand in your stance for 10 seconds with your weight even on both feet. Repeat 3 times before each net session.",
  },
  head_stillness: {
    weak: "Your head moves a lot before contact, which makes it harder to judge the ball.",
    drill: "Shadow-bat in front of a mirror and keep your nose over the same spot until contact. 15 slow reps.",
  },
  head_over_knee: {
    weak: "At contact your head isn't over your front knee, which can pull you off the line of the ball.",
    drill: "Play slow-motion drives and pause at contact. Check your nose is above your front knee. 10 reps.",
  },
  backlift: {
    weak: "Your backlift is too low or too high for a smooth swing.",
    drill: "Lift the bat slowly to about shoulder height, pause at the top for a second, then swing. 10 reps.",
  },
  swing_path: {
    weak: "Your hands wander on the way down instead of moving smoothly towards the ball.",
    drill: "Shadow-swing slowly in a straight line towards an imaginary ball. 20 reps, focus on smoothness not speed.",
  },
  footwork: {
    weak: "Your front foot isn't covering the right distance for this shot.",
    drill: "Put a marker where your front foot should land and step to it before every shot. 15 reps.",
  },
  weight_transfer: {
    weak: "Your weight isn't moving towards the ball the way this shot needs.",
    drill: "Slow-motion drives finishing with your chest over your front foot. 10 reps.",
  },
  timing: {
    weak: "The bat isn't arriving at the right moment after your front foot lands.",
    drill: "Say \"step... swing\" out loud: land the foot first, then swing. 15 reps with drop-fed balls.",
  },
  follow_through: {
    weak: "Your hands finish too low or too high for this shot.",
    drill: "Finish each shadow shot and hold the pose for 2 seconds, checking it matches the shot you meant. 10 reps.",
  },
};

export type Level = "good" | "ok" | "work";
export const levelOf = (score: number): Level => (score >= 75 ? "good" : score >= 55 ? "ok" : "work");
export const LEVEL_LABEL: Record<Level, string> = { good: "Strong", ok: "Getting there", work: "Work on this" };
