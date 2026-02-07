import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  // Old types
  type Reminder = {
    id : Nat;
    title : Text;
    description : Text;
    time : Nat;
    repeatInterval : ?Nat;
    priority : ?Nat;
    isActive : Bool;
  };

  type CalendarEvent = {
    id : Nat;
    title : Text;
    description : Text;
    startTime : Nat;
    endTime : ?Nat;
    location : ?Text;
    participants : [Text];
  };

  type ToDoItem = {
    id : Nat;
    description : Text;
    deadline : ?Nat;
    priority : ?Nat;
    completed : Bool;
    tags : [Text];
  };

  type Note = {
    id : Nat;
    title : Text;
    content : Text;
    tags : [Text];
    lastUpdated : Nat;
  };

  type OldUserProfile = {
    name : Text;
  };

  // New types
  type NewExpenseEntry = {
    id : Nat;
    date : Text;
    type_ : Text;
    amount : Nat;
    description : Text;
  };

  type NewUserProfile = {
    name : Text;
  };

  type NewBudget = {
    monthlyLimit : Nat;
    savingsGoal : Nat;
    lastUpdated : Text;
  };

  // Old actor type
  type OldActor = {
    nextReminderId : Map.Map<Principal, Nat>;
    nextEventId : Map.Map<Principal, Nat>;
    nextToDoId : Map.Map<Principal, Nat>;
    nextNoteId : Map.Map<Principal, Nat>;
    reminders : Map.Map<Principal, Map.Map<Nat, Reminder>>;
    calendarEvents : Map.Map<Principal, Map.Map<Nat, CalendarEvent>>;
    toDoItems : Map.Map<Principal, Map.Map<Nat, ToDoItem>>;
    notes : Map.Map<Principal, Map.Map<Nat, Note>>;
    userNotes : Map.Map<Principal, Map.Map<Nat, Note>>;
    userProfiles : Map.Map<Principal, OldUserProfile>;
  };

  // New actor type
  type NewActor = {
    nextExpenseId : Nat;
    budgets : Map.Map<Principal, NewBudget>;
    userProfiles : Map.Map<Principal, NewUserProfile>;
    expenses : Map.Map<Principal, Map.Map<Nat, NewExpenseEntry>>;
  };

  public func run(old : OldActor) : NewActor {
    {
      nextExpenseId = 0;
      budgets = Map.empty<Principal, NewBudget>();
      userProfiles = Map.empty<Principal, NewUserProfile>();
      expenses = Map.empty<Principal, Map.Map<Nat, NewExpenseEntry>>();
    };
  };
};
