import type { CriterionId, Rating } from "./criteria";

export type Player = { name: string; number: string };

export type Observation = {
  timestamp: number; // seconds into the clip
  text: string;
  confidence: number; // 0 to 1
};

export type CriterionResult = {
  id: CriterionId;
  rating: Rating;
  reason: string; // why, or why "can't tell"
  observations: Observation[];
  insufficient: boolean; // set by our own code, not by the AI
};

export type EvidenceCard = {
  id: string;
  player: Player;
  description: string;
  playerVisible: boolean;
  footageUsable: boolean;
  footageNote: string;
  criteria: CriterionResult[];
  frames: { timestamp: number; dataUrl: string }[]; // small thumbnails
  createdAt: string;
};

export type SharedReport = { cards: EvidenceCard[]; createdAt: string };
