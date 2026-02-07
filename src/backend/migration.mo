import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

module {
  public type OldAttendanceStatus = {
    #present;
    #leave;
    #halfDay;
    #festival;
    #weeklyOff;
  };

  type OldAttendanceDayEntry = {
    checkIn : ?Int;
    checkOut : ?Int;
    status : OldAttendanceStatus;
    workingTime : Nat; // in seconds
  };

  public type OldActor = {
    budgets : Map.Map<Principal, { monthlyLimit : Nat; dayLimit : Nat; savingsGoal : Nat; lastUpdated : Text }>;
    expenses : Map.Map<Principal, Map.Map<Nat, { id : Nat; amount : Nat; category : Text; description : Text; date : Text; time : Int }>>;
    histories : Map.Map<Principal, Map.Map<Nat, { id : Nat; user : Principal; timestamp : Int; entryType : { #upload; #search; #results; #updateChecking; #budgetChange; #expenseChange }; details : Text }>>;
    userProfiles : Map.Map<Principal, { name : Text }>;
    reminders : Map.Map<Principal, Map.Map<Nat, { id : Nat; message : Text; date : Text; time : Text; createdAt : Int }>>;
    attendanceConfigs : Map.Map<Principal, { regularWorkingTime : Nat; weeklyOffDays : [Nat]; leavePolicy : Nat }>;
    attendanceEntries : Map.Map<Principal, Map.Map<Text, OldAttendanceDayEntry>>;
    nextExpenseId : Nat;
    nextHistoryId : Nat;
    nextReminderId : Nat;
  };

  public type NewAttendanceStatus = {
    #present;
    #leave;
    #halfDay;
    #festival;
    #companyLeave;
    #weeklyOff;
  };

  public type HolidayEntry = {
    date : Text;
    holidayType : { #festival; #companyLeave };
  };

  public type NewAttendanceDayEntry = {
    checkIn : ?Int;
    checkOut : ?Int;
    status : NewAttendanceStatus;
    workingTime : Nat;
  };

  public type NewActor = {
    budgets : Map.Map<Principal, { monthlyLimit : Nat; dayLimit : Nat; savingsGoal : Nat; lastUpdated : Text }>;
    expenses : Map.Map<Principal, Map.Map<Nat, { id : Nat; amount : Nat; category : Text; description : Text; date : Text; time : Int }>>;
    histories : Map.Map<Principal, Map.Map<Nat, { id : Nat; user : Principal; timestamp : Int; entryType : { #upload; #search; #results; #updateChecking; #budgetChange; #expenseChange }; details : Text }>>;
    userProfiles : Map.Map<Principal, { name : Text }>;
    reminders : Map.Map<Principal, Map.Map<Nat, { id : Nat; message : Text; date : Text; time : Text; createdAt : Int }>>;
    attendanceConfigs : Map.Map<Principal, { regularWorkingTime : Nat; weeklyOffDays : [Nat]; leavePolicy : Nat }>;
    attendanceEntries : Map.Map<Principal, Map.Map<Text, NewAttendanceDayEntry>>;
    globalHolidays : Map.Map<Text, HolidayEntry>;
    nextExpenseId : Nat;
    nextHistoryId : Nat;
    nextReminderId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let newAttendanceEntries = old.attendanceEntries.map<Principal, Map.Map<Text, OldAttendanceDayEntry>, Map.Map<Text, NewAttendanceDayEntry>>(
      func(_principal, entries) {
        entries.map<Text, OldAttendanceDayEntry, NewAttendanceDayEntry>(
          func(_date, entry) {
            switch (entry.status) {
              case (#present) {
                { entry with status = #present : NewAttendanceStatus };
              };
              case (#leave) {
                { entry with status = #leave : NewAttendanceStatus };
              };
              case (#halfDay) {
                { entry with status = #halfDay : NewAttendanceStatus };
              };
              case (#festival) {
                { entry with status = #festival : NewAttendanceStatus };
              };
              case (#weeklyOff) {
                { entry with status = #weeklyOff : NewAttendanceStatus };
              };
            };
          }
        );
      }
    );
    {
      old with
      attendanceEntries = newAttendanceEntries;
      globalHolidays = Map.empty<Text, HolidayEntry>();
    };
  };
};
