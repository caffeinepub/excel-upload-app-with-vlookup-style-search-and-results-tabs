import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import MixinAuthorization "authorization/MixinAuthorization";
import Migration "migration";

(with migration = Migration.run)
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
    repeatUntilDate : ?Int;
    createdAt : Time.Time;
    updatedAt : ?Time.Time;
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
    regularWorkingTime : Nat;
    weeklyOffDays : [Nat];
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

  public type WorkBriefRequest = {
    date : Text;
    status : AttendanceStatus;
    workBrief : Text;
  };

  public type Customer = {
    id : Nat;
    name : Text;
    email : Text;
    phoneNumber : Text;
    address : Text;
    company : Text;
    workDetails : Text;
    createdAt : Time.Time;
  };

  var nextCustomerId = 0;

  let budgets = Map.empty<Principal, Budget>();
  let expenses = Map.empty<Principal, Map.Map<Nat, ExpenseEntry>>();
  let histories = Map.empty<Principal, Map.Map<Nat, HistoryEntry>>();
  let todos = Map.empty<Principal, Map.Map<Nat, TodoItem>>();
  let notes = Map.empty<Principal, Map.Map<Nat, Note>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let reminders = Map.empty<Principal, Map.Map<Nat, Reminder>>();
  let customers = Map.empty<Principal, Map.Map<Nat, Customer>>();

  let attendanceConfigs = Map.empty<Principal, AttendanceConfig>();
  let attendanceEntries = Map.empty<Principal, Map.Map<Text, AttendanceDayEntry>>();
  let globalHolidays = Map.empty<Text, HolidayEntry>();

  let customDatePermissions = Map.empty<Principal, Bool>();

  var nextExpenseId = 0;
  var nextHistoryId = 0;
  var nextReminderId = 0;
  var nextTodoId = 0;
  var nextNoteId = 0;

  // Use Authorization & Approval mixins
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  let approvalState = UserApproval.initState(accessControlState);

  // Helper: get or init user customers map
  func getUserCustomersOrInit(user : Principal) : Map.Map<Nat, Customer> {
    switch (customers.get(user)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Nat, Customer>();
        customers.add(user, m);
        m;
      };
    };
  };

  func getUserCustomersOrTrap(user : Principal) : Map.Map<Nat, Customer> {
    switch (customers.get(user)) {
      case (?m) { m };
      case (null) { Runtime.trap("No customers found for user") };
    };
  };

  // Helper: get or init user reminders map
  func getUserRemindersOrInit(user : Principal) : Map.Map<Nat, Reminder> {
    switch (reminders.get(user)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Nat, Reminder>();
        reminders.add(user, m);
        m;
      };
    };
  };

  // Helper: get or init user expenses map
  func getUserExpensesOrInit(user : Principal) : Map.Map<Nat, ExpenseEntry> {
    switch (expenses.get(user)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Nat, ExpenseEntry>();
        expenses.add(user, m);
        m;
      };
    };
  };

  // Helper: get or init user todos map
  func getUserTodosOrInit(user : Principal) : Map.Map<Nat, TodoItem> {
    switch (todos.get(user)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Nat, TodoItem>();
        todos.add(user, m);
        m;
      };
    };
  };

  // Helper: get or init user notes map
  func getUserNotesOrInit(user : Principal) : Map.Map<Nat, Note> {
    switch (notes.get(user)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Nat, Note>();
        notes.add(user, m);
        m;
      };
    };
  };

  // Helper: get or init user histories map
  func getUserHistoriesOrInit(user : Principal) : Map.Map<Nat, HistoryEntry> {
    switch (histories.get(user)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Nat, HistoryEntry>();
        histories.add(user, m);
        m;
      };
    };
  };

  // ── User Profile ──────────────────────────────────────────────────────────

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can get profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // ── Custom Date Permissions ───────────────────────────────────────────────

  // Requires #user permission: guests should not be able to query permissions
  public query ({ caller }) func hasCustomDatePermission() : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can check custom date permissions");
    };
    switch (customDatePermissions.get(caller)) {
      case (?true) { true };
      case (_) { false };
    };
  };

  public shared ({ caller }) func grantCustomDatePermission(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can grant custom date permissions");
    };
    customDatePermissions.add(user, true);
  };

  public shared ({ caller }) func revokeCustomDatePermission(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can revoke custom date permissions");
    };
    customDatePermissions.remove(user);
  };

  // ── Approval ──────────────────────────────────────────────────────────────

  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    // Any caller (including guests) can request approval — no auth check needed
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can set approval status");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list approvals");
    };
    UserApproval.listApprovals(approvalState);
  };

  // ── Customer Management ───────────────────────────────────────────────────

  public shared ({ caller }) func addCustomer(name : Text, email : Text, phoneNumber : Text, address : Text, company : Text, workDetails : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add customers");
    };

    if (name.size() == 0) {
      Runtime.trap("Customer name cannot be empty");
    };

    let customer : Customer = {
      id = nextCustomerId;
      name;
      email;
      phoneNumber;
      address;
      company;
      workDetails;
      createdAt = Time.now();
    };

    let userCustomers = getUserCustomersOrInit(caller);
    userCustomers.add(customer.id, customer);

    nextCustomerId += 1;
    customer.id;
  };

  public shared ({ caller }) func updateCustomer(id : Nat, name : Text, email : Text, phoneNumber : Text, address : Text, company : Text, workDetails : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update customers");
    };

    let userCustomers = getUserCustomersOrTrap(caller);

    switch (userCustomers.get(id)) {
      case (null) { Runtime.trap("Customer not found") };
      case (?existingCustomer) {
        let updatedCustomer : Customer = {
          existingCustomer with
          name;
          email;
          phoneNumber;
          address;
          company;
          workDetails;
        };
        userCustomers.add(id, updatedCustomer);
      };
    };
  };

  public shared ({ caller }) func deleteCustomer(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete customers");
    };

    let userCustomers = getUserCustomersOrTrap(caller);
    if (not userCustomers.containsKey(id)) { Runtime.trap("Customer not found") };
    userCustomers.remove(id);
  };

  public query ({ caller }) func getCustomers() : async [Customer] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view customers");
    };
    switch (customers.get(caller)) {
      case (null) { [] };
      case (?userCustomers) { userCustomers.values().toArray() };
    };
  };

  // ── Reminder Management ───────────────────────────────────────────────────

  public shared ({ caller }) func createReminder(message : Text, date : Text, time : Text, repeatUntilDate : ?Int) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create reminders");
    };

    if (message.size() == 0) {
      Runtime.trap("Reminder message cannot be empty");
    };

    let reminder : Reminder = {
      id = nextReminderId;
      message;
      date;
      time;
      repeatUntilDate;
      createdAt = Time.now();
      updatedAt = null;
    };

    let userReminders = getUserRemindersOrInit(caller);
    userReminders.add(reminder.id, reminder);

    nextReminderId += 1;
    reminder.id;
  };

  public shared ({ caller }) func updateReminder(id : Nat, message : Text, date : Text, time : Text, repeatUntilDate : ?Int) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update reminders");
    };

    let userReminders = switch (reminders.get(caller)) {
      case (?m) { m };
      case (null) { Runtime.trap("Reminder not found") };
    };

    switch (userReminders.get(id)) {
      case (null) { Runtime.trap("Reminder not found") };
      case (?existing) {
        let updated : Reminder = {
          existing with
          message;
          date;
          time;
          repeatUntilDate;
          updatedAt = ?Time.now();
        };
        userReminders.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteReminder(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete reminders");
    };

    let userReminders = switch (reminders.get(caller)) {
      case (?m) { m };
      case (null) { Runtime.trap("Reminder not found") };
    };

    if (not userReminders.containsKey(id)) { Runtime.trap("Reminder not found") };
    userReminders.remove(id);
  };

  public query ({ caller }) func getReminders() : async [Reminder] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view reminders");
    };
    switch (reminders.get(caller)) {
      case (null) { [] };
      case (?userReminders) { userReminders.values().toArray() };
    };
  };

  // Returns all reminders active on a given date (including daily-repeat reminders).
  // dateMs: the target date as milliseconds since epoch (Int).
  public query ({ caller }) func getRemindersForDate(dateMs : Int) : async [Reminder] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view reminders");
    };

    let dayMs : Int = 86_400_000; // milliseconds in a day

    switch (reminders.get(caller)) {
      case (null) { [] };
      case (?userReminders) {
        // We need to compare dates. Reminders store date as Text (ISO date string).
        // We use the repeatUntilDate (Int, ms) for range comparison.
        // For non-repeating reminders, only include if reminder date matches exactly.
        // For repeating reminders, include if startDate <= dateMs <= repeatUntilDate.
        // Since date is stored as Text, we rely on repeatUntilDate for range logic.
        // We'll filter by checking if the reminder's createdAt day aligns or
        // if repeatUntilDate covers the requested date.
        // NOTE: For full date-string comparison we'd need a date parser.
        // We use repeatUntilDate (ms) and createdAt as the range boundaries.
        let result = userReminders.values().filter(
          func(r : Reminder) : Bool {
            switch (r.repeatUntilDate) {
              case (null) {
                // Non-repeating: check if reminder date (ms from createdAt rounded to day)
                // matches the requested date day.
                // We compare by day boundary: same calendar day.
                let reminderDay = r.createdAt / (dayMs * 1_000_000); // createdAt is nanoseconds
                let targetDay = dateMs / dayMs;
                reminderDay == targetDay;
              };
              case (?untilMs) {
                // Repeating daily: active if startDay <= targetDay <= untilDay
                let startDay = r.createdAt / (dayMs * 1_000_000);
                let untilDay = untilMs / dayMs;
                let targetDay = dateMs / dayMs;
                startDay <= targetDay and targetDay <= untilDay;
              };
            };
          }
        ).toArray();
        result;
      };
    };
  };

  // ── Budget Management ─────────────────────────────────────────────────────

  public shared ({ caller }) func saveBudget(budget : Budget) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save budgets");
    };
    budgets.add(caller, budget);
  };

  public query ({ caller }) func getBudget() : async ?Budget {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view budgets");
    };
    budgets.get(caller);
  };

  // ── Expense Management ────────────────────────────────────────────────────

  public shared ({ caller }) func addExpense(amount : Nat, category : Text, description : Text, date : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add expenses");
    };

    let expense : ExpenseEntry = {
      id = nextExpenseId;
      amount;
      category;
      description;
      date;
      time = Time.now();
    };

    let userExpenses = getUserExpensesOrInit(caller);
    userExpenses.add(expense.id, expense);

    nextExpenseId += 1;
    expense.id;
  };

  public shared ({ caller }) func deleteExpense(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete expenses");
    };

    let userExpenses = switch (expenses.get(caller)) {
      case (?m) { m };
      case (null) { Runtime.trap("Expense not found") };
    };

    if (not userExpenses.containsKey(id)) { Runtime.trap("Expense not found") };
    userExpenses.remove(id);
  };

  public query ({ caller }) func getExpenses() : async [ExpenseEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    switch (expenses.get(caller)) {
      case (null) { [] };
      case (?userExpenses) { userExpenses.values().toArray() };
    };
  };

  // ── Todo Management ───────────────────────────────────────────────────────

  public shared ({ caller }) func addTodo(text : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add todos");
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
    todo.id;
  };

  public shared ({ caller }) func toggleTodo(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update todos");
    };

    let userTodos = switch (todos.get(caller)) {
      case (?m) { m };
      case (null) { Runtime.trap("Todo not found") };
    };

    switch (userTodos.get(id)) {
      case (null) { Runtime.trap("Todo not found") };
      case (?existing) {
        userTodos.add(id, { existing with completed = not existing.completed });
      };
    };
  };

  public shared ({ caller }) func deleteTodo(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete todos");
    };

    let userTodos = switch (todos.get(caller)) {
      case (?m) { m };
      case (null) { Runtime.trap("Todo not found") };
    };

    if (not userTodos.containsKey(id)) { Runtime.trap("Todo not found") };
    userTodos.remove(id);
  };

  public query ({ caller }) func getTodos() : async [TodoItem] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view todos");
    };
    switch (todos.get(caller)) {
      case (null) { [] };
      case (?userTodos) { userTodos.values().toArray() };
    };
  };

  // ── Notes Management ──────────────────────────────────────────────────────

  public shared ({ caller }) func saveNote(id : Nat, text : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save notes");
    };

    let userNotes = getUserNotesOrInit(caller);
    let noteId = switch (userNotes.get(id)) {
      case (?_) { id };
      case (null) { nextNoteId };
    };

    let note : Note = {
      id = noteId;
      text;
      lastUpdated = Time.now();
    };

    userNotes.add(noteId, note);

    if (noteId == nextNoteId) {
      nextNoteId += 1;
    };

    noteId;
  };

  public shared ({ caller }) func deleteNote(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete notes");
    };

    let userNotes = switch (notes.get(caller)) {
      case (?m) { m };
      case (null) { Runtime.trap("Note not found") };
    };

    if (not userNotes.containsKey(id)) { Runtime.trap("Note not found") };
    userNotes.remove(id);
  };

  public query ({ caller }) func getNotes() : async [Note] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view notes");
    };
    switch (notes.get(caller)) {
      case (null) { [] };
      case (?userNotes) { userNotes.values().toArray() };
    };
  };

  // ── History Management ────────────────────────────────────────────────────

  public shared ({ caller }) func addHistory(entryType : HistoryType, details : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add history entries");
    };

    let entry : HistoryEntry = {
      id = nextHistoryId;
      user = caller;
      timestamp = Time.now();
      entryType;
      details;
    };

    let userHistories = getUserHistoriesOrInit(caller);
    userHistories.add(entry.id, entry);

    nextHistoryId += 1;
    entry.id;
  };

  public query ({ caller }) func getHistory() : async [HistoryEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view history");
    };
    switch (histories.get(caller)) {
      case (null) { [] };
      case (?userHistories) { userHistories.values().toArray() };
    };
  };

  // ── Attendance Management ─────────────────────────────────────────────────

  public shared ({ caller }) func saveAttendanceConfig(config : AttendanceConfig) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save attendance config");
    };
    attendanceConfigs.add(caller, config);
  };

  public query ({ caller }) func getAttendanceConfig() : async ?AttendanceConfig {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view attendance config");
    };
    attendanceConfigs.get(caller);
  };

  public shared ({ caller }) func saveAttendanceEntry(date : Text, entry : AttendanceDayEntry) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save attendance entries");
    };

    let userEntries = switch (attendanceEntries.get(caller)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Text, AttendanceDayEntry>();
        attendanceEntries.add(caller, m);
        m;
      };
    };
    userEntries.add(date, entry);
  };

  public query ({ caller }) func getAttendanceEntries() : async [(Text, AttendanceDayEntry)] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view attendance entries");
    };
    switch (attendanceEntries.get(caller)) {
      case (null) { [] };
      case (?userEntries) { userEntries.entries().toArray() };
    };
  };

  public query ({ caller }) func getAttendanceSummary(month : Text) : async AttendanceSummary {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view attendance summary");
    };

    let userEntries = switch (attendanceEntries.get(caller)) {
      case (null) { return { totalDays = 0; presentDays = 0; leaveDays = 0; halfDays = 0; festivalDays = 0; companyLeaveDays = 0; weeklyOffDays = 0; totalWorkingTime = 0; breakdown = [] } };
      case (?m) { m };
    };

    var totalDays = 0;
    var presentDays = 0;
    var leaveDays = 0;
    var halfDays = 0;
    var festivalDays = 0;
    var companyLeaveDays = 0;
    var weeklyOffDays = 0;
    var totalWorkingTime = 0;

    let breakdown = userEntries.entries().filter(
      func((date, _entry) : (Text, AttendanceDayEntry)) : Bool {
        let monthText : Text = month;
        date.startsWith(#text monthText);
      }
    ).toArray();

    for ((_date, entry) in breakdown.vals()) {
      totalDays += 1;
      totalWorkingTime += entry.workingTime;
      switch (entry.status) {
        case (#present) { presentDays += 1 };
        case (#leave) { leaveDays += 1 };
        case (#halfDay) { halfDays += 1 };
        case (#festival) { festivalDays += 1 };
        case (#companyLeave) { companyLeaveDays += 1 };
        case (#weeklyOff) { weeklyOffDays += 1 };
      };
    };

    {
      totalDays;
      presentDays;
      leaveDays;
      halfDays;
      festivalDays;
      companyLeaveDays;
      weeklyOffDays;
      totalWorkingTime;
      breakdown;
    };
  };

  // ── Holiday Management ────────────────────────────────────────────────────

  public shared ({ caller }) func addGlobalHoliday(date : Text, holidayType : HolidayType) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add global holidays");
    };
    globalHolidays.add(date, { date; holidayType });
  };

  public shared ({ caller }) func removeGlobalHoliday(date : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can remove global holidays");
    };
    globalHolidays.remove(date);
  };

  public query ({ caller }) func getGlobalHolidays() : async [HolidayEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view holidays");
    };
    globalHolidays.values().toArray();
  };
};
