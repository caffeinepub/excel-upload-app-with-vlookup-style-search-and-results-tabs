import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetBudget, useSaveBudget, useGetExpenses, useAddExpense } from '../hooks/useRegularExpense';
import { buildExpenseReportData, generateReportFilename, type ReportType } from '../lib/expenses/expenseReport';
import { exportToPdf } from '../lib/export/exportPdf';
import { AlertCircle, DollarSign, Download, Plus, Loader2 } from 'lucide-react';

export function RegularExpenseTab() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  // Budget state
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');

  // Expense form state
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');

  // Report state
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [isExporting, setIsExporting] = useState(false);

  // Queries and mutations
  const { data: budget, isLoading: budgetLoading } = useGetBudget();
  const { data: expenses = [], isLoading: expensesLoading } = useGetExpenses();
  const saveBudgetMutation = useSaveBudget();
  const addExpenseMutation = useAddExpense();

  // Initialize form with existing budget
  useState(() => {
    if (budget) {
      setMonthlyLimit(String(Number(budget.monthlyLimit)));
      setSavingsGoal(String(Number(budget.savingsGoal)));
    }
  });

  const handleSaveBudget = async () => {
    if (!isAuthenticated) return;
    
    const limitNum = parseFloat(monthlyLimit);
    const goalNum = parseFloat(savingsGoal);
    
    if (isNaN(limitNum) || limitNum < 0) {
      alert('Please enter a valid monthly limit');
      return;
    }
    if (isNaN(goalNum) || goalNum < 0) {
      alert('Please enter a valid savings goal');
      return;
    }

    try {
      await saveBudgetMutation.mutateAsync({
        monthlyLimit: limitNum,
        savingsGoal: goalNum,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save budget:', error);
      alert('Failed to save budget. Please try again.');
    }
  };

  const handleAddExpense = async () => {
    if (!isAuthenticated) return;
    
    const amountNum = parseFloat(expenseAmount);
    
    if (!expenseDate) {
      alert('Please select a date');
      return;
    }
    if (!expenseType.trim()) {
      alert('Please enter an expense type');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await addExpenseMutation.mutateAsync({
        date: expenseDate,
        type: expenseType,
        amount: amountNum,
        description: expenseDescription,
      });
      
      // Clear form
      setExpenseDate('');
      setExpenseType('');
      setExpenseAmount('');
      setExpenseDescription('');
    } catch (error) {
      console.error('Failed to add expense:', error);
      alert('Failed to add expense. Please try again.');
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
      await exportToPdf(reportData, filename);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Sort expenses by date descending
  const sortedExpenses = [...expenses].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Calculate current month total
  const currentMonthTotal = expenses
    .filter((exp) => {
      const expDate = new Date(exp.date);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, exp) => sum + Number(exp.amount), 0);

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Regular Expense</h2>
          <p className="text-muted-foreground">Track your budget and daily expenses</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to manage your budget and expenses.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Regular Expense</h2>
        <p className="text-muted-foreground">Track your budget and daily expenses</p>
      </div>

      {/* Budget Management */}
      <Card className="mac-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Budget Settings
          </CardTitle>
          <CardDescription>Set your monthly budget limit and savings goal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Monthly Limit</Label>
              <Input
                id="monthlyLimit"
                type="number"
                placeholder="Enter monthly limit"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                disabled={budgetLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="savingsGoal">Savings Goal</Label>
              <Input
                id="savingsGoal"
                type="number"
                placeholder="Enter savings goal"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
                disabled={budgetLoading}
              />
            </div>
          </div>
          <Button
            onClick={handleSaveBudget}
            disabled={saveBudgetMutation.isPending || budgetLoading}
            className="w-full md:w-auto"
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

          {budget && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Monthly Limit</p>
                  <p className="text-lg font-semibold">${Number(budget.monthlyLimit).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Savings Goal</p>
                  <p className="text-lg font-semibold">${Number(budget.savingsGoal).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Month Spent</p>
                  <p className="text-lg font-semibold">${currentMonthTotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="text-lg font-semibold">
                    ${Math.max(0, Number(budget.monthlyLimit) - currentMonthTotal).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense */}
      <Card className="mac-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Expense
          </CardTitle>
          <CardDescription>Log a new expense with date, type, and amount</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expenseDate">Date</Label>
              <Input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseType">Type</Label>
              <Input
                id="expenseType"
                type="text"
                placeholder="e.g., Food, Transport, Bills"
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseAmount">Amount</Label>
              <Input
                id="expenseAmount"
                type="number"
                placeholder="Enter amount"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseDescription">Description (Optional)</Label>
              <Input
                id="expenseDescription"
                type="text"
                placeholder="Add details"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleAddExpense}
            disabled={addExpenseMutation.isPending}
            className="w-full md:w-auto"
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

      <Separator />

      {/* Expense List */}
      <Card className="mac-card">
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>View all your recorded expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {expensesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No expenses recorded yet. Add your first expense above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedExpenses.map((expense) => (
                    <TableRow key={Number(expense.id)}>
                      <TableCell className="whitespace-nowrap">{expense.date}</TableCell>
                      <TableCell>{expense.type}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(expense.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {expense.description || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Report */}
      {expenses.length > 0 && (
        <Card className="mac-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Download Report
            </CardTitle>
            <CardDescription>Export your expense report as PDF</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                  <SelectTrigger id="reportType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly (Last 7 Days)</SelectItem>
                    <SelectItem value="monthly">Monthly (Last 30 Days)</SelectItem>
                    <SelectItem value="yearly">Yearly (Last 365 Days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleDownloadReport}
                  disabled={isExporting}
                  className="w-full sm:w-auto"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
