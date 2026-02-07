import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

module {
  // Types shared with the previous version (old state)
  type OldAttendanceDayEntry = {
    checkIn : ?Int;
    checkOut : ?Int;
    status : OldAttendanceStatus;
    workingTime : Nat;
  };

  type OldAttendanceStatus = {
    #present;
    #leave;
    #halfDay;
    #festival;
    #companyLeave;
    #weeklyOff;
  };

  type OldBudget = {
    monthlyLimit : Nat;
    dayLimit : Nat;
    savingsGoal : Nat;
    lastUpdated : Text;
  };

  type OldReminder = {
    id : Nat;
    message : Text;
    date : Text;
    time : Text;
    createdAt : Int;
  };

  type OldExpenseEntry = {
    id : Nat;
    amount : Nat;
    category : Text;
    description : Text;
    date : Text;
    time : Int;
  };

  type OldHistoryEntry = {
    id : Nat;
    user : Principal;
    timestamp : Int;
    entryType : OldHistoryType;
    details : Text;
  };

  type OldHistoryType = {
    #upload;
    #search;
    #results;
    #updateChecking;
    #budgetChange;
    #expenseChange;
  };

  type OldTodoItem = {
    id : Nat;
    text : Text;
    completed : Bool;
    timestamp : Int;
  };

  type OldNote = {
    id : Nat;
    text : Text;
    lastUpdated : Int;
  };

  // Types for the new actor
  type NewAttendanceDayEntry = {
    checkIn : ?Int;
    checkOut : ?Int;
    note : Text;
    status : OldAttendanceStatus;
    workingTime : Nat;
  };

  // Actor types with old/new structure
  type OldActor = {
    budgets : Map.Map<Principal, OldBudget>;
    reminders : Map.Map<Principal, Map.Map<Nat, OldReminder>>;
    expenses : Map.Map<Principal, Map.Map<Nat, OldExpenseEntry>>;
    histories : Map.Map<Principal, Map.Map<Nat, OldHistoryEntry>>;
    todos : Map.Map<Principal, Map.Map<Nat, OldTodoItem>>;
    notes : Map.Map<Principal, Map.Map<Nat, OldNote>>;
    attendanceEntries : Map.Map<Principal, Map.Map<Text, OldAttendanceDayEntry>>;
    nextExpenseId : Nat;
    nextHistoryId : Nat;
    nextReminderId : Nat;
    nextTodoId : Nat;
    nextNoteId : Nat;
  };

  type NewActor = {
    budgets : Map.Map<Principal, OldBudget>;
    reminders : Map.Map<Principal, Map.Map<Nat, OldReminder>>;
    expenses : Map.Map<Principal, Map.Map<Nat, OldExpenseEntry>>;
    histories : Map.Map<Principal, Map.Map<Nat, OldHistoryEntry>>;
    todos : Map.Map<Principal, Map.Map<Nat, OldTodoItem>>;
    notes : Map.Map<Principal, Map.Map<Nat, OldNote>>;
    attendanceEntries : Map.Map<Principal, Map.Map<Text, NewAttendanceDayEntry>>;
    nextExpenseId : Nat;
    nextHistoryId : Nat;
    nextReminderId : Nat;
    nextTodoId : Nat;
    nextNoteId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let newAttendanceEntries = old.attendanceEntries.map<Principal, Map.Map<Text, OldAttendanceDayEntry>, Map.Map<Text, NewAttendanceDayEntry>>(
      func(_p, oldMap) {
        oldMap.map<Text, OldAttendanceDayEntry, NewAttendanceDayEntry>(
          func(_key, oldEntry) {
            {
              oldEntry with
              note = "";
            };
          }
        );
      }
    );
    { old with attendanceEntries = newAttendanceEntries };
  };
};
