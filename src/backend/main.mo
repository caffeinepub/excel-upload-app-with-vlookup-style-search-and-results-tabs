import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  public type AttendanceDayEntry = {
    checkIn : ?Time.Time;
    checkOut : ?Time.Time;
    note : Text;
    status : AttendanceStatus;
    workingTime : Nat;
  };

  public type UserProfile = { name : Text };
  public type Budget = {
    monthlyLimit : Nat;
    dayLimit : Nat;
    savingsGoal : Nat;
    lastUpdated : Text;
  };

  public type ExpenseEntry = {
    id : Nat;
    amount : Nat;
    category : Text;
    description : Text;
    date : Text;
    time : Time.Time;
  };

  public type Reminder = {
    id : Nat;
    message : Text;
    date : Text;
    time : Text;
    createdAt : Time.Time;
  };

  public type HistoryType = {
    #upload;
    #search;
    #results;
    #updateChecking;
    #budgetChange;
    #expenseChange;
  };

  public type HistoryEntry = {
    id : Nat;
    user : Principal;
    timestamp : Time.Time;
    entryType : HistoryType;
    details : Text;
  };

  public type TodoItem = {
    id : Nat;
    text : Text;
    completed : Bool;
    timestamp : Time.Time;
  };

  public type Note = {
    id : Nat;
    text : Text;
    lastUpdated : Time.Time;
  };

  public type AttendanceStatus = {
    #present;
    #leave;
    #halfDay;
    #festival;
    #companyLeave;
    #weeklyOff;
  };

  public type AttendanceConfig = {
    regularWorkingTime : Nat; // seconds
    weeklyOffDays : [Nat]; // 0-6 for Sun-Sat
    leavePolicy : Nat;
  };

  public type HolidayType = {
    #festival;
    #companyLeave;
  };

  public type HolidayEntry = {
    date : Text;
    holidayType : HolidayType;
  };

  public type AttendanceSummary = {
    totalDays : Nat;
    presentDays : Nat;
    leaveDays : Nat;
    halfDays : Nat;
    festivalDays : Nat;
    companyLeaveDays : Nat;
    weeklyOffDays : Nat;
    totalWorkingTime : Nat;
    breakdown : [(Text, AttendanceDayEntry)];
  };

  let budgets = Map.empty<Principal, Budget>();
  let expenses = Map.empty<Principal, Map.Map<Nat, ExpenseEntry>>();
  let histories = Map.empty<Principal, Map.Map<Nat, HistoryEntry>>();
  let todos = Map.empty<Principal, Map.Map<Nat, TodoItem>>();
  let notes = Map.empty<Principal, Map.Map<Nat, Note>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let reminders = Map.empty<Principal, Map.Map<Nat, Reminder>>();

  let attendanceConfigs = Map.empty<Principal, AttendanceConfig>();
  let attendanceEntries = Map.empty<Principal, Map.Map<Text, AttendanceDayEntry>>();
  let globalHolidays = Map.empty<Text, HolidayEntry>();

  var nextExpenseId = 0;
  var nextHistoryId = 0;
  var nextReminderId = 0;
  var nextTodoId = 0;
  var nextNoteId = 0;

  // Authorization & Approval
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  let approvalState = UserApproval.initState(accessControlState);

  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can approve accounts");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access approval data");
    };
    UserApproval.listApprovals(approvalState);
  };

  // To‑Do Functions
  public shared ({ caller }) func addTodo(text : Text) : async TodoItem {
    authorizeUser(caller);

    if (text.size() == 0) {
      Runtime.trap("To‑Do text cannot be empty");
    };

    let todo : TodoItem = {
      id = nextTodoId;
      text;
      completed = false;
      timestamp = Time.now();
    };

    let userTodos = getUserTodosOrInit(caller);
    userTodos.add(todo.id, todo);
    nextTodoId += 1;
    todo;
  };

  public query ({ caller }) func getTodos() : async [TodoItem] {
    authorizeUser(caller);
    switch (todos.get(caller)) {
      case (null) { [] };
      case (?userTodos) { userTodos.values().toArray() };
    };
  };

  public shared ({ caller }) func toggleTodo(id : Nat) : async () {
    authorizeUser(caller);
    let userTodos = getUserTodosOrTrap(caller);

    switch (userTodos.get(id)) {
      case (null) {
        Runtime.trap("To‑Do not found");
      };
      case (?todo) {
        let updatedTodo : TodoItem = {
          id = todo.id;
          text = todo.text;
          completed = not todo.completed;
          timestamp = Time.now();
        };
        userTodos.add(id, updatedTodo);
      };
    };
  };

  // Notes Functions
  public shared ({ caller }) func addNote(text : Text) : async Note {
    authorizeUser(caller);

    if (text.size() == 0) {
      Runtime.trap("Note text cannot be empty");
    };

    let note : Note = {
      id = nextNoteId;
      text;
      lastUpdated = Time.now();
    };

    let userNotes = getUserNotesOrInit(caller);
    userNotes.add(note.id, note);

    nextNoteId += 1;
    note;
  };

  public shared ({ caller }) func deleteNote(id : Nat) : async () {
    authorizeUser(caller);

    switch (notes.get(caller)) {
      case (null) { Runtime.trap("No notes found for caller") };
      case (?userNotes) {
        if (not userNotes.containsKey(id)) {
          Runtime.trap("Note not found");
        };
        userNotes.remove(id);
      };
    };
  };

  public query ({ caller }) func getNotes() : async [Note] {
    authorizeUser(caller);

    switch (notes.get(caller)) {
      case (null) { [] };
      case (?userNotes) { userNotes.values().toArray() };
    };
  };

  // Attendance/Holiday Functions
  public shared ({ caller }) func createHoliday(date : Text, holidayType : HolidayType) : async () {
    authorizeAdmin(caller);
    let newHoliday : HolidayEntry = { date; holidayType };
    globalHolidays.add(date, newHoliday);
  };

  public shared ({ caller }) func updateHoliday(date : Text, holidayType : HolidayType) : async () {
    authorizeAdmin(caller);

    switch (globalHolidays.get(date)) {
      case (null) { Runtime.trap("Error: Holiday does not exist for given date") };
      case (?_existingHoliday) {
        let updatedHoliday : HolidayEntry = { date; holidayType };
        globalHolidays.add(date, updatedHoliday);
      };
    };
  };

  public shared ({ caller }) func deleteHoliday(date : Text) : async () {
    authorizeAdmin(caller);

    switch (globalHolidays.get(date)) {
      case (null) { Runtime.trap("Error: Holiday does not exist for given date") };
      case (?_existingHoliday) { globalHolidays.remove(date) };
    };
  };

  public query ({ caller }) func getHoliday(date : Text) : async ?HolidayEntry {
    authorizeUser(caller);
    globalHolidays.get(date);
  };

  public query ({ caller }) func getAllHolidays() : async [HolidayEntry] {
    authorizeUser(caller);
    globalHolidays.values().toArray();
  };

  // Attendance Entries
  public shared ({ caller }) func setAttendanceConfig(config : AttendanceConfig) : async () {
    authorizeUser(caller);
    attendanceConfigs.add(caller, config);
  };

  public query ({ caller }) func getAttendanceConfig() : async ?AttendanceConfig {
    authorizeUser(caller);
    attendanceConfigs.get(caller);
  };

  public shared ({ caller }) func checkIn(date : Text, status : AttendanceStatus) : async () {
    authorizeUser(caller);

    let newEntry : AttendanceDayEntry = {
      checkIn = ?Time.now();
      checkOut = null;
      note = "";
      status;
      workingTime = 0;
    };

    let userEntries = getUserAttendanceOrInit(caller);
    userEntries.add(date, newEntry);
  };

  public shared ({ caller }) func checkOut(date : Text) : async () {
    authorizeUser(caller);
    let userEntries = getUserAttendanceOrInit(caller);

    switch (userEntries.get(date)) {
      case (null) { Runtime.trap("No check-in found for given date") };
      case (?existing) {
        let outTime = Time.now();
        let workingTime = switch (existing.checkIn) {
          case (?inTime) { computeDuration(inTime, outTime) };
          case (null) { 0 };
        };

        let updatedEntry : AttendanceDayEntry = {
          checkIn = existing.checkIn;
          checkOut = ?outTime;
          note = existing.note;
          status = existing.status;
          workingTime;
        };

        userEntries.add(date, updatedEntry);
      };
    };
  };

  public query ({ caller }) func getWorkingTime(date : Text) : async Nat {
    authorizeUser(caller);
    let userEntries = getUserAttendanceOrInit(caller);

    switch (userEntries.get(date)) {
      case (null) { 0 };
      case (?entry) { entry.workingTime };
    };
  };

  public query ({ caller }) func getAttendanceSummary(range : (Text, Text)) : async AttendanceSummary {
    authorizeUser(caller);
    let userEntries = getUserAttendanceOrInit(caller);

    let filtered = userEntries.filter(
      func(date, _) { date >= range.0 and date <= range.1 }
    );

    let breakdown = filtered.toArray();
    let totalWorkingTime = filtered.toArray().foldLeft(
      0,
      func(sum, entry) { sum + entry.1.workingTime },
    );

    let (presentCount, leaveCount, halfDayCount, festivalCount, companyLeaveCount, weeklyOffCount) = breakdown.foldLeft(
      (0, 0, 0, 0, 0, 0),
      func((p, l, h, f, c, w), entry) {
        switch (entry.1.status) {
          case (#present) { (p + 1, l, h, f, c, w) };
          case (#leave) { (p, l + 1, h, f, c, w) };
          case (#halfDay) { (p, l, h + 1, f, c, w) };
          case (#festival) { (p, l, h, f + 1, c, w) };
          case (#companyLeave) { (p, l, h, f, c + 1, w) };
          case (#weeklyOff) { (p, l, h, f, c, w + 1) };
        };
      },
    );

    {
      totalDays = filtered.size();
      presentDays = presentCount;
      leaveDays = leaveCount;
      halfDays = halfDayCount;
      festivalDays = festivalCount;
      companyLeaveDays = companyLeaveCount;
      weeklyOffDays = weeklyOffCount;
      totalWorkingTime;
      breakdown;
    };
  };

  public query ({ caller }) func getAttendanceEntry(date : Text) : async ?AttendanceDayEntry {
    authorizeUser(caller);
    let userEntries = getUserAttendanceOrInit(caller);
    userEntries.get(date);
  };

  public shared ({ caller }) func editAttendanceEntry(date : Text, updatedEntry : AttendanceDayEntry) : async () {
    authorizeUser(caller);

    let userEntries = getUserAttendanceOrInit(caller);

    switch (userEntries.get(date)) {
      case (null) { Runtime.trap("No existing entry found for the given date") };
      case (?existingEntry) {
        let mergedEntry : AttendanceDayEntry = {
          checkIn = updatedEntry.checkIn;
          checkOut = updatedEntry.checkOut;
          note = updatedEntry.note;
          status = updatedEntry.status;
          workingTime = calculateWorkingTime(updatedEntry.checkIn, updatedEntry.checkOut);
        };
        userEntries.add(date, mergedEntry);
      };
    };
  };

  public shared ({ caller }) func deleteAttendanceEntry(date : Text) : async () {
    authorizeUser(caller);

    let userEntries = getUserAttendanceOrInit(caller);

    switch (userEntries.get(date)) {
      case (null) { Runtime.trap("No entry found for the given date") };
      case (?_) { userEntries.remove(date) };
    };
  };

  public query ({ caller }) func getAllAttendanceEntries() : async [(Text, AttendanceDayEntry)] {
    authorizeUser(caller);

    let userEntries = getUserAttendanceOrInit(caller);

    userEntries.toArray();
  };

  func calculateWorkingTime(checkIn : ?Time.Time, checkOut : ?Time.Time) : Nat {
    let checkInTime = switch (checkIn) {
      case (null) { 0 };
      case (?time) { time };
    };

    let checkOutTime = switch (checkOut) {
      case (null) { 0 };
      case (?time) { time };
    };

    if (checkInTime > 0 and checkOutTime > checkInTime) {
      ((checkOutTime - checkInTime) / 1_000_000_000).toNat();
    } else {
      0;
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    authorizeUser(caller);
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    authorizeUser(caller);
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    authorizeUser(caller);
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func saveBudget(monthlyLimit : Nat, dayLimit : Nat, savingsGoal : Nat, lastUpdated : Text) : async () {
    authorizeUser(caller);
    let newBudget : Budget = {
      monthlyLimit;
      dayLimit;
      savingsGoal;
      lastUpdated;
    };
    budgets.add(caller, newBudget);
  };

  public query ({ caller }) func getBudget() : async ?Budget {
    authorizeUser(caller);
    budgets.get(caller);
  };

  public shared ({ caller }) func addExpense(amount : Nat, category : Text, description : Text, date : Text) : async Nat {
    authorizeUser(caller);
    let newExpense : ExpenseEntry = {
      id = nextExpenseId;
      amount;
      category;
      description;
      date;
      time = Time.now();
    };

    let userExpenses = getUserExpensesOrInit(caller);
    userExpenses.add(newExpense.id, newExpense);

    nextExpenseId += 1;
    addHistoryEntry(caller, #expenseChange, "Expense added: " # description);

    newExpense.id;
  };

  public shared ({ caller }) func editExpense(id : Nat, amount : Nat, category : Text, description : Text, date : Text) : async () {
    authorizeUser(caller);

    let userExpenses = getUserExpensesOrTrap(caller);

    switch (userExpenses.get(id)) {
      case (null) { Runtime.trap("Expense not found or does not belong to caller") };
      case (?_existingExpense) {
        let updatedExpense : ExpenseEntry = {
          id;
          amount;
          category;
          description;
          date;
          time = Time.now();
        };
        userExpenses.add(id, updatedExpense);
      };
    };
  };

  public shared ({ caller }) func deleteExpense(id : Nat) : async () {
    authorizeUser(caller);

    switch (expenses.get(caller)) {
      case (null) { Runtime.trap("Expense not found or does not belong to caller") };
      case (?userExpenses) {
        switch (userExpenses.get(id)) {
          case (null) { Runtime.trap("Expense not found or does not belong to caller") };
          case (?_) { userExpenses.remove(id) };
        };
      };
    };
  };

  public query ({ caller }) func getExpensesForCaller() : async [ExpenseEntry] {
    authorizeUser(caller);

    switch (expenses.get(caller)) {
      case (null) { [] };
      case (?userExpenses) { userExpenses.values().toArray() };
    };
  };

  public query ({ caller }) func filterByType(type_ : Text) : async [ExpenseEntry] {
    authorizeUser(caller);

    switch (expenses.get(caller)) {
      case (null) { [] };
      case (?userExpenses) {
        let filtered = userExpenses.values().toArray().filter(
          func(e) { e.category == type_ }
        );
        filtered;
      };
    };
  };

  public query ({ caller }) func filterByDate(date : Text) : async [ExpenseEntry] {
    authorizeUser(caller);

    switch (expenses.get(caller)) {
      case (null) { [] };
      case (?userExpenses) {
        let filtered = userExpenses.values().toArray().filter(
          func(e) { e.date == date }
        );
        filtered;
      };
    };
  };

  public shared ({ caller }) func addHistory(entryType : HistoryType, details : Text) : async Nat {
    authorizeUser(caller);

    let historyEntry : HistoryEntry = {
      id = nextHistoryId;
      user = caller;
      timestamp = Time.now();
      entryType;
      details;
    };

    let userHistory = getUserHistoryOrInit(caller);
    userHistory.add(historyEntry.id, historyEntry);

    nextHistoryId += 1;
    historyEntry.id;
  };

  public query ({ caller }) func getHistory() : async [HistoryEntry] {
    authorizeUser(caller);

    switch (histories.get(caller)) {
      case (null) { [] };
      case (?userHistory) { userHistory.values().toArray() };
    };
  };

  public query ({ caller }) func getFilteredHistory(historyType : HistoryType) : async [HistoryEntry] {
    authorizeUser(caller);

    switch (histories.get(caller)) {
      case (null) { [] };
      case (?userHistory) {
        userHistory.values().toArray().filter(
          func(e) { e.entryType == historyType }
        );
      };
    };
  };

  public shared ({ caller }) func clearHistory() : async () {
    authorizeUser(caller);
    histories.remove(caller);
  };

  public query func getVersion() : async Text { "V1.0.1" };

  public shared ({ caller }) func clearAllData() : async () {
    authorizeAdmin(caller);

    budgets.clear();
    expenses.clear();
    histories.clear();
    todos.clear();
    notes.clear();
    userProfiles.clear();
    reminders.clear();
    nextExpenseId := 0;
    nextHistoryId := 0;
    nextReminderId := 0;
    nextTodoId := 0;
    nextNoteId := 0;
  };

  public shared ({ caller }) func addReminder(message : Text, date : Text, time : Text) : async Nat {
    authorizeUser(caller);

    let reminder : Reminder = {
      id = nextReminderId;
      message;
      date;
      time;
      createdAt = Time.now();
    };

    let userReminders = getUserRemindersOrInit(caller);
    userReminders.add(reminder.id, reminder);

    addHistoryEntry(caller, #expenseChange, "Reminder added: " # message);

    nextReminderId += 1;
    reminder.id;
  };

  public shared ({ caller }) func deleteReminder(id : Nat) : async () {
    authorizeUser(caller);

    switch (reminders.get(caller)) {
      case (null) { Runtime.trap("Reminder not found or does not belong to caller") };
      case (?userReminders) {
        switch (userReminders.get(id)) {
          case (null) { Runtime.trap("Reminder not found or does not belong to caller") };
          case (?_) { userReminders.remove(id) };
        };
      };
    };
  };

  public query ({ caller }) func getRemindersForCaller() : async [Reminder] {
    authorizeUser(caller);

    switch (reminders.get(caller)) {
      case (null) { [] };
      case (?userReminders) { userReminders.values().toArray() };
    };
  };

  func authorizeUser(caller : Principal) {
    if (not (UserApproval.isApproved(approvalState, caller) or AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only approved users can perform this action");
    };
  };

  func authorizeAdmin(caller : Principal) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
  };

  func getUserTodosOrInit(user : Principal) : Map.Map<Nat, TodoItem> {
    switch (todos.get(user)) {
      case (null) {
        let newMap = Map.empty<Nat, TodoItem>();
        todos.add(user, newMap);
        newMap;
      };
      case (?existingMap) { existingMap };
    };
  };

  func getUserTodosOrTrap(user : Principal) : Map.Map<Nat, TodoItem> {
    switch (todos.get(user)) {
      case (null) { Runtime.trap("No to-dos found for caller") };
      case (?existingMap) { existingMap };
    };
  };

  func getUserNotesOrInit(user : Principal) : Map.Map<Nat, Note> {
    switch (notes.get(user)) {
      case (null) {
        let newMap = Map.empty<Nat, Note>();
        notes.add(user, newMap);
        newMap;
      };
      case (?existingMap) { existingMap };
    };
  };

  func getUserAttendanceOrInit(user : Principal) : Map.Map<Text, AttendanceDayEntry> {
    switch (attendanceEntries.get(user)) {
      case (null) {
        let newMap = Map.empty<Text, AttendanceDayEntry>();
        attendanceEntries.add(user, newMap);
        newMap;
      };
      case (?existingMap) { existingMap };
    };
  };

  func computeDuration(start : Time.Time, end : Time.Time) : Nat {
    let duration = end - start;
    if (duration < 0) { 0 } else if (duration > 2_592_000_000_000) { 0 } else {
      (duration / 1_000_000_000).toNat();
    };
  };

  func getUserExpensesOrInit(user : Principal) : Map.Map<Nat, ExpenseEntry> {
    switch (expenses.get(user)) {
      case (null) {
        let newMap = Map.empty<Nat, ExpenseEntry>();
        expenses.add(user, newMap);
        newMap;
      };
      case (?existingMap) { existingMap };
    };
  };

  func getUserExpensesOrTrap(user : Principal) : Map.Map<Nat, ExpenseEntry> {
    switch (expenses.get(user)) {
      case (null) { Runtime.trap("Expense not found or does not belong to caller") };
      case (?existingMap) { existingMap };
    };
  };

  func getUserHistoryOrInit(user : Principal) : Map.Map<Nat, HistoryEntry> {
    switch (histories.get(user)) {
      case (null) {
        let newMap = Map.empty<Nat, HistoryEntry>();
        histories.add(user, newMap);
        newMap;
      };
      case (?existingMap) { existingMap };
    };
  };

  func getUserRemindersOrInit(user : Principal) : Map.Map<Nat, Reminder> {
    switch (reminders.get(user)) {
      case (null) {
        let newMap = Map.empty<Nat, Reminder>();
        reminders.add(user, newMap);
        newMap;
      };
      case (?existingMap) { existingMap };
    };
  };

  func addHistoryEntry(user : Principal, entryType : HistoryType, details : Text) {
    let historyEntry : HistoryEntry = {
      id = nextHistoryId;
      user;
      timestamp = Time.now();
      entryType;
      details;
    };

    let userHistory = getUserHistoryOrInit(user);
    userHistory.add(historyEntry.id, historyEntry);

    nextHistoryId += 1;
  };
};
