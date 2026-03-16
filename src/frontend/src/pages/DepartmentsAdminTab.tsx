import React from "react";
import DepartmentManager from "../components/departments/DepartmentManager";
import UserDepartmentAssigner from "../components/departments/UserDepartmentAssigner";
import { useApproval } from "../hooks/useApproval";

export default function DepartmentsAdminTab() {
  const { isAdmin, isLoading } = useApproval();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div>
          <h2 className="text-lg font-semibold">Departments — View Only</h2>
          <p className="text-sm text-muted-foreground">
            You can view department members but cannot make changes.
          </p>
        </div>
        <DepartmentManager readOnly={true} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold">Department Management</h2>
        <p className="text-sm text-muted-foreground">
          Create, edit, and delete departments. Assign users to departments.
        </p>
      </div>
      <DepartmentManager />
      <UserDepartmentAssigner />
    </div>
  );
}
