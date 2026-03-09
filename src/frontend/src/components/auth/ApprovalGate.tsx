import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useActor } from "../../hooks/useActor";
import { useIsCallerAdmin, useIsCallerApproved } from "../../hooks/useApproval";
import { useRequestApproval } from "../../hooks/useApprovalMutations";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";

interface ApprovalGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ApprovalGate({ children, fallback }: ApprovalGateProps) {
  const { identity } = useInternetIdentity();
  const {
    data: isApproved,
    isLoading: approvalLoading,
    refetch: refetchApproved,
  } = useIsCallerApproved();
  const {
    data: isAdmin,
    isLoading: adminLoading,
    refetch: refetchAdmin,
  } = useIsCallerAdmin();
  const requestApprovalMutation = useRequestApproval();
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const [adminToken, setAdminToken] = useState("");
  const [adminTokenError, setAdminTokenError] = useState("");
  const [adminTokenSuccess, setAdminTokenSuccess] = useState(false);
  const [isClaimingAdmin, setIsClaimingAdmin] = useState(false);
  const [showAdminClaim, setShowAdminClaim] = useState(false);
  const [isCheckingAgain, setIsCheckingAgain] = useState(false);

  const isAuthenticated = !!identity;
  const isLoading = approvalLoading || adminLoading;

  const handleCheckAgain = async () => {
    setIsCheckingAgain(true);
    try {
      await refetchAdmin();
      await refetchApproved();
    } finally {
      setIsCheckingAgain(false);
    }
  };

  const handleClaimAdmin = async () => {
    if (!actor || !adminToken.trim()) return;
    setIsClaimingAdmin(true);
    setAdminTokenError("");
    setAdminTokenSuccess(false);
    try {
      const actorAny = actor as unknown as Record<
        string,
        (token: string) => Promise<void>
      >;
      if (typeof actorAny._initializeAccessControlWithSecret === "function") {
        await actorAny._initializeAccessControlWithSecret(adminToken.trim());
      }
      setAdminTokenSuccess(true);
      // Invalidate and wait for re-fetch
      await queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
      await queryClient.invalidateQueries({ queryKey: ["isCallerApproved"] });
      await refetchAdmin();
      await refetchApproved();
    } catch (err) {
      setAdminTokenError(
        "Invalid admin token. Please check the token and try again.",
      );
      console.error("Admin claim error:", err);
    } finally {
      setIsClaimingAdmin(false);
    }
  };

  // Not authenticated - show nothing (login required)
  if (!isAuthenticated) {
    return fallback || null;
  }

  // Loading approval status
  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Checking access permissions...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Admin or approved user - grant access
  if (isAdmin || isApproved) {
    return <>{children}</>;
  }

  // Not approved - show approval request UI + admin claim option
  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-4">
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          Your account is pending approval. Please request access to use this
          application.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Access Request Required</CardTitle>
          <CardDescription>
            This application requires admin approval before you can access its
            features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to submit an access request. An administrator
            will review your request and approve or reject it.
          </p>

          {requestApprovalMutation.isSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your access request has been submitted successfully. Please wait
                for admin approval.
              </AlertDescription>
            </Alert>
          )}

          {requestApprovalMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {requestApprovalMutation.error instanceof Error
                  ? requestApprovalMutation.error.message
                  : "Failed to submit access request. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => requestApprovalMutation.mutate()}
            disabled={
              requestApprovalMutation.isPending ||
              requestApprovalMutation.isSuccess
            }
            className="w-full"
            data-ocid="approval.request_button"
          >
            {requestApprovalMutation.isPending
              ? "Submitting Request..."
              : requestApprovalMutation.isSuccess
                ? "Request Submitted"
                : "Request Access"}
          </Button>

          <Button
            variant="outline"
            onClick={handleCheckAgain}
            disabled={isCheckingAgain}
            className="w-full gap-2"
            data-ocid="approval.check_again_button"
          >
            {isCheckingAgain ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Check Again
          </Button>
        </CardContent>
      </Card>

      {/* Admin Claim Section — for admin users who haven't claimed their role yet */}
      <Card className="border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-900/10">
        <CardHeader className="pb-2">
          <button
            type="button"
            onClick={() => setShowAdminClaim((v) => !v)}
            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
            data-ocid="approval.admin_claim.toggle"
          >
            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <CardTitle className="text-base text-amber-800 dark:text-amber-300">
              Are you an administrator?
            </CardTitle>
            <span className="text-xs text-amber-600 dark:text-amber-400 ml-auto">
              {showAdminClaim ? "Hide" : "Show"}
            </span>
          </button>
          <CardDescription className="text-amber-700 dark:text-amber-400/80 text-xs mt-1">
            If you have an admin token, enter it here to claim admin access
          </CardDescription>
        </CardHeader>

        {showAdminClaim && (
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-1.5">
              <Label htmlFor="claim-adminToken" className="text-sm font-medium">
                Admin Token
              </Label>
              <Input
                id="claim-adminToken"
                type="password"
                value={adminToken}
                onChange={(e) => {
                  setAdminToken(e.target.value);
                  setAdminTokenError("");
                  setAdminTokenSuccess(false);
                }}
                placeholder="Enter admin token to claim admin access"
                className="h-9"
                data-ocid="approval.admin_token.input"
              />
            </div>

            {adminTokenError && (
              <Alert
                variant="destructive"
                data-ocid="approval.admin_claim.error_state"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {adminTokenError}
                </AlertDescription>
              </Alert>
            )}

            {adminTokenSuccess && (
              <Alert data-ocid="approval.admin_claim.success_state">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-xs text-green-700 dark:text-green-400 font-medium">
                  Admin token accepted! Verifying access...
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleClaimAdmin}
              disabled={isClaimingAdmin || !adminToken.trim()}
              className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              data-ocid="approval.admin_claim.submit_button"
            >
              {isClaimingAdmin ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Claim Admin Access
                </>
              )}
            </Button>

            <p className="text-xs text-amber-700/70 dark:text-amber-400/60">
              The admin token was provided when this application was deployed.
              Contact your system administrator if you don't have it.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
