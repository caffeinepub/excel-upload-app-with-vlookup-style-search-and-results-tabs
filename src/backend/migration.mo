import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";

module {
  public type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    approvalState : UserApproval.UserApprovalState;
    userProfiles : Map.Map<Principal, { displayName : Text; profilePicture : ?Blob; departmentId : ?Nat }>;
  };

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    approvalState : UserApproval.UserApprovalState;
    userProfiles : Map.Map<Principal, { displayName : Text; profilePicture : ?Blob; departmentId : ?Nat }>;
  };

  public func run(old : OldActor) : NewActor {
    old;
  };
};
