import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Budget {
    monthlyLimit: bigint;
    lastUpdated: string;
    dayLimit: bigint;
    savingsGoal: bigint;
}
export interface UserProfile {
    displayName: string;
    profilePicture?: Uint8Array;
    departmentId?: bigint;
}
export interface BreakPeriod {
    end: Time;
    start: Time;
}
export type Time = bigint;
export interface HistoryEntry {
    id: bigint;
    entryType: HistoryType;
    user: Principal;
    timestamp: Time;
    details: string;
}
export interface AttendanceConfig {
    leavePolicy: bigint;
    weeklyOffDays: Array<bigint>;
    regularWorkingTime: bigint;
}
export interface FileData {
    id: bigint;
    content: Uint8Array;
    filename: string;
    uploader: Principal;
    uploadedAt: Time;
}
export interface Shift {
    clockOut?: Time;
    clockIn: Time;
}
export interface UserStatusEntry {
    status: UserStatusKind;
    principal: Principal;
    updatedAt: Time;
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
export interface AdminUserInfo {
    status: ApprovalStatus;
    principal: Principal;
    displayName: string;
}
export interface ExpenseEntry {
    id: bigint;
    date: string;
    time: Time;
    description: string;
    category: string;
    amount: bigint;
}
export interface AttendanceRecord {
    breaks: Array<BreakPeriod>;
    shifts: Array<Shift>;
    date: string;
    employeePrincipal: Principal;
    notes?: string;
}
export interface DirectMessage {
    id: bigint;
    createdAt: Time;
    text: string;
    fileName?: string;
    toPrincipal: Principal;
    fromPrincipal: Principal;
    fileUrl?: string;
}
export interface Note {
    id: bigint;
    text: string;
    lastUpdated: Time;
}
export interface ChannelMessage {
    id: bigint;
    channelId: bigint;
    createdAt: Time;
    text: string;
    fileName?: string;
    senderName: string;
    senderId: Principal;
    fileUrl?: string;
}
export interface Channel {
    id: bigint;
    name: string;
    createdAt: Time;
    createdBy: Principal;
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
export interface Department {
    id: bigint;
    name: string;
    createdBy: Principal;
}
export interface CalendarEvent {
    id: bigint;
    title: string;
    createdBy: Principal;
    isAdminOnly: boolean;
    description: string;
    dateTime: bigint;
}
export interface AttendanceDayEntry {
    status: AttendanceStatus;
    checkIn?: Time;
    note: string;
    checkOut?: Time;
    workingTime: bigint;
}
export interface TodoItem {
    id: bigint;
    text: string;
    completed: boolean;
    timestamp: Time;
}
export interface PublicUserInfo {
    principal: Principal;
    displayName: string;
}
export interface Holiday {
    id: bigint;
    holidayType: string;
    date: bigint;
    name: string;
    description: string;
    applicableDepartments: Array<bigint>;
}
export interface BroadcastMessage {
    id: bigint;
    createdAt: Time;
    createdBy: Principal;
    text: string;
}
export interface HolidayEntry {
    holidayType: HolidayType;
    date: string;
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
    leave = "leave",
    holiday = "holiday"
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
export enum UserStatusKind {
    away = "away",
    busy = "busy",
    offline = "offline",
    online = "online"
}
export interface backendInterface {
    addBreakToRecord(date: string, newBreak: BreakPeriod): Promise<void>;
    addCustomer(name: string, email: string, phoneNumber: string, address: string, company: string, workDetails: string): Promise<bigint>;
    addExpense(amount: bigint, category: string, description: string, date: string): Promise<bigint>;
    addGlobalHoliday(date: string, holidayType: HolidayType): Promise<void>;
    addHistory(entryType: HistoryType, details: string): Promise<bigint>;
    addTodo(text: string): Promise<bigint>;
    adminAssignUserToDepartment(user: Principal, departmentId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignToDepartment(departmentId: bigint): Promise<void>;
    createBroadcast(text: string): Promise<bigint>;
    createCalendarEvent(title: string, dateTime: bigint, description: string, isAdminOnly: boolean): Promise<bigint>;
    createChannel(name: string): Promise<bigint>;
    createDepartment(name: string): Promise<bigint>;
    createHoliday(name: string, date: bigint, holidayType: string, applicableDepartments: Array<bigint>, description: string): Promise<bigint>;
    createOrUpdateAttendanceRecord(date: string, shift: Shift, breaks: Array<BreakPeriod>, notes: string | null): Promise<void>;
    createReminder(message: string, date: string, time: string, repeatUntilDate: bigint | null): Promise<bigint>;
    deleteCalendarEvent(id: bigint): Promise<void>;
    deleteChannel(id: bigint): Promise<void>;
    deleteChannelMessage(messageId: bigint): Promise<void>;
    deleteCustomer(id: bigint): Promise<void>;
    deleteDepartment(id: bigint): Promise<void>;
    deleteDirectMessage(messageId: bigint): Promise<void>;
    deleteExpense(id: bigint): Promise<void>;
    deleteHoliday(id: bigint): Promise<void>;
    deleteNote(id: bigint): Promise<void>;
    deleteReminder(id: bigint): Promise<void>;
    deleteTodo(id: bigint): Promise<void>;
    dismissBroadcast(id: bigint): Promise<void>;
    editChannelMessage(messageId: bigint, newText: string): Promise<void>;
    editDirectMessage(messageId: bigint, newText: string): Promise<void>;
    getActiveBroadcasts(): Promise<Array<BroadcastMessage>>;
    getAllCalendarEvents(): Promise<Array<CalendarEvent>>;
    getAllRegisteredUsersPublic(): Promise<Array<PublicUserInfo>>;
    getAllUsersForAdmin(): Promise<Array<AdminUserInfo>>;
    getAttendanceConfig(): Promise<AttendanceConfig | null>;
    getAttendanceEntries(): Promise<Array<[string, AttendanceDayEntry]>>;
    getAttendanceRecords(): Promise<Array<[string, AttendanceRecord]>>;
    getAttendanceSummary(month: string): Promise<AttendanceSummary>;
    getBroadcastHistory(): Promise<Array<BroadcastMessage>>;
    getBudget(): Promise<Budget | null>;
    getCalendarEvents(): Promise<Array<CalendarEvent>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChannelMessages(channelId: bigint): Promise<Array<ChannelMessage>>;
    getCustomers(): Promise<Array<Customer>>;
    getDepartment(departmentId: bigint): Promise<Department | null>;
    getDirectMessages(otherPrincipal: Principal): Promise<Array<DirectMessage>>;
    getEmployeeAttendanceRecords(employee: Principal): Promise<Array<[string, AttendanceRecord]>>;
    getExpenses(): Promise<Array<ExpenseEntry>>;
    getFile(id: bigint): Promise<FileData | null>;
    getGlobalHolidays(): Promise<Array<HolidayEntry>>;
    getHistory(): Promise<Array<HistoryEntry>>;
    getHolidays(): Promise<Array<Holiday>>;
    getNotes(): Promise<Array<Note>>;
    getReminders(): Promise<Array<Reminder>>;
    getRemindersForDate(dateMs: bigint): Promise<Array<Reminder>>;
    getTodos(): Promise<Array<TodoItem>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserStatuses(): Promise<Array<UserStatusEntry>>;
    grantCustomDatePermission(user: Principal): Promise<void>;
    hasCustomDatePermission(): Promise<boolean>;
    isAdminInitialized(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    listChannels(): Promise<Array<Channel>>;
    listDepartments(): Promise<Array<Department>>;
    postChannelMessage(channelId: bigint, senderName: string, text: string, fileUrl: string | null, fileName: string | null): Promise<bigint>;
    removeGlobalHoliday(date: string): Promise<void>;
    removeUserCompletely(user: Principal): Promise<void>;
    requestApproval(): Promise<void>;
    revokeCustomDatePermission(user: Principal): Promise<void>;
    saveAttendanceConfig(config: AttendanceConfig): Promise<void>;
    saveAttendanceEntry(date: string, entry: AttendanceDayEntry): Promise<void>;
    saveBudget(budget: Budget): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveNote(id: bigint, text: string): Promise<bigint>;
    sendDirectMessage(toPrincipal: Principal, text: string, fileUrl: string | null, fileName: string | null): Promise<bigint>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setUserStatus(status: UserStatusKind): Promise<void>;
    toggleTodo(id: bigint): Promise<void>;
    updateCustomer(id: bigint, name: string, email: string, phoneNumber: string, address: string, company: string, workDetails: string): Promise<void>;
    updateDepartment(id: bigint, newName: string): Promise<void>;
    updateHoliday(id: bigint, name: string, date: bigint, holidayType: string, applicableDepartments: Array<bigint>, description: string): Promise<void>;
    updateReminder(id: bigint, message: string, date: string, time: string, repeatUntilDate: bigint | null): Promise<void>;
    uploadFile(filename: string, content: Uint8Array): Promise<bigint>;
}
