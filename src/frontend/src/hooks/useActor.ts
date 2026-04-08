import { useActor as _useActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";

/**
 * Pre-bound useActor hook for this app's backend.
 * Wraps @caffeineai/core-infrastructure's useActor with the generated createActor factory.
 */
export function useActor() {
  return _useActor(createActor);
}
