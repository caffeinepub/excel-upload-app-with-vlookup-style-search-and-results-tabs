import Map "mo:core/Map";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Text "mo:core/Text";
import Iter "mo:core/Iter";

actor {
  type DataHistoryEntry = {
    determinant : Text;
    diagnosticTestResult : Text;
    dtSensitivityScore : Nat;
    filterCount : Nat;
    filterLabels : [Text];
    indicatorsUsed : Text;
    itemReviewed : Text;
    maintenanceAction : Text;
    manipulatedVariables : Text;
    mpvShortList : Text;
    scoreSummary : Text;
    trueCheck : Bool;
    varControlStatus : Text;
    varDefSummary : Text;
  };

  let entries = Map.empty<Nat, DataHistoryEntry>();

  public shared ({ caller }) func addHistoryEntry(
    determinant : Text,
    diagnosticTestResult : Text,
    dtSensitivityScore : Nat,
    filterCount : Nat,
    filterLabelsOpt : ?[Text],
    indicatorsUsed : Text,
    itemReviewed : Text,
    maintenanceAction : Text,
    manipulatedVariables : Text,
    mpvShortList : Text,
    scoreSummary : Text,
    trueCheck : Bool,
    varControlStatus : Text,
    varDefSummary : Text,
  ) : async (Nat, DataHistoryEntry) {
    let id = entries.size();

    let filterLabels = List.empty<Text>();

    switch (filterLabelsOpt) {
      case (null) {};
      case (?labels) {
        labels.values().forEach(
          func(filterLabel) {
            if (filterLabel.size() > 0) {
              filterLabels.add(filterLabel);
            };
          }
        );
      };
    };

    let entry = {
      determinant;
      diagnosticTestResult;
      dtSensitivityScore;
      filterCount;
      filterLabels = filterLabels.toArray();
      indicatorsUsed;
      itemReviewed;
      maintenanceAction;
      manipulatedVariables;
      mpvShortList;
      scoreSummary;
      trueCheck;
      varControlStatus;
      varDefSummary;
    };
    entries.add(id, entry);
    (id, entry);
  };

  public query ({ caller }) func getEntry(id : Nat) : async ?DataHistoryEntry {
    entries.get(id);
  };

  public query ({ caller }) func listEntries() : async [(Nat, DataHistoryEntry)] {
    entries.toArray();
  };

  public shared ({ caller }) func clearHistory() : async () {
    entries.clear();
  };

  public query ({ caller }) func count() : async Nat {
    entries.size();
  };

  public query ({ caller }) func existsWithFilterCount(filterCount : Nat) : async Bool {
    let iter = entries.filter(
      func(_id, entry) {
        entry.filterCount == filterCount;
      }
    );
    not iter.isEmpty();
  };

  public shared ({ caller }) func clearWithFilterCount(filterCount : Nat) : async () {
    entries.forEach(
      func(id, entry) {
        if (entry.filterCount == filterCount) {
          entries.remove(id);
        };
      }
    );
  };

  public query ({ caller }) func findByFilterLabel(filterLabel : Text) : async [(Nat, DataHistoryEntry)] {
    entries.toArray().filter(
      func((_, entry)) {
        entry.filterLabels.any(func(existingLabel) { existingLabel == filterLabel });
      }
    );
  };

  public shared ({ caller }) func convertAndAddHistoryEntry(
    determinant : Text,
    diagnosticTestResult : Text,
    dtSensitivityScore : Nat,
    filterCount : Nat,
    filterLabelsArray : [Text],
    indicatorsUsed : Text,
    itemReviewed : Text,
    maintenanceAction : Text,
    manipulatedVariables : Text,
    mpvShortList : Text,
    scoreSummary : Text,
    trueCheck : Bool,
    varControlStatus : Text,
    varDefSummary : Text,
  ) : async (Nat, DataHistoryEntry) {
    await addHistoryEntry(determinant, diagnosticTestResult, dtSensitivityScore, filterCount, ?filterLabelsArray, indicatorsUsed, itemReviewed, maintenanceAction, manipulatedVariables, mpvShortList, scoreSummary, trueCheck, varControlStatus, varDefSummary);
  };

  public shared ({ caller }) func clearWithFilterLabel(filterLabel : Text) : async () {
    entries.forEach(
      func(id, entry) {
        if (entry.filterLabels.any(func(existingLabel) { existingLabel == filterLabel })) {
          entries.remove(id);
        };
      }
    );
  };
};
