import React, { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCustomers, useAddCustomer, useUpdateCustomer, useDeleteCustomer } from '../hooks/useCustomers';
import CustomerFormDialog from '../components/customers/CustomerFormDialog';
import CustomerImportDialog from '../components/customers/CustomerImportDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Plus, Pencil, Trash2, Loader2, Search, Upload } from 'lucide-react';
import type { Customer } from '../backend';

export default function CustomersTab() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: customers, isLoading, error } = useGetCustomers();
  const addMutation = useAddCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const [showAdd, setShowAdd] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');
  const [mutationError, setMutationError] = useState('');

  const filtered = (customers || []).filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phoneNumber.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q)
    );
  });

  const handleAdd = async (data: {
    name: string; email: string; phoneNumber: string;
    address: string; company: string; workDetails: string;
  }) => {
    setMutationError('');
    try {
      await addMutation.mutateAsync(data);
      setShowAdd(false);
    } catch (e: unknown) {
      setMutationError(e instanceof Error ? e.message : 'Failed to add customer.');
      throw e;
    }
  };

  const handleUpdate = async (data: {
    name: string; email: string; phoneNumber: string;
    address: string; company: string; workDetails: string;
  }) => {
    if (!editCustomer) return;
    setMutationError('');
    try {
      await updateMutation.mutateAsync({ id: editCustomer.id, ...data });
      setEditCustomer(null);
    } catch (e: unknown) {
      setMutationError(e instanceof Error ? e.message : 'Failed to update customer.');
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!deleteCustomer) return;
    try {
      await deleteMutation.mutateAsync(deleteCustomer.id);
      setDeleteCustomer(null);
    } catch {
      // silent
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Users className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Please log in to view your customers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Customers</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your customer records</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImport(true)}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Error */}
      {(error || mutationError) && (
        <Alert variant="destructive">
          <AlertDescription>{mutationError || 'Failed to load customers.'}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 gap-3 border-2 border-dashed border-border rounded-xl">
          <Users className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            {search ? 'No customers match your search.' : 'No customers yet. Add one or import from a file.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={customer.id.toString()}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.email || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.phoneNumber || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.company || '—'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[150px] truncate">{customer.address || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditCustomer(customer)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteCustomer(customer)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Dialog */}
      <CustomerFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSubmit={handleAdd}
        isLoading={addMutation.isPending}
        title="Add Customer"
      />

      {/* Edit Dialog */}
      <CustomerFormDialog
        open={!!editCustomer}
        onOpenChange={(v) => { if (!v) setEditCustomer(null); }}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        title="Edit Customer"
        initialData={editCustomer ?? undefined}
      />

      {/* Import Dialog */}
      <CustomerImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        existingCustomers={customers || []}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCustomer} onOpenChange={(v) => { if (!v) setDeleteCustomer(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteCustomer?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
