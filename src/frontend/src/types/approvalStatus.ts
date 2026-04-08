/**
 * ApprovalStatus enum — mirrors the Motoko variant type.
 * This is not exported from backend.d.ts so we define it locally.
 */
export enum ApprovalStatus {
  pending = "pending",
  approved = "approved",
  rejected = "rejected",
}
