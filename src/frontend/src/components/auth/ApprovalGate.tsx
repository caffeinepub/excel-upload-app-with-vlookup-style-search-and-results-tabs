import { ReactNode } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useIsCallerApproved, useIsCallerAdmin } from '../../hooks/useApproval';
import { useRequestApproval } from '../../hooks/useApprovalMutations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface ApprovalGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ApprovalGate({ children, fallback }: ApprovalGateProps) {
  const { identity } = useInternetIdentity();
  const { data: isApproved, isLoading: approvalLoading } = useIsCallerApproved();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const requestApprovalMutation = useRequestApproval();

  const isAuthenticated = !!identity;
  const isLoading = approvalLoading || adminLoading;

  // Not authenticated - show nothing (login required)
  if (!isAuthenticated) {
    return fallback || null;
  }

  // Loading approval status
  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Checking access permissions...</p>
        </CardContent>
      </Card>
    );
  }

  // Admin or approved user - grant access
  if (isAdmin || isApproved) {
    return <>{children}</>;
  }

  // Not approved - show approval request UI
  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-4">
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          Your account is pending approval. Please request access to use this application.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Access Request Required</CardTitle>
          <CardDescription>
            This application requires admin approval before you can access its features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to submit an access request. An administrator will review your request and approve or reject it.
          </p>

          {requestApprovalMutation.isSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your access request has been submitted successfully. Please wait for admin approval.
              </AlertDescription>
            </Alert>
          )}

          {requestApprovalMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {requestApprovalMutation.error instanceof Error
                  ? requestApprovalMutation.error.message
                  : 'Failed to submit access request. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => requestApprovalMutation.mutate()}
            disabled={requestApprovalMutation.isPending || requestApprovalMutation.isSuccess}
            className="w-full"
          >
            {requestApprovalMutation.isPending
              ? 'Submitting Request...'
              : requestApprovalMutation.isSuccess
              ? 'Request Submitted'
              : 'Request Access'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
