import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Blob "mo:core/Blob";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Migration "migration";

(with migration = Migration.run)
actor {
  include MixinStorage();

  public type AttendanceDayEntry = {
    checkIn : ?Time.Time;
    checkOut : ?Time.Time;
    note : Text;
    status : AttendanceStatus;
    workingTime : Nat;
  };

  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type UserProfile = {
    displayName : Text;
    profilePicture : ?Blob;
    departmentId : ?Nat;
  };

  public type Department = {
    id : Nat;
    name : Text;
    createdBy : Principal;
  };

  public type Budget = {
    monthlyLimit : Nat;
    dayLimit : Nat;
    savingsGoal : Nat;
    lastUpdated : Text;
  };

  public type Shift = {
    clockIn : Time.Time;
    clockOut : ?Time.Time;
  };

  public type BreakPeriod = {
    start : Time.Time;
    end : Time.Time;
  };

  public type AttendanceRecord = {
    employeePrincipal : Principal;
    date : Text; // YYYY-MM-DD
    shifts : [Shift];
    breaks : [BreakPeriod];
    notes : ?Text;
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
    #holiday;
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

  // ── New Types ─────────────────────────────────────────────────────────────

  public type CalendarEvent = {
    id : Nat;
    title : Text;
    dateTime : Nat;
    description : Text;
    isAdminOnly : Bool;
    createdBy : Principal;
  };

  public type BroadcastMessage = {
    id : Nat;
    text : Text;
    createdAt : Time.Time;
    createdBy : Principal;
  };

  public type Channel = {
    id : Nat;
    name : Text;
    createdBy : Principal;
    createdAt : Time.Time;
  };

  public type ChannelMessage = {
    id : Nat;
    channelId : Nat;
    senderId : Principal;
    senderName : Text;
    text : Text;
    fileUrl : ?Text;
    fileName : ?Text;
    createdAt : Time.Time;
  };

  public type DirectMessage = {
    id : Nat;
    fromPrincipal : Principal;
    toPrincipal : Principal;
    text : Text;
    fileUrl : ?Text;
    fileName : ?Text;
    createdAt : Time.Time;
  };

  public type FileData = {
    id : Nat;
    uploader : Principal;
    filename : Text;
    content : Blob;
    uploadedAt : Time.Time;
  };

  public type UserStatusKind = {
    #online;
    #away;
    #busy;
    #offline;
  };

  public type UserStatusEntry = {
    principal : Principal;
    status : UserStatusKind;
    updatedAt : Time.Time;
  };

  public type Holiday = {
    id : Nat;
    name : Text;
    date : Int; // Timestamp in nanoseconds
    holidayType : Text;
    applicableDepartments : [Nat];
    description : Text;
  };

  public type PublicUserInfo = {
    principal : Principal;
    displayName : Text;
  };

  public type AdminUserInfo = {
    principal : Principal;
    displayName : Text;
    status : UserApproval.ApprovalStatus;
  };

  // -- New Module Types --
  public type SharedReport = {
    id : Nat;
    senderId : Principal;
    recipientIds : [Principal];
    reportTitle : Text;
    reportData : Text;
    timestamp : Time.Time;
  };

  public type UserProfileFull = {
    displayName : Text;
    phone : Text;
    email : Text;
    jobTitle : Text;
    bio : Text;
    avatarUrl : Text;
    departments : [Text];
  };

  // ── State ─────────────────────────────────────────────────────────────────

  var nextCustomerId = 0;

  let budgets = Map.empty<Principal, Budget>();
  let expenses = Map.empty<Principal, Map.Map<Nat, ExpenseEntry>>();
  let histories = Map.empty<Principal, Map.Map<Nat, HistoryEntry>>();
  let todos = Map.empty<Principal, Map.Map<Nat, TodoItem>>();
  let notes = Map.empty<Principal, Map.Map<Nat, Note>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let reminders = Map.empty<Principal, Map.Map<Nat, Reminder>>();
  let customers = Map.empty<Principal, Map.Map<Nat, Customer>>();

  let departments = Map.empty<Nat, Department>();
  var nextDepartmentId = 0;

  let attendanceConfigs = Map.empty<Principal, AttendanceConfig>();
  let attendanceEntries = Map.empty<Principal, Map.Map<Text, AttendanceDayEntry>>();
  let attendanceRecords = Map.empty<Principal, Map.Map<Text, AttendanceRecord>>();
  let globalHolidays = Map.empty<Text, HolidayEntry>();

  let customDatePermissions = Map.empty<Principal, Bool>();

  var nextExpenseId = 0;
  var nextHistoryId = 0;
  var nextReminderId = 0;
  var nextTodoId = 0;
  var nextNoteId = 0;

  // New state for calendar events
  let calendarEvents = Map.empty<Nat, CalendarEvent>();
  var nextEventId = 0;

  // New state for broadcasts
  let broadcasts = Map.empty<Nat, BroadcastMessage>();
  var nextBroadcastId = 0;
  let dismissedBroadcasts = Map.empty<Principal, [Nat]>();

  // New state for channels
  let channels = Map.empty<Nat, Channel>();
  var nextChannelId = 0;

  // New state for channel messages
  let channelMessages = Map.empty<Nat, ChannelMessage>();
  var nextMessageId = 0;

  // New state for direct messages
  let directMessages = Map.empty<Nat, DirectMessage>();
  var nextDirectMessageId = 0;

  // New state for files
  let files = Map.empty<Nat, FileData>();
  var nextFileId = 0;

  // New state for user statuses
  let userStatuses = Map.empty<Principal, UserStatusEntry>();

  // New state for holidays
  let holidays = Map.empty<Nat, Holiday>();
  var nextHolidayId = 0;

  // New state for shared reports
  var nextSharedReportId = 0;
  let sharedReports = Map.empty<Nat, SharedReport>();

  // New state for extended user profiles
  let fullUserProfiles = Map.empty<Principal, UserProfileFull>();

  // Use Authorization & Approval mixins
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  let approvalState = UserApproval.initState(accessControlState);

  // ── Helpers ───────────────────────────────────────────────────────────────

  // -- Generic Map Helpers --

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

  func getUserAttendanceRecordsOrInit(user : Principal) : Map.Map<Text, AttendanceRecord> {
    switch (attendanceRecords.get(user)) {
      case (?m) { m };
      case (null) {
        let m = Map.empty<Text, AttendanceRecord>();
        attendanceRecords.add(user, m);
        m;
      };
    };
  };

  // --- User Profile (Persist Display Name) ----
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous callers cannot get profiles");
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
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous callers cannot save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // === Departments Management ===

  public shared ({ caller }) func createDepartment(name : Text) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create departments");
    };

    let department : Department = {
      id = nextDepartmentId;
      name;
      createdBy = caller;
    };

    departments.add(department.id, department);
    nextDepartmentId += 1;
    department.id;
  };

  public shared ({ caller }) func updateDepartment(id : Nat, newName : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update departments");
    };

    switch (departments.get(id)) {
      case (null) { Runtime.trap("Department not found") };
      case (?existing) {
        departments.add(id, { existing with name = newName });
      };
    };
  };

  public shared ({ caller }) func deleteDepartment(id : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete departments");
    };
    departments.remove(id);
  };

  public query ({ caller }) func listDepartments() : async [Department] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list departments");
    };
    departments.values().toArray();
  };

  public shared ({ caller }) func assignToDepartment(departmentId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can assign themselves to departments");
    };

    if (departments.get(departmentId) == null) {
      Runtime.trap("Department does not exist");
    };

    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) {
        let updatedProfile = { profile with departmentId = ?departmentId };
        userProfiles.add(caller, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func adminAssignUserToDepartment(user : Principal, departmentId : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can assign users to departments");
    };

    if (departments.get(departmentId) == null) {
      Runtime.trap("Department does not exist");
    };

    switch (userProfiles.get(user)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) {
        let updatedProfile = { profile with departmentId = ?departmentId };
        userProfiles.add(user, updatedProfile);
      };
    };
  };

  public query ({ caller }) func getDepartment(departmentId : Nat) : async ?Department {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view departments");
    };
    departments.get(departmentId);
  };

  // === Custom Date Permissions ===

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

  // === Approval ===

  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    UserApproval.requestApproval(approvalState, caller);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list approvals");
    };
    UserApproval.listApprovals(approvalState);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can set approval status");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  // === Customer Management ===

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

  // === Reminder Management ===

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

  public query ({ caller }) func getRemindersForDate(dateMs : Int) : async [Reminder] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view reminders");
    };

    let dayMs : Int = 86_400_000;

    switch (reminders.get(caller)) {
      case (null) { [] };
      case (?userReminders) {
        let result = userReminders.values().filter(
          func(r : Reminder) : Bool {
            switch (r.repeatUntilDate) {
              case (null) {
                let reminderDay = r.createdAt / (dayMs * 1_000_000);
                let targetDay = dateMs / dayMs;
                reminderDay == targetDay;
              };
              case (?untilMs) {
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

  // === Budget Management ===

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

  // === Expense Management ===

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

  // === Todo Management ===

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

  // === Notes Management ===

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

  // === History Management ===

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

  // === Attendance Management ===

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
      case (null) {
        return {
          totalDays = 0;
          presentDays = 0;
          leaveDays = 0;
          halfDays = 0;
          festivalDays = 0;
          companyLeaveDays = 0;
          weeklyOffDays = 0;
          totalWorkingTime = 0;
          breakdown = [];
        };
      };
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
        case (#holiday) { /* Do nothing for holidays */ };
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

  // === New Attendance Record System ===

  public shared ({ caller }) func createOrUpdateAttendanceRecord(date : Text, shift : Shift, breaks : [BreakPeriod], notes : ?Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can modify attendance records");
    };

    let userRecords = getUserAttendanceRecordsOrInit(caller);

    switch (userRecords.get(date)) {
      case (null) {
        let newRecord : AttendanceRecord = {
          employeePrincipal = caller;
          date;
          shifts = [shift];
          breaks = breaks;
          notes;
        };
        userRecords.add(date, newRecord);
      };
      case (?existing) {
        var updatedShifts = existing.shifts;
        updatedShifts := updatedShifts.concat([shift]);
        let updatedRecord = {
          existing with
          shifts = updatedShifts;
          breaks;
          notes;
        };
        userRecords.add(date, updatedRecord);
      };
    };
  };

  public shared ({ caller }) func addBreakToRecord(date : Text, newBreak : BreakPeriod) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can add breaks");
    };

    let userRecords = getUserAttendanceRecordsOrInit(caller);

    switch (userRecords.get(date)) {
      case (null) { Runtime.trap("Attendance record not found") };
      case (?existing) {
        var updatedBreaks = existing.breaks.concat([newBreak]);
        let updatedRecord = { existing with breaks = updatedBreaks };
        userRecords.add(date, updatedRecord);
      };
    };
  };

  public query ({ caller }) func getAttendanceRecords() : async [(Text, AttendanceRecord)] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view attendance records");
    };

    switch (attendanceRecords.get(caller)) {
      case (null) { [] };
      case (?userRecords) { userRecords.entries().toArray() };
    };
  };

  public query ({ caller }) func getEmployeeAttendanceRecords(employee : Principal) : async [(Text, AttendanceRecord)] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view other employees' attendance records");
    };

    switch (attendanceRecords.get(employee)) {
      case (null) { [] };
      case (?userRecords) { userRecords.entries().toArray() };
    };
  };

  public query ({ caller }) func getEmployeeAttendanceDayEntries(employee : Principal) : async [(Text, AttendanceDayEntry)] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view other employees' attendance entries");
    };
    switch (attendanceEntries.get(employee)) {
      case (null) { [] };
      case (?userEntries) { userEntries.entries().toArray() };
    };
  };

  // === Holiday Management ===

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

  // === New Annual Leave/Holiday System ===

  public shared ({ caller }) func createHoliday(
    name : Text,
    date : Int,
    holidayType : Text,
    applicableDepartments : [Nat],
    description : Text,
  ) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create holidays");
    };

    let holiday : Holiday = {
      id = nextHolidayId;
      name;
      date;
      holidayType;
      applicableDepartments;
      description;
    };

    holidays.add(holiday.id, holiday);
    nextHolidayId += 1;
    holiday.id;
  };

  public shared ({ caller }) func updateHoliday(
    id : Nat,
    name : Text,
    date : Int,
    holidayType : Text,
    applicableDepartments : [Nat],
    description : Text,
  ) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update holidays");
    };

    switch (holidays.get(id)) {
      case (null) { Runtime.trap("Holiday not found") };
      case (?existing) {
        let updatedHoliday : Holiday = {
          existing with
          name;
          date;
          holidayType;
          applicableDepartments;
          description;
        };
        holidays.add(id, updatedHoliday);
      };
    };
  };

  public shared ({ caller }) func deleteHoliday(id : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete holidays");
    };
    holidays.remove(id);
  };

  public query ({ caller }) func getHolidays() : async [Holiday] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view holidays");
    };
    holidays.values().toArray();
  };

  // === Calendar Events ===

  public shared ({ caller }) func createCalendarEvent(title : Text, dateTime : Nat, description : Text, isAdminOnly : Bool) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create calendar events");
    };
    if (isAdminOnly and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create admin-only events");
    };

    if (title.size() == 0) {
      Runtime.trap("Event title cannot be empty");
    };

    let event : CalendarEvent = {
      id = nextEventId;
      title;
      dateTime;
      description;
      isAdminOnly;
      createdBy = caller;
    };

    calendarEvents.add(event.id, event);
    nextEventId += 1;
    event.id;
  };

  public query ({ caller }) func getCalendarEvents() : async [CalendarEvent] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view calendar events");
    };
    calendarEvents.values().filter(
      func(e : CalendarEvent) : Bool { not e.isAdminOnly }
    ).toArray();
  };

  public query ({ caller }) func getAllCalendarEvents() : async [CalendarEvent] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all calendar events");
    };
    calendarEvents.values().toArray();
  };

  public shared ({ caller }) func deleteCalendarEvent(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete calendar events");
    };

    switch (calendarEvents.get(id)) {
      case (null) { Runtime.trap("Calendar event not found") };
      case (?event) {
        if (event.createdBy != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the creator or an admin can delete this event");
        };
        calendarEvents.remove(id);
      };
    };
  };

  // === Broadcast Messages ===

  public shared ({ caller }) func createBroadcast(text : Text) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create broadcasts");
    };

    if (text.size() == 0) {
      Runtime.trap("Broadcast text cannot be empty");
    };

    let msg : BroadcastMessage = {
      id = nextBroadcastId;
      text;
      createdAt = Time.now();
      createdBy = caller;
    };

    broadcasts.add(msg.id, msg);
    nextBroadcastId += 1;
    msg.id;
  };

  public query ({ caller }) func getActiveBroadcasts() : async [BroadcastMessage] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view broadcasts");
    };

    let dismissed : [Nat] = switch (dismissedBroadcasts.get(caller)) {
      case (?ids) { ids };
      case (null) { [] };
    };

    broadcasts.values().filter(
      func(msg : BroadcastMessage) : Bool {
        var found = false;
        for (dismissedId in dismissed.vals()) {
          if (dismissedId == msg.id) { found := true };
        };
        not found;
      }
    ).toArray();
  };

  public shared ({ caller }) func dismissBroadcast(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can dismiss broadcasts");
    };

    switch (broadcasts.get(id)) {
      case (null) { Runtime.trap("Broadcast not found") };
      case (?_) {};
    };

    let current : [Nat] = switch (dismissedBroadcasts.get(caller)) {
      case (?ids) { ids };
      case (null) { [] };
    };

    var alreadyDismissed = false;
    for (dismissedId in current.vals()) {
      if (dismissedId == id) { alreadyDismissed := true };
    };

    if (not alreadyDismissed) {
      let updated = current.concat([id]);
      dismissedBroadcasts.add(caller, updated);
    };
  };

  public query ({ caller }) func getBroadcastHistory() : async [BroadcastMessage] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view broadcast history");
    };
    broadcasts.values().toArray();
  };

  // === Channels ===

  public shared ({ caller }) func createChannel(name : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create channels");
    };

    if (name.size() == 0) {
      Runtime.trap("Channel name cannot be empty");
    };

    let channel : Channel = {
      id = nextChannelId;
      name;
      createdBy = caller;
      createdAt = Time.now();
    };

    channels.add(channel.id, channel);
    nextChannelId += 1;
    channel.id;
  };

  public query ({ caller }) func listChannels() : async [Channel] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list channels");
    };
    channels.values().toArray();
  };

  public shared ({ caller }) func deleteChannel(id : Nat) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete channels");
    };

    switch (channels.get(id)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?_) { channels.remove(id) };
    };
  };

  // === Channel Messages ===

  public shared ({ caller }) func postChannelMessage(channelId : Nat, senderName : Text, text : Text, fileUrl : ?Text, fileName : ?Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can post channel messages");
    };

    switch (channels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?_) {};
    };

    if (text.size() == 0 and fileUrl == null) {
      Runtime.trap("Message must have text or a file attachment");
    };

    let msg : ChannelMessage = {
      id = nextMessageId;
      channelId;
      senderId = caller;
      senderName;
      text;
      fileUrl;
      fileName;
      createdAt = Time.now();
    };

    channelMessages.add(msg.id, msg);
    nextMessageId += 1;
    msg.id;
  };

  public query ({ caller }) func getChannelMessages(channelId : Nat) : async [ChannelMessage] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view channel messages");
    };

    switch (channels.get(channelId)) {
      case (null) { Runtime.trap("Channel not found") };
      case (?_) {};
    };

    let all = channelMessages.values().filter(
      func(m : ChannelMessage) : Bool { m.channelId == channelId }
    ).toArray();

    let size = all.size();
    if (size <= 50) {
      all;
    } else {
      let start = if (size > 50) { size - 50 } else { 0 };
      if (start < size) {
        all.sliceToArray(start, size);
      } else {
        [];
      };
    };
  };

  // === Direct Messages ===

  public shared ({ caller }) func sendDirectMessage(toPrincipal : Principal, text : Text, fileUrl : ?Text, fileName : ?Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send direct messages");
    };

    if (text.size() == 0 and fileUrl == null) {
      Runtime.trap("Message must have text or a file attachment");
    };

    let msg : DirectMessage = {
      id = nextDirectMessageId;
      fromPrincipal = caller;
      toPrincipal;
      text;
      fileUrl;
      fileName;
      createdAt = Time.now();
    };

    directMessages.add(msg.id, msg);
    nextDirectMessageId += 1;
    msg.id;
  };

  public query ({ caller }) func getDirectMessages(otherPrincipal : Principal) : async [DirectMessage] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view direct messages");
    };

    let all = directMessages.values().filter(
      func(m : DirectMessage) : Bool {
        (m.fromPrincipal == caller and m.toPrincipal == otherPrincipal) or
        (m.fromPrincipal == otherPrincipal and m.toPrincipal == caller)
      }
    ).toArray();

    let size = all.size();
    if (size <= 50) {
      all;
    } else {
      let start = if (size > 50) { size - 50 } else { 0 };
      if (start < size) {
        all.sliceToArray(start, size);
      } else {
        [];
      };
    };
  };

  // === User Status ===

  public shared ({ caller }) func setUserStatus(status : UserStatusKind) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can set their status");
    };

    let entry : UserStatusEntry = {
      principal = caller;
      status;
      updatedAt = Time.now();
    };

    userStatuses.add(caller, entry);
  };

  public query ({ caller }) func getUserStatuses() : async [UserStatusEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view user statuses");
    };
    userStatuses.values().toArray();
  };

  // === File Sharing (Expand to Store Images) ===

  public shared ({ caller }) func uploadFile(filename : Text, content : Blob) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can upload files");
    };

    if (filename.size() == 0) {
      Runtime.trap("Filename cannot be empty");
    };

    let fileData : FileData = {
      id = nextFileId;
      uploader = caller;
      filename;
      content;
      uploadedAt = Time.now();
    };

    files.add(fileData.id, fileData);
    nextFileId += 1;
    fileData.id;
  };

  public query ({ caller }) func getFile(id : Nat) : async ?FileData {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can download files");
    };
    files.get(id);
  };

  // === Additions from latest user request ===

  public query ({ caller }) func getAllRegisteredUsersPublic() : async [PublicUserInfo] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only approved users can list users");
    };

    let userRolesIter = accessControlState.userRoles.keys();
    let profilesIter = userRolesIter.map(
      func(principal) {
        let displayName = switch (userProfiles.get(principal)) {
          case (?profile) { profile.displayName };
          case (null) { "Employee" };
        };
        { principal; displayName };
      }
    );
    profilesIter.toArray();
  };

  public query func isAdminInitialized() : async Bool {
    accessControlState.adminAssigned;
  };

  public shared ({ caller }) func editChannelMessage(messageId : Nat, newText : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can edit messages");
    };

    switch (channelMessages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?existing) {
        if (existing.senderId != caller) {
          Runtime.trap("Unauthorized: Only the sender can edit this message");
        };
        let updatedMessage = { existing with text = newText };
        channelMessages.add(messageId, updatedMessage);
      };
    };
  };

  public shared ({ caller }) func editDirectMessage(messageId : Nat, newText : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can edit messages");
    };

    switch (directMessages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?existing) {
        if (existing.fromPrincipal != caller) {
          Runtime.trap("Unauthorized: Only the sender can edit this message");
        };
        let updatedMessage = { existing with text = newText };
        directMessages.add(messageId, updatedMessage);
      };
    };
  };

  // New admin endpoints
  public shared ({ caller }) func deleteChannelMessage(messageId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete channel messages");
    };

    switch (channelMessages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?existing) {
        if (existing.senderId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the sender or an admin can delete this message");
        };
        channelMessages.remove(messageId);
      };
    };
  };

  public shared ({ caller }) func deleteDirectMessage(messageId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete direct messages");
    };

    switch (directMessages.get(messageId)) {
      case (null) { Runtime.trap("Message not found") };
      case (?existing) {
        if (existing.fromPrincipal != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the sender or an admin can delete this message");
        };
        directMessages.remove(messageId);
      };
    };
  };

  public query ({ caller }) func getAllUsersForAdmin() : async [AdminUserInfo] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all users");
    };

    let approvalStatusIter = approvalState.approvalStatus.entries();
    let approvalStatusArray = approvalStatusIter.toArray();

    let result = approvalStatusArray.reverse();

    let resultIter = result.values();
    let adminUserInfosIter = resultIter.map(
      func((principal, status)) {
        let displayName = switch (userProfiles.get(principal)) {
          case (?profile) { profile.displayName };
          case (null) { "" };
        };
        {
          principal;
          displayName;
          status;
        };
      }
    );
    adminUserInfosIter.toArray();
  };

  public shared ({ caller }) func removeUserCompletely(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can remove users");
    };

    approvalState.approvalStatus.remove(user);
    accessControlState.userRoles.remove(user);
    userProfiles.remove(user);
    customDatePermissions.remove(user);
  };

  // New Endpoints

  public shared ({ caller }) func shareExpenseReport(recipientIds : [Principal], reportTitle : Text, reportData : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can share expense reports");
    };

    if (recipientIds.size() == 0 or reportTitle.isEmpty() or reportData.isEmpty()) {
      Runtime.trap("Invalid input for report sharing");
    };

    let report : SharedReport = {
      id = nextSharedReportId;
      senderId = caller;
      recipientIds;
      reportTitle;
      reportData;
      timestamp = Time.now();
    };

    sharedReports.add(nextSharedReportId, report);
    nextSharedReportId += 1;
  };

  public query ({ caller }) func getSharedReports() : async [SharedReport] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view shared reports");
    };

    let allReports = sharedReports.values().toArray();
    let filteredView = allReports.filter(
      func(report) {
        var found = false;
        for (recipient in report.recipientIds.values()) {
          if (recipient == caller) { found := true };
        };
        found or report.senderId == caller;
      }
    );
    filteredView;
  };

  public query ({ caller }) func isHolidayDate(dateStr : Text) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can check holiday dates");
    };

    for ((_, entry) in globalHolidays.entries()) {
      if (entry.date == dateStr) { return true };
    };

    for ((_, holiday) in holidays.entries()) {
      if (holiday.date.toText() == dateStr) { return true };
    };

    false;
  };

  public shared ({ caller }) func updateUserProfileFull(
    displayName : Text,
    phone : Text,
    email : Text,
    jobTitle : Text,
    bio : Text,
    avatarUrl : Text,
    departments : [Text],
  ) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update full profiles");
    };

    let profile : UserProfileFull = {
      displayName;
      phone;
      email;
      jobTitle;
      bio;
      avatarUrl;
      departments;
    };

    fullUserProfiles.add(caller, profile);
  };

  public query ({ caller }) func getUsersInDepartment(departmentId : Text) : async [UserProfileFull] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view department users");
    };

    let allProfiles = fullUserProfiles.values().toArray();
    let filtered = allProfiles.filter(
      func(profile) {
        for (dept in profile.departments.values()) {
          if (dept == departmentId) { return true };
        };
        false;
      }
    );
    filtered;
  };
};
