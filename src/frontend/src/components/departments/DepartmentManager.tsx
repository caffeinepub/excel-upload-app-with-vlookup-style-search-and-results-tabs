import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useAdminAssignUserToDepartment,
  useCreateDepartment,
  useDeleteDepartment,
  useListDepartments,
  useUpdateDepartment,
} from "../../hooks/useDepartments";
import { useObserveUsers } from "../../hooks/useObserveUsers";

// Helpers for extra-dept localStorage map
function getExtraDeptMap(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem("userExtraDepts") ?? "{}") as Record<
      string,
      string[]
    >;
  } catch {
    return {};
  }
}

function saveExtraDeptMap(map: Record<string, string[]>) {
  localStorage.setItem("userExtraDepts", JSON.stringify(map));
}

function addUserToExtraDept(principalStr: string, deptId: string) {
  const map = getExtraDeptMap();
  const existing = map[principalStr] ?? [];
  if (!existing.includes(deptId)) {
    map[principalStr] = [...existing, deptId];
    saveExtraDeptMap(map);
  }
}

function removeUserFromExtraDept(principalStr: string, deptId: string) {
  const map = getExtraDeptMap();
  map[principalStr] = (map[principalStr] ?? []).filter((id) => id !== deptId);
  saveExtraDeptMap(map);
}

export default function DepartmentManager() {
  const { data: departments = [], isLoading } = useListDepartments();
  const { data: allUsers = [] } = useObserveUsers();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();
  const assignUser = useAdminAssignUserToDepartment();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [editName, setEditName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [addMemberDeptId, setAddMemberDeptId] = useState<bigint | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [, forceUpdate] = useState(0);

  const extraDeptMap = useMemo(() => getExtraDeptMap(), []);

  // Users per department: primary departmentId OR in extra depts
  const getMembersForDept = (deptId: bigint) => {
    const deptIdStr = String(deptId);
    return allUsers.filter((u) => {
      const pStr = u.principal.toString();
      const isPrimary =
        u.profile?.departmentId !== undefined &&
        u.profile.departmentId === deptId;
      const isExtra = (extraDeptMap[pStr] ?? []).includes(deptIdStr);
      return isPrimary || isExtra;
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreateError(null);
    try {
      await createDept.mutateAsync(newName.trim());
      setNewName("");
    } catch (e) {
      setCreateError(String(e));
    }
  };

  const handleEditStart = (id: bigint, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const handleEditSave = async (id: bigint) => {
    if (!editName.trim()) return;
    await updateDept.mutateAsync({ id, newName: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = async (id: bigint) => {
    await deleteDept.mutateAsync(id);
  };

  const handleAddMember = async (principalStr: string, deptId: bigint) => {
    try {
      const { Principal } = await import("@dfinity/principal");
      const principal = Principal.fromText(principalStr);
      await assignUser.mutateAsync({ user: principal, departmentId: deptId });
      // Also save to extra depts so multi-dept works
      addUserToExtraDept(principalStr, String(deptId));
      forceUpdate((n) => n + 1);
      toast.success("Member added to department");
    } catch {
      toast.error("Failed to add member");
    }
  };

  const handleRemoveMember = (principalStr: string, deptId: bigint) => {
    removeUserFromExtraDept(principalStr, String(deptId));
    forceUpdate((n) => n + 1);
    toast.success("Removed from department");
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const getAvatarUrl = (profilePicture?: Uint8Array) => {
    if (!profilePicture || profilePicture.length === 0) return null;
    const blob = new Blob([profilePicture.buffer as ArrayBuffer], {
      type: "image/jpeg",
    });
    return URL.createObjectURL(blob);
  };

  // Users not already in this dept (for search)
  const nonMembersForDept = (deptId: bigint) => {
    const members = getMembersForDept(deptId);
    const memberPrincipals = new Set(
      members.map((m) => m.principal.toString()),
    );
    return allUsers.filter(
      (u) => !memberPrincipals.has(u.principal.toString()) && u.profile,
    );
  };

  const filteredNonMembers = addMemberDeptId
    ? nonMembersForDept(addMemberDeptId).filter((u) =>
        (u.profile?.displayName ?? "")
          .toLowerCase()
          .includes(memberSearch.toLowerCase()),
      )
    : [];

  return (
    <div className="space-y-4">
      {/* Create new dept */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Departments
            <Badge variant="secondary" className="ml-auto">
              {departments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="New department name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="h-8 text-sm"
              data-ocid="departments.input"
            />
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createDept.isPending}
              size="sm"
              className="gap-1 shrink-0"
              data-ocid="departments.primary_button"
            >
              {createDept.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Add
            </Button>
          </div>
          {createError && (
            <p className="text-xs text-destructive mt-1">{createError}</p>
          )}
        </CardContent>
      </Card>

      {/* Department list with members */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : departments.length === 0 ? (
        <p
          className="text-sm text-muted-foreground text-center py-8"
          data-ocid="departments.empty_state"
        >
          No departments yet. Create one above.
        </p>
      ) : (
        <div className="space-y-4">
          {departments.map((dept) => {
            const members = getMembersForDept(dept.id);
            return (
              <Card key={String(dept.id)} className="overflow-hidden">
                <CardHeader className="pb-2 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    {editingId === dept.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 text-sm flex-1"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleEditSave(dept.id)}
                          disabled={updateDept.isPending}
                        >
                          {updateDept.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-semibold text-sm">
                          {dept.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {members.length} member
                          {members.length !== 1 ? "s" : ""}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleEditStart(dept.id, dept.name)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Department
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{dept.name}"?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(dept.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteDept.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : null}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-3 pb-4">
                  {/* Member cards grid */}
                  {members.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic mb-3">
                      No members yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                      {members.map((user) => {
                        const profile = user.profile;
                        const name = profile?.displayName || "Unknown";
                        const initials = getInitials(name);
                        const avatarUrl = profile?.profilePicture
                          ? getAvatarUrl(profile.profilePicture)
                          : null;
                        const pStr = user.principal.toString();
                        return (
                          <div
                            key={pStr}
                            className="relative flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors group"
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveMember(pStr, dept.id)}
                              title="Remove from department"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Avatar className="h-12 w-12">
                              {avatarUrl ? (
                                <AvatarImage src={avatarUrl} alt={name} />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-center min-w-0 w-full">
                              <p className="text-xs font-medium truncate">
                                {name}
                              </p>
                              {profile?.departmentId !== undefined &&
                              profile.departmentId === dept.id ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] mt-0.5"
                                >
                                  Primary
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] mt-0.5"
                                >
                                  Secondary
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Add Member button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      setAddMemberDeptId(dept.id);
                      setMemberSearch("");
                    }}
                    data-ocid="departments.secondary_button"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Member
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Member dialog */}
      <Dialog
        open={addMemberDeptId !== null}
        onOpenChange={(open) => !open && setAddMemberDeptId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Member to Department
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search users by name…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              data-ocid="departments.search_input"
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredNonMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users found.
                </p>
              ) : (
                filteredNonMembers.map((u) => {
                  const name = u.profile?.displayName || "Unknown";
                  const pStr = u.principal.toString();
                  return (
                    <button
                      key={pStr}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors text-left"
                      onClick={() => {
                        if (addMemberDeptId !== null) {
                          void handleAddMember(pStr, addMemberDeptId);
                          setAddMemberDeptId(null);
                        }
                      }}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {pStr.slice(0, 20)}…
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
