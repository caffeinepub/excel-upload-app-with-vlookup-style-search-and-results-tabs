import { useState, useMemo } from 'react';
import { useIsCallerAdmin } from '../hooks/useApproval';
import { useObserveUsers } from '../hooks/useObserveUsers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Users, Search, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUserFriendlyError } from '../utils/errors/userFriendlyError';
import { ApprovalStatus } from '../backend';
import { toast } from 'sonner';

export function ObserveUsersTab() {
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: users = [], isLoading: usersLoading, error } = useObserveUsers();
  const [searchFilter, setSearchFilter] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchFilter.trim()) return users;
    
    const lowerSearch = searchFilter.toLowerCase();
    return users.filter((user) => {
      const principalStr = user.principal.toString().toLowerCase();
      const profileName = user.profile?.name?.toLowerCase() || '';
      return principalStr.includes(lowerSearch) || profileName.includes(lowerSearch);
    });
  }, [users, searchFilter]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Principal ID copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const truncatePrincipal = (principal: string) => {
    if (principal.length <= 20) return principal;
    return `${principal.slice(0, 10)}...${principal.slice(-10)}`;
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.approved:
        return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
      case ApprovalStatus.pending:
        return <Badge variant="secondary">Pending</Badge>;
      case ApprovalStatus.rejected:
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Access denied for non-admins
  if (!adminLoading && !isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have permission to view this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                Only administrators can observe user information. Please contact your system administrator if you believe this is an error.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (adminLoading || usersLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Observe Users
            </CardTitle>
            <CardDescription>Loading user information...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Observe Users
            </CardTitle>
            <CardDescription>View all user information</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {getUserFriendlyError(error)}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Observe Users
          </CardTitle>
          <CardDescription>
            View all registered users and their information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Filter */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by principal ID or name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users Table */}
          {filteredUsers.length === 0 ? (
            <Alert>
              <AlertDescription>
                {searchFilter.trim() ? 'No users found matching your search.' : 'No users found in the system.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Principal ID</TableHead>
                    <TableHead>Profile Name</TableHead>
                    <TableHead>Approval Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const principalStr = user.principal.toString();
                    return (
                      <TableRow key={principalStr}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {truncatePrincipal(principalStr)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(principalStr)}
                              title="Copy full Principal ID"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.profile?.name ? (
                            <span className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {user.profile.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(principalStr)}
                          >
                            Copy ID
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary */}
          <div className="mt-6 text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
