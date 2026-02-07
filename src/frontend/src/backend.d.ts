import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
}
export interface Note {
    id: bigint;
    text: string;
    lastUpdated: Time;
}
export type Time = bigint;
export interface HistoryEntry {
    id: bigint;
    entryType: HistoryType;
    user: Principal;
    timestamp: Time;
    details: string;
}
export interface AttendanceSummary {
    halfDays: bigint;
    weeklyOffDays: bigint;
    breakdown: Array<[string, AttendanceDayEntry]>;
    presentDays: bigint;
    totalDays: bigint;
    companyLeaveDays: bigint;
    festivalDays: bigint;
    totalWorkingTime: bigint;
    leaveDays: bigint;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface AttendanceDayEntry {
    status: AttendanceStatus;
    checkIn?: Time;
    note: string;
    checkOut?: Time;
    workingTime: bigint;
}
export interface Reminder {
    id: bigint;
    date: string;
    createdAt: Time;
    time: string;
    message: string;
}
export interface TodoItem {
    id: bigint;
    text: string;
    completed: boolean;
    timestamp: Time;
}
export interface ExpenseEntry {
    id: bigint;
    date: string;
    time: Time;
    description: string;
    category: string;
    amount: bigint;
}
export interface AttendanceConfig {
    leavePolicy: bigint;
    weeklyOffDays: Array<bigint>;
    regularWorkingTime: bigint;
}
export interface HolidayEntry {
    holidayType: HolidayType;
    date: string;
}
export interface Budget {
    monthlyLimit: bigint;
    lastUpdated: string;
    dayLimit: bigint;
    savingsGoal: bigint;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum AttendanceStatus {
    halfDay = "halfDay",
    present = "present",
    festival = "festival",
    weeklyOff = "weeklyOff",
    companyLeave = "companyLeave",
    leave = "leave"
}
export enum HistoryType {
    expenseChange = "expenseChange",
    budgetChange = "budgetChange",
    search = "search",
    results = "results",
    upload = "upload",
    updateChecking = "updateChecking"
}
export enum HolidayType {
    festival = "festival",
    companyLeave = "companyLeave"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addExpense(amount: bigint, category: string, description: string, date: string): Promise<bigint>;
    addHistory(entryType: HistoryType, details: string): Promise<bigint>;
    addNote(text: string): Promise<Note>;
    addReminder(message: string, date: string, time: string): Promise<bigint>;
    addTodo(text: string): Promise<TodoItem>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkIn(date: string, status: AttendanceStatus): Promise<void>;
    checkOut(date: string): Promise<void>;
    clearAllData(): Promise<void>;
    clearHistory(): Promise<void>;
    createHoliday(date: string, holidayType: HolidayType): Promise<void>;
    deleteAttendanceEntry(date: string): Promise<void>;
    deleteExpense(id: bigint): Promise<void>;
    deleteHoliday(date: string): Promise<void>;
    deleteNote(id: bigint): Promise<void>;
    deleteReminder(id: bigint): Promise<void>;
    editAttendanceEntry(date: string, updatedEntry: AttendanceDayEntry): Promise<void>;
    editExpense(id: bigint, amount: bigint, category: string, description: string, date: string): Promise<void>;
    filterByDate(date: string): Promise<Array<ExpenseEntry>>;
    filterByType(type: string): Promise<Array<ExpenseEntry>>;
    getAllAttendanceEntries(): Promise<Array<[string, AttendanceDayEntry]>>;
    getAllHolidays(): Promise<Array<HolidayEntry>>;
    getAttendanceConfig(): Promise<AttendanceConfig | null>;
    getAttendanceEntry(date: string): Promise<AttendanceDayEntry | null>;
    getAttendanceSummary(range: [string, string]): Promise<AttendanceSummary>;
    getBudget(): Promise<Budget | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getExpensesForCaller(): Promise<Array<ExpenseEntry>>;
    getFilteredHistory(historyType: HistoryType): Promise<Array<HistoryEntry>>;
    getHistory(): Promise<Array<HistoryEntry>>;
    getHoliday(date: string): Promise<HolidayEntry | null>;
    getNotes(): Promise<Array<Note>>;
    getRemindersForCaller(): Promise<Array<Reminder>>;
    getTodos(): Promise<Array<TodoItem>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVersion(): Promise<string>;
    getWorkingTime(date: string): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    requestApproval(): Promise<void>;
    saveBudget(monthlyLimit: bigint, dayLimit: bigint, savingsGoal: bigint, lastUpdated: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setAttendanceConfig(config: AttendanceConfig): Promise<void>;
    toggleTodo(id: bigint): Promise<void>;
    updateHoliday(date: string, holidayType: HolidayType): Promise<void>;
}
