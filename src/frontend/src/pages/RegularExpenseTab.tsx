import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  DollarSign,
  Download,
  Edit,
  Eye,
  Loader2,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useObserveUsers } from "../hooks/useObserveUsers";
import {
  useAddExpense,
  useDeleteExpense,
  useEditExpense,
  useGetBudget,
  useGetExpenses,
  useGetSharedReports,
  useSaveBudget,
  useShareExpenseReport,
} from "../hooks/useRegularExpense";
import {
  type ReportType,
  buildExpenseReportData,
  generateReportFilename,
} from "../lib/expenses/expenseReport";
import { exportToPdf } from "../lib/export/exportPdf";
import { getUserFriendlyError } from "../utils/errors/userFriendlyError";
import { validateNatInput } from "../utils/number/parseNatBigInt";

export function RegularExpenseTab() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const isAuthenticated = !!identity;
  const isActorReady = !!actor && !actorFetching;

  // Budget state
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [dayLimit, setDayLimit] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [budgetError, setBudgetError] = useState("");

  // Expense form state
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseError, setExpenseError] = useState("");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");

  // Report state
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [isExporting, setIsExporting] = useState(false);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [shareSearch, setShareSearch] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  // View shared report dialog
  const [viewReportOpen, setViewReportOpen] = useState(false);
  const [viewReportData, setViewReportData] = useState<{
    title: string;
    data: string;
  } | null>(null);

  // Queries and mutations
  const { data: budget, isLoading: budgetLoading } = useGetBudget();
  const { data: expenses = [], isLoading: expensesLoading } = useGetExpenses();
  const { data: sharedReports = [], isLoading: sharedReportsLoading } =
    useGetSharedReports();
  const { data: allUsers = [] } = useObserveUsers();
  const saveBudgetMutation = useSaveBudget();
  const addExpenseMutation = useAddExpense();
  const editExpenseMutation = useEditExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const shareReportMutation = useShareExpenseReport();

  const mySelfPrincipal = identity?.getPrincipal().toString() ?? "";

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

    setBudgetError("");
    return true;
  };

  // Validate expense inputs
  const validateExpenseInputs = (): boolean => {
    if (!expenseDate || !expenseCategory || !expenseAmount) {
      setExpenseError("Please fill in all required fields");
      return false;
    }

    const amountError = validateNatInput(expenseAmount);
    if (amountError) {
      setExpenseError(`Amount: ${amountError}`);
      return false;
    }

    setExpenseError("");
    return true;
  };

  // Validate edit inputs
  const validateEditInputs = (): boolean => {
    if (!editDate || !editCategory || !editAmount) {
      setEditError("Please fill in all required fields");
      return false;
    }

    const amountError = validateNatInput(editAmount);
    if (amountError) {
      setEditError(`Amount: ${amountError}`);
      return false;
    }

    setEditError("");
    return true;
  };

  const handleSaveBudget = async () => {
    if (!validateBudgetInputs()) return;

    try {
      setBudgetError("");
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
      setExpenseError("");
      await addExpenseMutation.mutateAsync({
        date: expenseDate,
        category: expenseCategory,
        amount: expenseAmount,
        description: expenseDescription,
      });
      // Clear form
      setExpenseDate("");
      setExpenseCategory("");
      setExpenseAmount("");
      setExpenseDescription("");
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
    setEditDescription(expense.description || "");
    setEditError("");
    setEditDialogOpen(true);
  };

  const handleEditExpense = async () => {
    if (!editingExpense || !validateEditInputs()) return;

    try {
      setEditError("");
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
    if (!confirm("Delete this expense?")) return;

    try {
      await deleteExpenseMutation.mutateAsync({
        id: expense.id,
        details: `${expense.category} - $${Number(expense.amount).toLocaleString()} (${expense.date})`,
      });
    } catch (error) {
      const friendlyError = getUserFriendlyError(error);
      console.error("Failed to delete expense:", friendlyError);
    }
  };

  const handleDownloadReport = async () => {
    if (isExporting || expenses.length === 0) return;

    try {
      setIsExporting(true);
      const reportData = buildExpenseReportData(expenses, reportType);
      const filename = generateReportFilename(reportType);
      await exportToPdf(reportData, filename);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareReport = async () => {
    if (!shareTitle.trim() || selectedRecipients.length === 0) {
      toast.error("Please add a title and select at least one recipient.");
      return;
    }
    try {
      const reportData = buildExpenseReportData(expenses, reportType);
      await shareReportMutation.mutateAsync({
        recipientIds: selectedRecipients,
        reportTitle: shareTitle.trim(),
        reportData: JSON.stringify(reportData),
      });
      toast.success(`Report shared with ${selectedRecipients.length} user(s)!`);
      setShareDialogOpen(false);
      setShareTitle("");
      setSelectedRecipients([]);
      setShareSearch("");
    } catch {
      toast.error("Failed to share report. Please try again.");
    }
  };

  const toggleRecipient = (principalStr: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(principalStr)
        ? prev.filter((p) => p !== principalStr)
        : [...prev, principalStr],
    );
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.principal.toString() !== mySelfPrincipal &&
      u.profile?.displayName?.toLowerCase().includes(shareSearch.toLowerCase()),
  );

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );
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
          <p className="text-muted-foreground mt-1">
            Track your spending and manage your budget
          </p>
        </div>
      </div>

      {actorFetching && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>Connecting to backend...</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses" data-ocid="expenses.tab">
            My Expenses
          </TabsTrigger>
          <TabsTrigger value="shared" data-ocid="expenses.shared.tab">
            Shared with Me
            {sharedReports.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {sharedReports.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* My Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6 mt-4">
          {/* Budget Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Settings</CardTitle>
              <CardDescription>
                Set your monthly and daily spending limits
              </CardDescription>
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
                disabled={
                  saveBudgetMutation.isPending ||
                  !isActorReady ||
                  !monthlyLimit ||
                  !dayLimit ||
                  !savingsGoal
                }
                className="bg-emerald-600 hover:bg-emerald-700"
                data-ocid="expenses.budget.save_button"
              >
                {saveBudgetMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Budget"
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
                  <CardTitle className="text-2xl text-emerald-600">
                    ${monthlyBudget.toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Expenses</CardDescription>
                  <CardTitle className="text-2xl">
                    ${totalExpenses.toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Remaining</CardDescription>
                  <CardTitle
                    className={`text-2xl ${
                      remainingBudget < 0
                        ? "text-destructive"
                        : "text-emerald-600"
                    }`}
                  >
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
                    data-ocid="expenses.date.input"
                  />
                </div>
                <div>
                  <Label htmlFor="expenseCategory">Category *</Label>
                  <Select
                    value={expenseCategory}
                    onValueChange={setExpenseCategory}
                    disabled={!isActorReady}
                  >
                    <SelectTrigger
                      id="expenseCategory"
                      data-ocid="expenses.category.select"
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Food">Food</SelectItem>
                      <SelectItem value="Transport">Transport</SelectItem>
                      <SelectItem value="Entertainment">
                        Entertainment
                      </SelectItem>
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
                    data-ocid="expenses.amount.input"
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
                    data-ocid="expenses.description.input"
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
                disabled={
                  addExpenseMutation.isPending ||
                  !isActorReady ||
                  !expenseDate ||
                  !expenseCategory ||
                  !expenseAmount
                }
                className="bg-emerald-600 hover:bg-emerald-700"
                data-ocid="expenses.add.primary_button"
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
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>Expense History</CardTitle>
                  <CardDescription>
                    View and manage your expenses
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={reportType}
                    onValueChange={(v) => setReportType(v as ReportType)}
                  >
                    <SelectTrigger
                      className="w-32"
                      data-ocid="expenses.report-type.select"
                    >
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
                    data-ocid="expenses.download.button"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShareTitle("");
                      setSelectedRecipients([]);
                      setShareSearch("");
                      setShareDialogOpen(true);
                    }}
                    disabled={expenses.length === 0 || !isActorReady}
                    variant="outline"
                    size="sm"
                    data-ocid="expenses.share.button"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {expensesLoading ? (
                <p
                  className="text-center text-muted-foreground py-8"
                  data-ocid="expenses.loading_state"
                >
                  Loading expenses...
                </p>
              ) : expenses.length === 0 ? (
                <p
                  className="text-center text-muted-foreground py-8"
                  data-ocid="expenses.empty_state"
                >
                  No expenses yet. Add your first expense above.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-ocid="expenses.table">
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
                        .sort(
                          (a, b) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime(),
                        )
                        .map((expense, idx) => (
                          <TableRow
                            key={Number(expense.id)}
                            data-ocid={`expenses.item.${idx + 1}`}
                          >
                            <TableCell>{expense.date}</TableCell>
                            <TableCell>{expense.category}</TableCell>
                            <TableCell className="font-medium">
                              ${Number(expense.amount).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {expense.description || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(expense)}
                                  disabled={!isActorReady}
                                  data-ocid={`expenses.edit_button.${idx + 1}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteExpense(expense)}
                                  disabled={
                                    deleteExpenseMutation.isPending ||
                                    !isActorReady
                                  }
                                  data-ocid={`expenses.delete_button.${idx + 1}`}
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
        </TabsContent>

        {/* Shared with Me Tab */}
        <TabsContent value="shared" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Shared Reports
              </CardTitle>
              <CardDescription>
                Expense reports shared with you by your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sharedReportsLoading ? (
                <p
                  className="text-center text-muted-foreground py-8"
                  data-ocid="shared-reports.loading_state"
                >
                  Loading shared reports...
                </p>
              ) : sharedReports.length === 0 ? (
                <div
                  className="text-center py-12 text-muted-foreground"
                  data-ocid="shared-reports.empty_state"
                >
                  <Share2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">
                    No reports have been shared with you yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedReports.map((report, idx) => {
                    const senderName =
                      allUsers.find(
                        (u) =>
                          u.principal.toString() === report.senderId.toString(),
                      )?.profile?.displayName ??
                      `${report.senderId.toString().slice(0, 12)}…`;
                    const sharedDate = new Date(
                      Number(report.timestamp) / 1_000_000,
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <div
                        key={String(report.id)}
                        className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                        data-ocid={`shared-reports.item.${idx + 1}`}
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {senderName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {report.reportTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            From{" "}
                            <span className="font-medium text-foreground">
                              {senderName}
                            </span>{" "}
                            &middot; {sharedDate}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewReportData({
                              title: report.reportTitle,
                              data: report.reportData,
                            });
                            setViewReportOpen(true);
                          }}
                          data-ocid={`shared-reports.view_button.${idx + 1}`}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Expense Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-ocid="expenses.edit.dialog">
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
              disabled={
                editExpenseMutation.isPending ||
                !editDate ||
                !editCategory ||
                !editAmount
              }
              className="bg-emerald-600 hover:bg-emerald-700"
              data-ocid="expenses.edit.save_button"
            >
              {editExpenseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Report Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md" data-ocid="expenses.share.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Expense Report
            </DialogTitle>
            <DialogDescription>
              Share your current expense report with specific team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="share-title">Report Title *</Label>
              <Input
                id="share-title"
                value={shareTitle}
                onChange={(e) => setShareTitle(e.target.value)}
                placeholder="e.g. Q1 2025 Expenses"
                data-ocid="expenses.share.title.input"
              />
            </div>
            <div className="space-y-2">
              <Label>Select Recipients *</Label>
              <Input
                value={shareSearch}
                onChange={(e) => setShareSearch(e.target.value)}
                placeholder="Search by name…"
                data-ocid="expenses.share.search_input"
              />
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border border-border p-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users found.
                  </p>
                ) : (
                  filteredUsers.map((u) => {
                    const name = u.profile?.displayName ?? "Unknown";
                    const pStr = u.principal.toString();
                    const isSelected = selectedRecipients.includes(pStr);
                    return (
                      <button
                        key={pStr}
                        type="button"
                        onClick={() => toggleRecipient(pStr)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left text-sm ${
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted"
                        }`}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate font-medium">
                          {name}
                        </span>
                        {isSelected && (
                          <Badge
                            variant="secondary"
                            className="text-xs shrink-0"
                          >
                            Selected
                          </Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
              {selectedRecipients.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedRecipients.length} recipient(s) selected
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShareDialogOpen(false)}
              data-ocid="expenses.share.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleShareReport}
              disabled={
                shareReportMutation.isPending ||
                !shareTitle.trim() ||
                selectedRecipients.length === 0
              }
              data-ocid="expenses.share.confirm_button"
            >
              {shareReportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Share Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Shared Report Dialog */}
      <Dialog open={viewReportOpen} onOpenChange={setViewReportOpen}>
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-y-auto"
          data-ocid="shared-reports.view.dialog"
        >
          <DialogHeader>
            <DialogTitle>{viewReportData?.title}</DialogTitle>
            <DialogDescription>Shared expense report details</DialogDescription>
          </DialogHeader>
          {viewReportData && (
            <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
              {(() => {
                try {
                  return JSON.stringify(
                    JSON.parse(viewReportData.data),
                    null,
                    2,
                  );
                } catch {
                  return viewReportData.data;
                }
              })()}
            </pre>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewReportOpen(false)}
              data-ocid="shared-reports.view.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
