import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ExpenseEntry {
    id: bigint;
    date: string;
    type: string;
    description: string;
    amount: bigint;
}
export interface UserProfile {
    name: string;
}
export interface Budget {
    monthlyLimit: bigint;
    lastUpdated: string;
    savingsGoal: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addExpense(date: string, type: string, amount: bigint, description: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getBudget(): Promise<Budget | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getExpensesForCaller(): Promise<Array<ExpenseEntry>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveBudget(monthlyLimit: bigint, savingsGoal: bigint, lastUpdated: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
