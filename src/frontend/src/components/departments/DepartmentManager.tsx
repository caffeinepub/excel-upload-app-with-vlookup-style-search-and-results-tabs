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
import { useQuery } from "@tanstack/react-query";
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
import React, { useState } from "react";
import { toast } from "sonner";
import type { UserProfileFull } from "../../backend";
import { useActor } from "../../hooks/useActor";
import {
  useAdminAssignUserToDepartment,
  useCreateDepartment,
  useDeleteDepartment,
  useListDepartments,
  useUpdateDepartment,
} from "../../hooks/useDepartments";
import { useObserveUsers } from "../../hooks/useObserveUsers";

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

/** Fetch users in a department directly from backend */
function useDepartmentMembers(deptId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfileFull[]>({
    queryKey: ["usersInDepartment", deptId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        // Pass bigint directly as the backend expects
        const result = await actor.getUsersInDepartment(deptId.toString());
        return (result as UserProfileFull[]) ?? [];
      } catch {
        try {
          // Fallback: try string
          const result = await (actor as any).getUsersInDepartment(
            deptId.toString(),
          );
          return (result as UserProfileFull[]) ?? [];
        } catch {
          return [];
        }
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchInterval: 20000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

function MemberAvatar({ member }: { member: UserProfileFull }) {
  return (
    <Avatar className="h-12 w-12">
      {member.avatarUrl ? (
        <AvatarImage src={member.avatarUrl} alt={member.displayName} />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-primary text-sm">
        {getInitials(member.displayName || "?")}
      </AvatarFallback>
    </Avatar>
  );
}

function DeptMemberCards({
  deptId,
  readOnly,
  onRemoveMember,
}: {
  deptId: bigint;
  readOnly: boolean;
  onRemoveMember?: (principalStr: string) => void;
}) {
  const { data: members = [], isLoading } = useDepartmentMembers(deptId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Loading members\u2026
        </span>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <p
        className="text-xs text-muted-foreground italic mb-3"
        data-ocid="departments.members.empty_state"
      >
        No members yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
      {members.map((member, idx) => (
        <div
          key={member.displayName || String(idx)}
          className="relative flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors group"
          data-ocid={`departments.member.card.${idx + 1}`}
        >
          {!readOnly && onRemoveMember && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={() => onRemoveMember(member.displayName)}
              title="Remove from department"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <MemberAvatar member={member} />
          <div className="text-center min-w-0 w-full">
            <p className="text-xs font-medium truncate">{member.displayName}</p>
            {member.jobTitle && (
              <p className="text-[10px] text-muted-foreground truncate">
                {member.jobTitle}
              </p>
            )}
            {member.email && (
              <p className="text-[10px] text-muted-foreground truncate">
                {member.email}
              </p>
            )}
            {member.phone && (
              <p className="text-[10px] text-muted-foreground truncate">
                {member.phone}
              </p>
            )}
            <Badge variant="outline" className="text-[10px] mt-0.5">
              Member
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DepartmentManager({
  readOnly = false,
}: { readOnly?: boolean }) {
  const { data: departments = [], isLoading } = useListDepartments();
  const { data: adminUsers = [] } = useObserveUsers();

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
      toast.success("Member added to department");
    } catch {
      toast.error("Failed to add member");
    }
  };

  const filteredNonMembers = addMemberDeptId
    ? adminUsers
        .filter((u) => u.profile?.displayName)
        .filter((u) =>
          (u.profile?.displayName ?? "")
            .toLowerCase()
            .includes(memberSearch.toLowerCase()),
        )
    : [];

  return (
    <div className="space-y-4">
      {/* Create new dept */}
      {!readOnly && (
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
                placeholder="New department name\u2026"
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
      )}

      {/* Read-only header */}
      {readOnly && (
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            Departments
          </h3>
          <Badge variant="secondary" className="ml-1">
            {departments.length}
          </Badge>
        </div>
      )}

      {/* Department list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading\u2026</p>
      ) : departments.length === 0 ? (
        <p
          className="text-sm text-muted-foreground text-center py-8"
          data-ocid="departments.empty_state"
        >
          No departments yet.
        </p>
      ) : (
        <div className="space-y-4">
          {departments.map((dept) => {
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
                        {!readOnly && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleEditStart(dept.id, dept.name)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {!readOnly && (
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
                                  Are you sure you want to delete &ldquo;
                                  {dept.name}&rdquo;? This action cannot be
                                  undone.
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
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-3 pb-4">
                  {/* Show member cards in both admin AND read-only mode */}
                  <DeptMemberCards deptId={dept.id} readOnly={readOnly} />
                  {!readOnly && (
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
                  )}
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
              placeholder="Search users by name\u2026"
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
