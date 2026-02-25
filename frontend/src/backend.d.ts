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
export interface Customer {
    id: bigint;
    name: string;
    createdAt: Time;
    email: string;
    company: string;
    workDetails: string;
    address: string;
    phoneNumber: string;
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
    repeatUntilDate?: bigint;
    updatedAt?: Time;
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
    addCustomer(name: string, email: string, phoneNumber: string, address: string, company: string, workDetails: string): Promise<bigint>;
    addExpense(amount: bigint, category: string, description: string, date: string): Promise<bigint>;
    addGlobalHoliday(date: string, holidayType: HolidayType): Promise<void>;
    addHistory(entryType: HistoryType, details: string): Promise<bigint>;
    addTodo(text: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createReminder(message: string, date: string, time: string, repeatUntilDate: bigint | null): Promise<bigint>;
    deleteCustomer(id: bigint): Promise<void>;
    deleteExpense(id: bigint): Promise<void>;
    deleteNote(id: bigint): Promise<void>;
    deleteReminder(id: bigint): Promise<void>;
    deleteTodo(id: bigint): Promise<void>;
    getAttendanceConfig(): Promise<AttendanceConfig | null>;
    getAttendanceEntries(): Promise<Array<[string, AttendanceDayEntry]>>;
    getAttendanceSummary(month: string): Promise<AttendanceSummary>;
    getBudget(): Promise<Budget | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomers(): Promise<Array<Customer>>;
    getExpenses(): Promise<Array<ExpenseEntry>>;
    getGlobalHolidays(): Promise<Array<HolidayEntry>>;
    getHistory(): Promise<Array<HistoryEntry>>;
    getNotes(): Promise<Array<Note>>;
    getReminders(): Promise<Array<Reminder>>;
    getRemindersForDate(dateMs: bigint): Promise<Array<Reminder>>;
    getTodos(): Promise<Array<TodoItem>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    grantCustomDatePermission(user: Principal): Promise<void>;
    hasCustomDatePermission(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    removeGlobalHoliday(date: string): Promise<void>;
    requestApproval(): Promise<void>;
    revokeCustomDatePermission(user: Principal): Promise<void>;
    saveAttendanceConfig(config: AttendanceConfig): Promise<void>;
    saveAttendanceEntry(date: string, entry: AttendanceDayEntry): Promise<void>;
    saveBudget(budget: Budget): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveNote(id: bigint, text: string): Promise<bigint>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    toggleTodo(id: bigint): Promise<void>;
    updateCustomer(id: bigint, name: string, email: string, phoneNumber: string, address: string, company: string, workDetails: string): Promise<void>;
    updateReminder(id: bigint, message: string, date: string, time: string, repeatUntilDate: bigint | null): Promise<void>;
}
