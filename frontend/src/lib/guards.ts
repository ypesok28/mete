// Type guards for the response union. The wire response (SolveResponseBase) carries NO
// `mode` discriminant — only the request does — so we narrow structurally on the fields
// unique to each result shape (BuildResult.builds vs RepairResult.buckets).

import type { SolveResponse, BuildResult, RepairResult } from "@contract";

export function isBuildResult(r: SolveResponse): r is BuildResult {
  return "builds" in r;
}

export function isRepairResult(r: SolveResponse): r is RepairResult {
  return "buckets" in r;
}
