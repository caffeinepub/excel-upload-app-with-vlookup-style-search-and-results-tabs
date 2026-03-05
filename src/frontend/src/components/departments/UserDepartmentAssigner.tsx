import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Principal } from "@dfinity/principal";
import { CheckCircle, Loader2, Users } from "lucide-react";
import React, { useState } from "react";
import {
  useAdminAssignUserToDepartment,
  useListDepartments,
} from "../../hooks/useDepartments";
import { useObserveUsers } from "../../hooks/useObserveUsers";

export default function UserDepartmentAssigner() {
  const { data: departments = [] } = useListDepartments();
  const { data: users = [] } = useObserveUsers();
  const assignMutation = useAdminAssignUserToDepartment();

  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!selectedUser || !selectedDept) return;
    setError(null);
    setSuccess(false);
    try {
      await assignMutation.mutateAsync({
        user: Principal.fromText(selectedUser),
        departmentId: BigInt(selectedDept),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(String(e));
    }
  };

  const selectedUserObj = users.find(
    (u) => u.principal.toString() === selectedUser,
  );
  const currentDeptName =
    selectedUserObj?.profile?.departmentId != null
      ? (departments.find((d) => d.id === selectedUserObj.profile!.departmentId)
          ?.name ?? "Unknown")
      : "None";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Assign Users to Departments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Select User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Choose a user…" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem
                    key={u.principal.toString()}
                    value={u.principal.toString()}
                  >
                    {u.profile?.displayName ??
                      `${u.principal.toString().slice(0, 16)}…`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUser && (
              <p className="text-xs text-muted-foreground">
                Current dept: {currentDeptName}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Assign to Department</Label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Choose a department…" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={String(d.id)} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleAssign}
          disabled={!selectedUser || !selectedDept || assignMutation.isPending}
          size="sm"
          className="gap-2"
        >
          {assignMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : success ? (
            <CheckCircle className="h-3 w-3" />
          ) : null}
          {success ? "Assigned!" : "Assign"}
        </Button>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
