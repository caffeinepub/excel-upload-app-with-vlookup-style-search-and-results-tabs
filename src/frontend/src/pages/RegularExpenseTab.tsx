import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useGetBudget, useSaveBudget, useGetExpenses, useAddExpense, useEditExpense, useDeleteExpense } from '../hooks/useRegularExpense';
import { buildExpenseReportData, generateReportFilename, type ReportType } from '../lib/expenses/expenseReport';
import { exportToPdf } from '../lib/export/exportPdf';
import { getUserFriendlyError } from '../utils/errors/userFriendlyError';
import { validateNatInput } from '../utils/number/parseNatBigInt';
import { AlertCircle, DollarSign, Download, Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function RegularExpenseTab() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const isAuthenticated = !!identity;
  const isActorReady = !!actor && !actorFetching;

  // Budget state
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [dayLimit, setDayLimit] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [budgetError, setBudgetError] = useState('');

  // Expense form state
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseError, setExpenseError] = useState('');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');

  // Report state
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [isExporting, setIsExporting] = useState(false);

  // Queries and mutations
  const { data: budget, isLoading: budgetLoading } = useGetBudget();
  const { data: expenses = [], isLoading: expensesLoading } = useGetExpenses();
  const saveBudgetMutation = useSaveBudget();
  const addExpenseMutation = useAddExpense();
  const editExpenseMutation = useEditExpense();
  const deleteExpenseMutation = useDeleteExpense();

  // Initialize budget form from fetched data
  useEffect(() => {
    if (budget) {
      setMonthlyLimit(budget.monthlyLimit.toString());
      setDayLimit(budget.dayLimit.toString());
      setSavingsGoal(budget.savingsGoal.toString());
    }
  }, [budget]);

  // Validate budget inputs
  const validateBudgetInputs = (): boolean => {
    const monthlyError = validateNatInput(monthlyLimit);
    const dayError = validateNatInput(dayLimit);
    const savingsError = validateNatInput(savingsGoal);

    if (monthlyError) {
      setBudgetError(`Monthly limit: ${monthlyError}`);
      return false;
    }
    if (dayError) {
      setBudgetError(`Daily limit: ${dayError}`);
      return false;
    }
    if (savingsError) {
      setBudgetError(`Savings goal: ${savingsError}`);
      return false;
    }

    setBudgetError('');
    return true;
  };

  // Validate expense inputs
  const validateExpenseInputs = (): boolean => {
    if (!expenseDate || !expenseCategory || !expenseAmount) {
      setExpenseError('Please fill in all required fields');
      return false;
    }

    const amountError = validateNatInput(expenseAmount);
    if (amountError) {
      setExpenseError(`Amount: ${amountError}`);
      return false;
    }

    setExpenseError('');
    return true;
  };

  // Validate edit inputs
  const validateEditInputs = (): boolean => {
    if (!editDate || !editCategory || !editAmount) {
      setEditError('Please fill in all required fields');
      return false;
    }

    const amountError = validateNatInput(editAmount);
    if (amountError) {
      setEditError(`Amount: ${amountError}`);
      return false;
    }

    setEditError('');
    return true;
  };

  const handleSaveBudget = async () => {
    if (!validateBudgetInputs()) return;

    try {
      setBudgetError('');
      await saveBudgetMutation.mutateAsync({
        monthlyLimit,
        dayLimit,
        savingsGoal,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      const friendlyError = getUserFriendlyError(error);
      setBudgetError(friendlyError);
    }
  };

  const handleAddExpense = async () => {
    if (!validateExpenseInputs()) return;

    try {
      setExpenseError('');
      await addExpenseMutation.mutateAsync({
        date: expenseDate,
        category: expenseCategory,
        amount: expenseAmount,
        description: expenseDescription,
      });
      // Clear form
      setExpenseDate('');
      setExpenseCategory('');
      setExpenseAmount('');
      setExpenseDescription('');
    } catch (error) {
      const friendlyError = getUserFriendlyError(error);
      setExpenseError(friendlyError);
    }
  };

  const openEditDialog = (expense: any) => {
    setEditingExpense(expense);
    setEditDate(expense.date);
    setEditCategory(expense.category);
    setEditAmount(expense.amount.toString());
    setEditDescription(expense.description);
    setEditError('');
    setEditDialogOpen(true);
  };

  const handleEditExpense = async () => {
    if (!editingExpense || !validateEditInputs()) return;

    try {
      setEditError('');
      await editExpenseMutation.mutateAsync({
        id: editingExpense.id,
        date: editDate,
        category: editCategory,
        amount: editAmount,
        description: editDescription,
      });
      setEditDialogOpen(false);
      setEditingExpense(null);
    } catch (error) {
      const friendlyError = getUserFriendlyError(error);
      setEditError(friendlyError);
    }
  };

  const handleDeleteExpense = async (expense: any) => {
    if (!confirm('Delete this expense?')) return;

    try {
      await deleteExpenseMutation.mutateAsync({
        id: expense.id,
        details: `${expense.category} - $${expense.amount}`,
      });
    } catch (error) {
      const friendlyError = getUserFriendlyError(error);
      alert(friendlyError);
    }
  };

  const handleDownloadReport = async () => {
    if (expenses.length === 0) {
      alert('No expenses to export');
      return;
    }

    setIsExporting(true);
    try {
      const reportData = buildExpenseReportData(expenses, reportType);
      const filename = generateReportFilename(reportType);
      // Pass data as a single object with headers and rows
      await exportToPdf({ headers: reportData.headers, rows: reportData.rows }, filename);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const monthlyBudget = budget ? Number(budget.monthlyLimit) : 0;
  const remainingBudget = monthlyBudget - totalExpenses;

  if (!isAuthenticated) {
    return (
      <div className="max-w-6xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view and manage your budget and expenses.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            Budget & Expenses
          </h1>
          <p className="text-muted-foreground mt-1">Track your spending and manage your budget</p>
        </div>
      </div>

      {actorFetching && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>Connecting to backend...</AlertDescription>
        </Alert>
      )}

      {/* Budget Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Settings</CardTitle>
          <CardDescription>Set your monthly and daily spending limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="monthlyLimit">Monthly Limit ($)</Label>
              <Input
                id="monthlyLimit"
                type="number"
                min="0"
                step="1"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                placeholder="5000"
                disabled={budgetLoading || !isActorReady}
              />
            </div>
            <div>
              <Label htmlFor="dayLimit">Daily Limit ($)</Label>
              <Input
                id="dayLimit"
                type="number"
                min="0"
                step="1"
                value={dayLimit}
                onChange={(e) => setDayLimit(e.target.value)}
                placeholder="200"
                disabled={budgetLoading || !isActorReady}
              />
            </div>
            <div>
              <Label htmlFor="savingsGoal">Savings Goal ($)</Label>
              <Input
                id="savingsGoal"
                type="number"
                min="0"
                step="1"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
                placeholder="10000"
                disabled={budgetLoading || !isActorReady}
              />
            </div>
          </div>
          {budgetError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{budgetError}</AlertDescription>
            </Alert>
          )}
          <Button 
            onClick={handleSaveBudget} 
            disabled={saveBudgetMutation.isPending || !isActorReady || !monthlyLimit || !dayLimit || !savingsGoal}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saveBudgetMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Budget'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Budget Summary */}
      {budget && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Monthly Budget</CardDescription>
              <CardTitle className="text-2xl text-emerald-600">${monthlyBudget.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Expenses</CardDescription>
              <CardTitle className="text-2xl">${totalExpenses.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Remaining</CardDescription>
              <CardTitle className={`text-2xl ${remainingBudget < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                ${remainingBudget.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <Separator />

      {/* Add Expense */}
      <Card>
        <CardHeader>
          <CardTitle>Add Expense</CardTitle>
          <CardDescription>Record a new expense</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="expenseDate">Date *</Label>
              <Input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                disabled={!isActorReady}
              />
            </div>
            <div>
              <Label htmlFor="expenseCategory">Category *</Label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory} disabled={!isActorReady}>
                <SelectTrigger id="expenseCategory">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Shopping">Shopping</SelectItem>
                  <SelectItem value="Bills">Bills</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expenseAmount">Amount ($) *</Label>
              <Input
                id="expenseAmount"
                type="number"
                min="0"
                step="1"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="50"
                disabled={!isActorReady}
              />
            </div>
            <div>
              <Label htmlFor="expenseDescription">Description</Label>
              <Input
                id="expenseDescription"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="Lunch at cafe"
                disabled={!isActorReady}
              />
            </div>
          </div>
          {expenseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{expenseError}</AlertDescription>
            </Alert>
          )}
          <Button 
            onClick={handleAddExpense} 
            disabled={addExpenseMutation.isPending || !isActorReady || !expenseDate || !expenseCategory || !expenseAmount}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {addExpenseMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Expense History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Expense History</CardTitle>
              <CardDescription>View and manage your expenses</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleDownloadReport} 
                disabled={isExporting || expenses.length === 0}
                variant="outline"
                size="sm"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {expensesLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading expenses...</p>
          ) : expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No expenses yet. Add your first expense above.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((expense) => (
                      <TableRow key={Number(expense.id)}>
                        <TableCell>{expense.date}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell className="font-medium">${Number(expense.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">{expense.description || '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(expense)}
                              disabled={!isActorReady}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteExpense(expense)}
                              disabled={deleteExpenseMutation.isPending || !isActorReady}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update expense details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editDate">Date *</Label>
              <Input
                id="editDate"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editCategory">Category *</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger id="editCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Shopping">Shopping</SelectItem>
                  <SelectItem value="Bills">Bills</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editAmount">Amount ($) *</Label>
              <Input
                id="editAmount"
                type="number"
                min="0"
                step="1"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editDescription">Description</Label>
              <Input
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            {editError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={handleEditExpense} 
              disabled={editExpenseMutation.isPending || !editDate || !editCategory || !editAmount}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {editExpenseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
