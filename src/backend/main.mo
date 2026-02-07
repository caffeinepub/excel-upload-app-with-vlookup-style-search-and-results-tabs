import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Migration "migration";

(with migration = Migration.run)
actor {
  public type ExpenseEntry = {
    id : Nat;
    date : Text;
    type_ : Text;
    amount : Nat;
    description : Text;
  };

  public type UserProfile = {
    name : Text;
  };

  public type Budget = {
    monthlyLimit : Nat;
    savingsGoal : Nat;
    lastUpdated : Text;
  };

  let budgets = Map.empty<Principal, Budget>();
  let expenses = Map.empty<Principal, Map.Map<Nat, ExpenseEntry>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let accessControlState = AccessControl.initState();
  var nextExpenseId = 0;

  include MixinAuthorization(accessControlState);

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

  public shared ({ caller }) func saveBudget(monthlyLimit : Nat, savingsGoal : Nat, lastUpdated : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save budgets");
    };
    let newBudget : Budget = {
      monthlyLimit;
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

  public shared ({ caller }) func addExpense(date : Text, type_ : Text, amount : Nat, description : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add expenses");
    };

    let newEntry : ExpenseEntry = {
      id = nextExpenseId;
      date;
      type_;
      amount;
      description;
    };

    switch (expenses.get(caller)) {
      case (null) {
        let newExpenseMap = Map.empty<Nat, ExpenseEntry>();
        newExpenseMap.add(newEntry.id, newEntry);
        expenses.add(caller, newExpenseMap);
      };
      case (?expenseMap) {
        expenseMap.add(newEntry.id, newEntry);
      };
    };
    nextExpenseId += 1;
  };

  public query ({ caller }) func getExpensesForCaller() : async [ExpenseEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access expenses");
    };

    switch (expenses.get(caller)) {
      case (null) { [] };
      case (?callerExpenses) { callerExpenses.values().toArray() };
    };
  };
};
