import { useState } from 'react';
import { useIsCallerAdmin, useListApprovals } from '../hooks/useApproval';
import { useSetApproval } from '../hooks/useApprovalMutations';
import { ApprovalStatus } from '../backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getUserFriendlyError } from '../utils/errors/userFriendlyError';
import type { Principal } from '@icp-sdk/core/principal';

export function AdminUsersTab() {
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: approvals = [], isLoading: approvalsLoading, refetch } = useListApprovals();
  const setApprovalMutation = useSetApproval();

  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleApprove = async (principal: Principal) => {
    const principalStr = principal.toString();
    setProcessingUser(principalStr);
    setActionError(null);

    try {
      await setApprovalMutation.mutateAsync({
        user: principal,
        status: ApprovalStatus.approved,
      });
      await refetch();
    } catch (error) {
      console.error('Failed to approve user:', error);
      setActionError(getUserFriendlyError(error));
    } finally {
      setProcessingUser(null);
    }
  };

  const handleReject = async (principal: Principal) => {
    if (!confirm('Are you sure you want to reject this user?')) return;

    const principalStr = principal.toString();
    setProcessingUser(principalStr);
    setActionError(null);

    try {
      await setApprovalMutation.mutateAsync({
        user: principal,
        status: ApprovalStatus.rejected,
      });
      await refetch();
    } catch (error) {
      console.error('Failed to reject user:', error);
      setActionError(getUserFriendlyError(error));
    } finally {
      setProcessingUser(null);
    }
  };

  if (adminLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only administrators can manage users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.approved:
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case ApprovalStatus.rejected:
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case ApprovalStatus.pending:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8" />
          User Management
        </h1>
        <p className="text-muted-foreground mt-1">Manage user access and approvals</p>
      </div>

      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {approvals.length} {approvals.length === 1 ? 'user' : 'users'} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvalsLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading users...</p>
          ) : approvals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Principal ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((approval) => {
                    const principalStr = approval.principal.toString();
                    const isProcessing = processingUser === principalStr;

                    return (
                      <TableRow key={principalStr}>
                        <TableCell className="font-mono text-xs">
                          {principalStr.slice(0, 20)}...
                        </TableCell>
                        <TableCell>{getStatusBadge(approval.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {approval.status !== ApprovalStatus.approved && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(approval.principal)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? 'Processing...' : 'Approve'}
                              </Button>
                            )}
                            {approval.status !== ApprovalStatus.rejected && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(approval.principal)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? 'Processing...' : 'Reject'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> Username/password authentication and user editing/deletion features are coming soon.
          Currently, only Internet Identity authentication is supported.
        </AlertDescription>
      </Alert>
    </div>
  );
}
