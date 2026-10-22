// Shot/drill types a coach can tag a batting clip with. Part of the cricket batting config.
export const SHOT_TYPES = [
  { value: "drill", label: "General drill / net session" },
  { value: "front_foot_drive", label: "Front-foot drive" },
  { value: "back_foot_defence", label: "Back-foot defence" },
  { value: "pull", label: "Pull shot" },
  { value: "cut", label: "Cut shot" },
  { value: "sweep", label: "Sweep" },
  { value: "forward_defence", label: "Forward defence" },
] as const;

export function shotLabel(value: string) {
  return SHOT_TYPES.find((s) => s.value === value)?.label ?? value;
}
