import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Migration "migration";

(with migration = Migration.run)
actor {
  // Types
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
    time : Int; // Time.now() - Unix timestamp
  };

  public type Reminder = {
    id : Nat;
    message : Text;
    date : Text; // YYYY-MM-DD
    time : Text; // HH:MM
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

  // Attendance Types
  public type AttendanceStatus = {
    #present;
    #leave;
    #halfDay;
    #festival;
    #companyLeave;
    #weeklyOff;
  };

  public type AttendanceDayEntry = {
    checkIn : ?Time.Time;
    checkOut : ?Time.Time;
    status : AttendanceStatus;
    workingTime : Nat; // in seconds
  };

  public type AttendanceConfig = {
    regularWorkingTime : Nat; // in seconds
    weeklyOffDays : [Nat]; // 0-6 for Sunday-Saturday
    leavePolicy : Nat; // max leave days per year
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

  // Persistent State
  let budgets = Map.empty<Principal, Budget>();
  let expenses = Map.empty<Principal, Map.Map<Nat, ExpenseEntry>>();
  let histories = Map.empty<Principal, Map.Map<Nat, HistoryEntry>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let reminders = Map.empty<Principal, Map.Map<Nat, Reminder>>();

  let attendanceConfigs = Map.empty<Principal, AttendanceConfig>();
  let attendanceEntries = Map.empty<Principal, Map.Map<Text, AttendanceDayEntry>>();
  let globalHolidays = Map.empty<Text, HolidayEntry>();

  var nextExpenseId = 0;
  var nextHistoryId = 0;
  var nextReminderId = 0;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Holiday Functions
  public shared ({ caller }) func createHoliday(date : Text, holidayType : HolidayType) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create holidays");
    };
    let newHoliday : HolidayEntry = { date; holidayType };
    globalHolidays.add(date, newHoliday);
  };

  public shared ({ caller }) func updateHoliday(date : Text, holidayType : HolidayType) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update holidays");
    };

    switch (globalHolidays.get(date)) {
      case (null) {
        Runtime.trap("Error: Holiday does not exist for given date");
      };
      case (?_existingHoliday) {
        let updatedHoliday : HolidayEntry = { date; holidayType };
        globalHolidays.add(date, updatedHoliday);
      };
    };
  };

  public shared ({ caller }) func deleteHoliday(date : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete holidays");
    };

    switch (globalHolidays.get(date)) {
      case (null) {
        Runtime.trap("Error: Holiday does not exist for given date");
      };
      case (?_existingHoliday) {
        globalHolidays.remove(date);
      };
    };
  };

  public query ({ caller }) func getHoliday(date : Text) : async ?HolidayEntry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access holiday data");
    };
    globalHolidays.get(date);
  };

  public query ({ caller }) func getAllHolidays() : async [HolidayEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access holiday data");
    };
    globalHolidays.values().toArray();
  };

  // Attendance Functions
  public shared ({ caller }) func setAttendanceConfig(config : AttendanceConfig) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set attendance config");
    };
    attendanceConfigs.add(caller, config);
  };

  public query ({ caller }) func getAttendanceConfig() : async ?AttendanceConfig {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access attendance config");
    };
    attendanceConfigs.get(caller);
  };

  public shared ({ caller }) func checkIn(date : Text, status : AttendanceStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check in");
    };

    let newEntry : AttendanceDayEntry = {
      checkIn = ?Time.now();
      checkOut = null;
      status;
      workingTime = 0;
    };

    let userEntries = getUserAttendanceOrInit(caller);
    userEntries.add(date, newEntry);
  };

  public shared ({ caller }) func checkOut(date : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check out");
    };

    let userEntries = getUserAttendanceOrInit(caller);

    switch (userEntries.get(date)) {
      case (null) {
        Runtime.trap("Unauthorized: No check-in found for given date");
      };
      case (?existing) {
        let outTime = Time.now();
        let workingTime = switch (existing.checkIn) {
          case (?inTime) { computeDuration(inTime, outTime) };
          case (null) { 0 };
        };

        let updatedEntry : AttendanceDayEntry = {
          checkIn = existing.checkIn;
          checkOut = ?outTime;
          status = existing.status;
          workingTime;
        };

        userEntries.add(date, updatedEntry);
      };
    };
  };

  public query ({ caller }) func getWorkingTime(date : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access attendance data");
    };

    let userEntries = getUserAttendanceOrInit(caller);

    switch (userEntries.get(date)) {
      case (null) { 0 };
      case (?entry) { entry.workingTime };
    };
  };

  public query ({ caller }) func getAttendanceSummary(range : (Text, Text)) : async AttendanceSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access attendance data");
    };

    let userEntries = getUserAttendanceOrInit(caller);
    let filtered = userEntries.filter(
      func(date, _) { date >= range.0 and date <= range.1 }
    );

    let breakdown = filtered.toArray();
    let stats = Array.tabulate(
      6,
      func(i) {
        var count = 0;
        let range = filtered.toArray();
        let filteredEntries = range.filter(
          func((_, v)) {
            switch (i) {
              case (0) { v.status == #present };
              case (1) { v.status == #leave };
              case (2) { v.status == #halfDay };
              case (3) { v.status == #festival };
              case (4) { v.status == #companyLeave };
              case (5) { v.status == #weeklyOff };
              case (_) { false };
            };
          }
        );
        count := filteredEntries.size();
        count;
      },
    );

    let totalWorkingTime = filtered.toArray().foldLeft(
      0,
      func(_, entry) { entry.1.workingTime },
    );

    {
      totalDays = filtered.size();
      presentDays = stats[0];
      leaveDays = stats[1];
      halfDays = stats[2];
      festivalDays = stats[3];
      companyLeaveDays = stats[4];
      weeklyOffDays = stats[5];
      totalWorkingTime;
      breakdown;
    };
  };

  // New function: Get attendance entry for specific date (reading support)
  public query ({ caller }) func getAttendanceEntry(date : Text) : async ?AttendanceDayEntry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access attendance data");
    };

    let userEntries = getUserAttendanceOrInit(caller);
    userEntries.get(date);
  };

  // New function: Edit attendance entry for specific date (writing support)
  public shared ({ caller }) func editAttendanceEntry(date : Text, updatedEntry : AttendanceDayEntry) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can edit attendance data");
    };

    let userEntries = getUserAttendanceOrInit(caller);
    userEntries.add(date, updatedEntry);
  };

  // Helper function
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
    if (duration < 0) { 0 } else if (duration > 2_592_000_000_000) {
      // 30 days in nanoseconds
      0;
    } else {
      (duration / 1_000_000_000).toNat();
    };
  };

  // Existing non-attendance code (user profiles, budgets, expenses, etc.) remains the same
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func saveBudget(monthlyLimit : Nat, dayLimit : Nat, savingsGoal : Nat, lastUpdated : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save budgets");
    };
    let newBudget : Budget = {
      monthlyLimit;
      dayLimit = dayLimit;
      savingsGoal;
      lastUpdated;
    };
    budgets.add(caller, newBudget);
  };

  public query ({ caller }) func getBudget() : async ?Budget {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access budgets");
    };
    budgets.get(caller);
  };

  public shared ({ caller }) func addExpense(amount : Nat, category : Text, description : Text, date : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add expenses");
    };

    let newExpense : ExpenseEntry = {
      id = nextExpenseId;
      amount;
      category;
      description;
      date;
      time = Time.now();
    };

    let userExpenses = switch (expenses.get(caller)) {
      case (null) {
        let newMap = Map.empty<Nat, ExpenseEntry>();
        expenses.add(caller, newMap);
        newMap;
      };
      case (?existingMap) { existingMap };
    };

    userExpenses.add(newExpense.id, newExpense);
    nextExpenseId += 1;

    // Add history entry for the expense change
    let historyEntry : HistoryEntry = {
      id = nextHistoryId;
      user = caller;
      timestamp = Time.now();
      entryType = #expenseChange;
      details = "Expense added: " # description;
    };

    nextHistoryId += 1;

    let userHistory = switch (histories.get(caller)) {
      case (null) {
        let newMap = Map.empty<Nat, HistoryEntry>();
        histories.add(caller, newMap);
        newMap;
      };
      case (?existingMap) { existingMap };
    };
    userHistory.add(historyEntry.id, historyEntry);

    newExpense.id;
  };

  public shared ({ caller }) func editExpense(id : Nat, amount : Nat, category : Text, description : Text, date : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can edit expenses");
    };

    let userExpenses = switch (expenses.get(caller)) {
      case (null) {
        Runtime.trap("Unauthorized: Expense not found or does not belong to caller");
      };
      case (?existingMap) { existingMap };
    };

    switch (userExpenses.get(id)) {
      case (null) {
        Runtime.trap("Unauthorized: Expense not found or does not belong to caller");
      };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete expenses");
    };

    switch (expenses.get(caller)) {
      case (null) {
        Runtime.trap("Unauthorized: Expense not found or does not belong to caller");
      };
      case (?userExpenses) {
        switch (userExpenses.get(id)) {
          case (null) {
            Runtime.trap("Unauthorized: Expense not found or does not belong to caller");
          };
          case (?_) {
            userExpenses.remove(id);
          };
        };
      };
    };
  };

  public query ({ caller }) func getExpensesForCaller() : async [ExpenseEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access expenses");
    };

    switch (expenses.get(caller)) {
      case (null) { [] };
      case (?userExpenses) { userExpenses.values().toArray() };
    };
  };

  public query ({ caller }) func filterByType(type_ : Text) : async [ExpenseEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access expenses");
    };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access expenses");
    };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add history entries");
    };

    let historyEntry : HistoryEntry = {
      id = nextHistoryId;
      user = caller;
      timestamp = Time.now();
      entryType;
      details;
    };

    let userHistory = switch (histories.get(caller)) {
      case (null) {
        let newMap = Map.empty<Nat, HistoryEntry>();
        histories.add(caller, newMap);
        newMap;
      };
      case (?existingMap) { existingMap };
    };

    userHistory.add(historyEntry.id, historyEntry);
    nextHistoryId += 1;
    historyEntry.id;
  };

  public query ({ caller }) func getHistory() : async [HistoryEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access history");
    };
    switch (histories.get(caller)) {
      case (null) { [] };
      case (?userHistory) { userHistory.values().toArray() };
    };
  };

  public query ({ caller }) func getFilteredHistory(historyType : HistoryType) : async [HistoryEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access history");
    };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear history");
    };
    histories.remove(caller);
  };

  public query func getVersion() : async Text {
    "V1.0.0";
  };

  public shared ({ caller }) func clearAllData() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can clear all data");
    };
    budgets.clear();
    expenses.clear();
    histories.clear();
    userProfiles.clear();
    reminders.clear();
    nextExpenseId := 0;
    nextHistoryId := 0;
    nextReminderId := 0;
  };

  public shared ({ caller }) func addReminder(message : Text, date : Text, time : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add reminders");
    };

    let reminder : Reminder = {
      id = nextReminderId;
      message;
      date;
      time;
      createdAt = Time.now();
    };

    let userReminders = switch (reminders.get(caller)) {
      case (null) {
        let newMap = Map.empty<Nat, Reminder>();
        reminders.add(caller, newMap);
        newMap;
      };
      case (?existingMap) { existingMap };
    };

    userReminders.add(reminder.id, reminder);

    let historyEntry : HistoryEntry = {
      id = nextHistoryId;
      user = caller;
      timestamp = Time.now();
      entryType = #expenseChange;
      details = "Reminder added: " # message;
    };

    nextReminderId += 1;
    nextHistoryId += 1;

    let userHistory = switch (histories.get(caller)) {
      case (null) {
        let newMap = Map.empty<Nat, HistoryEntry>();
        histories.add(caller, newMap);
        newMap;
      };
      case (?existingMap) { existingMap };
    };
    userHistory.add(historyEntry.id, historyEntry);

    reminder.id;
  };

  public shared ({ caller }) func deleteReminder(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete reminders");
    };

    switch (reminders.get(caller)) {
      case (null) {
        Runtime.trap("Unauthorized: Reminder not found or does not belong to caller");
      };
      case (?userReminders) {
        switch (userReminders.get(id)) {
          case (null) {
            Runtime.trap("unauthorized: Reminder not found or does not belong to caller");
          };
          case (?_) {
            userReminders.remove(id);
          };
        };
      };
    };
  };

  public query ({ caller }) func getRemindersForCaller() : async [Reminder] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access reminders");
    };

    switch (reminders.get(caller)) {
      case (null) { [] };
      case (?userReminders) { userReminders.values().toArray() };
    };
  };
};
