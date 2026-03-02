import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type UserProfile = {
    displayName : Text;
    profilePicture : ?Blob;
  };

  public type OldActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
  };

  public type NewActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
  };

  public func run(old : OldActor) : NewActor {
    old;
  };
};
