import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Time "mo:core/Time";

module {
  // Old Reminder type without repeatUntilDate.
  type OldReminder = {
    id : Nat;
    message : Text;
    date : Text;
    time : Text;
    createdAt : Time.Time;
  };

  // Old actor type.
  type OldActor = {
    reminders : Map.Map<Principal, Map.Map<Nat, OldReminder>>;
  };

  // New Reminder type with repeatUntilDate.
  type NewReminder = {
    id : Nat;
    message : Text;
    date : Text;
    time : Text;
    repeatUntilDate : ?Int;
    createdAt : Time.Time;
    updatedAt : ?Time.Time;
  };

  // New actor type.
  type NewActor = {
    reminders : Map.Map<Principal, Map.Map<Nat, NewReminder>>;
  };

  public func run(old : OldActor) : NewActor {
    let updatedReminders = old.reminders.map<Principal, Map.Map<Nat, OldReminder>, Map.Map<Nat, NewReminder>>(
      func(_principal, reminderMap) {
        reminderMap.map<Nat, OldReminder, NewReminder>(
          func(_id, oldReminder) {
            {
              oldReminder with
              repeatUntilDate = null;
              updatedAt = null;
            };
          }
        );
      }
    );
    { reminders = updatedReminders };
  };
};
