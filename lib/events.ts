import type {
  Approval,
  Draft,
  Evaluation,
  PublishedBrief,
  ResearchLane,
} from "./types";

export type BriefEvent =
  | { type: "phase"; phase: Phase }
  | { type: "lane"; id: LaneId; lane: ResearchLane }
  | { type: "draft"; draft: Draft; iteration: number }
  | { type: "evaluation"; evaluation: Evaluation; iteration: number }
  | { type: "awaiting_approval"; token: string; passed: boolean }
  | { type: "rejected"; comment: string; reviewer: string }
  | { type: "published"; published: PublishedBrief }
  | { type: "failed"; message: string };

export type Phase =
  | "research"
  | "draft"
  | "critique"
  | "awaiting_approval"
  | "published"
  | "rejected"
  | "failed";

export type LaneId = "landscape" | "constraints" | "comparables";

export type DeskState = {
  phase: Phase;
  lanes: Partial<Record<LaneId, ResearchLane>>;
  drafts: { draft: Draft; iteration: number }[];
  evaluations: { evaluation: Evaluation; iteration: number }[];
  token?: string;
  passedCritique: boolean;
  decision?: Approval;
  published?: PublishedBrief;
  error?: string;
};

export const initialDeskState: DeskState = {
  phase: "research",
  lanes: {},
  drafts: [],
  evaluations: [],
  passedCritique: false,
};

export function reduceDesk(state: DeskState, event: BriefEvent): DeskState {
  switch (event.type) {
    case "phase":
      return { ...state, phase: event.phase };
    case "lane":
      return {
        ...state,
        lanes: { ...state.lanes, [event.id]: event.lane },
      };
    case "draft":
      return {
        ...state,
        drafts: [
          ...state.drafts.filter((item) => item.iteration !== event.iteration),
          { draft: event.draft, iteration: event.iteration },
        ].sort((a, b) => a.iteration - b.iteration),
      };
    case "evaluation":
      return {
        ...state,
        evaluations: [
          ...state.evaluations.filter(
            (item) => item.iteration !== event.iteration,
          ),
          { evaluation: event.evaluation, iteration: event.iteration },
        ].sort((a, b) => a.iteration - b.iteration),
      };
    case "awaiting_approval":
      return {
        ...state,
        phase: "awaiting_approval",
        token: event.token,
        passedCritique: event.passed,
      };
    case "rejected":
      return {
        ...state,
        phase: "rejected",
        decision: {
          approved: false,
          comment: event.comment,
          reviewer: event.reviewer,
        },
      };
    case "published":
      return {
        ...state,
        phase: "published",
        published: event.published,
        decision: {
          approved: true,
          comment: event.published.comment,
          reviewer: event.published.reviewer,
        },
      };
    case "failed":
      return { ...state, phase: "failed", error: event.message };
    default:
      return state;
  }
}

export function parseEventLine(line: string): BriefEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as BriefEvent;
  } catch {
    return null;
  }
}
