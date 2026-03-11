import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Budget, ExpenseEntry, SharedReport } from "../backend";
import { HistoryType } from "../backend";
import { parseNatBigInt } from "../utils/number/parseNatBigInt";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";
import { useAddHistoryEntry } from "./useQueries";

/**
 * Query to fetch the current user's budget
 */
export function useGetBudget() {
  const { actor, isFetching } = useActor();

  return useQuery<Budget | null>({
    queryKey: ["budget"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getBudget();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

/**
 * Mutation to save/update the current user's budget
 */
export function useSaveBudget() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const addHistory = useAddHistoryEntry();

  return useMutation({
    mutationFn: async (budget: {
      monthlyLimit: string;
      dayLimit: string;
      savingsGoal: string;
      lastUpdated: string;
    }) => {
      if (!identity) throw new Error("Please log in to save budget settings");
      if (!actor)
        throw new Error(
          "Backend connection not ready. Please wait a moment and try again.",
        );
      if (isFetching)
        throw new Error(
          "Backend is initializing. Please wait a moment and try again.",
        );

      const monthlyLimitResult = parseNatBigInt(budget.monthlyLimit);
      if (!monthlyLimitResult.success)
        throw new Error(`Monthly limit: ${monthlyLimitResult.error}`);

      const dayLimitResult = parseNatBigInt(budget.dayLimit);
      if (!dayLimitResult.success)
        throw new Error(`Daily limit: ${dayLimitResult.error}`);

      const savingsGoalResult = parseNatBigInt(budget.savingsGoal);
      if (!savingsGoalResult.success)
        throw new Error(`Savings goal: ${savingsGoalResult.error}`);

      const budgetObj: Budget = {
        monthlyLimit: monthlyLimitResult.value,
        dayLimit: dayLimitResult.value,
        savingsGoal: savingsGoalResult.value,
        lastUpdated: budget.lastUpdated,
      };

      await actor.saveBudget(budgetObj);

      return {
        monthlyLimit: Number(monthlyLimitResult.value),
        dayLimit: Number(dayLimitResult.value),
        savingsGoal: Number(savingsGoalResult.value),
        lastUpdated: budget.lastUpdated,
      };
    },
    onSuccess: (b) => {
      queryClient.invalidateQueries({ queryKey: ["budget"] });
      addHistory.mutate({
        entryType: HistoryType.budgetChange,
        details: `Budget updated: Monthly limit $${b.monthlyLimit}, Savings goal $${b.savingsGoal}`,
      });
    },
    onError: (error) => {
      console.error("Failed to save budget:", error);
    },
  });
}

/**
 * Query to fetch the current user's expenses
 */
export function useGetExpenses() {
  const { actor, isFetching } = useActor();

  return useQuery<ExpenseEntry[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getExpenses();
    },
    enabled: !!actor && !isFetching,
    retry: 1,
  });
}

/**
 * Mutation to add a new expense entry
 */
export function useAddExpense() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const addHistory = useAddHistoryEntry();

  return useMutation({
    mutationFn: async (expense: {
      date: string;
      category: string;
      amount: string;
      description: string;
    }) => {
      if (!identity) throw new Error("Please log in to add expenses");
      if (!actor)
        throw new Error(
          "Backend connection not ready. Please wait a moment and try again.",
        );
      if (isFetching)
        throw new Error(
          "Backend is initializing. Please wait a moment and try again.",
        );

      const amountResult = parseNatBigInt(expense.amount);
      if (!amountResult.success)
        throw new Error(`Amount: ${amountResult.error}`);

      const id = await actor.addExpense(
        amountResult.value,
        expense.category,
        expense.description,
        expense.date,
      );

      return {
        id,
        amount: Number(amountResult.value),
        category: expense.category,
        description: expense.description,
        date: expense.date,
      };
    },
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      addHistory.mutate({
        entryType: HistoryType.expenseChange,
        details: `Expense added: ${expense.category} - $${expense.amount} (${expense.description || "No description"})`,
      });
    },
    onError: (error) => {
      console.error("Failed to add expense:", error);
    },
  });
}

/**
 * Mutation to edit an existing expense
 * Backend has no editExpense; we delete and re-add as a workaround.
 */
export function useEditExpense() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const addHistory = useAddHistoryEntry();

  return useMutation({
    mutationFn: async (expense: {
      id: bigint;
      date: string;
      category: string;
      amount: string;
      description: string;
    }) => {
      if (!identity) throw new Error("Please log in to edit expenses");
      if (!actor)
        throw new Error(
          "Backend connection not ready. Please wait a moment and try again.",
        );
      if (isFetching)
        throw new Error(
          "Backend is initializing. Please wait a moment and try again.",
        );

      const amountResult = parseNatBigInt(expense.amount);
      if (!amountResult.success)
        throw new Error(`Amount: ${amountResult.error}`);

      // Delete old entry then add new one (backend has no editExpense)
      await actor.deleteExpense(expense.id);
      const newId = await actor.addExpense(
        amountResult.value,
        expense.category,
        expense.description,
        expense.date,
      );

      return {
        id: newId,
        amount: Number(amountResult.value),
        category: expense.category,
        description: expense.description,
        date: expense.date,
      };
    },
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      addHistory.mutate({
        entryType: HistoryType.expenseChange,
        details: `Expense edited: ${expense.category} - $${expense.amount} (${expense.description || "No description"})`,
      });
    },
    onError: (error) => {
      console.error("Failed to edit expense:", error);
    },
  });
}

/**
 * Mutation to delete an expense
 */
export function useDeleteExpense() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const addHistory = useAddHistoryEntry();

  return useMutation({
    mutationFn: async ({ id, details }: { id: bigint; details: string }) => {
      if (!identity) throw new Error("Please log in to delete expenses");
      if (!actor)
        throw new Error(
          "Backend connection not ready. Please wait a moment and try again.",
        );
      if (isFetching)
        throw new Error(
          "Backend is initializing. Please wait a moment and try again.",
        );
      await actor.deleteExpense(id);
      return { id, details };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      addHistory.mutate({
        entryType: HistoryType.expenseChange,
        details: `Expense deleted: ${data.details}`,
      });
    },
    onError: (error) => {
      console.error("Failed to delete expense:", error);
    },
  });
}

/**
 * Mutation to share an expense report with specific users
 */
export function useShareExpenseReport() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      recipientIds: string[];
      reportTitle: string;
      reportData: string;
    }) => {
      if (!identity) throw new Error("Please log in to share reports");
      if (!actor)
        throw new Error(
          "Backend connection not ready. Please wait a moment and try again.",
        );
      if (isFetching)
        throw new Error(
          "Backend is initializing. Please wait a moment and try again.",
        );
      const { Principal } = await import("@dfinity/principal");
      const principals = params.recipientIds.map((id) =>
        Principal.fromText(id),
      );
      await actor.shareExpenseReport(
        principals,
        params.reportTitle,
        params.reportData,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sharedReports"] });
    },
    onError: (error) => {
      console.error("Failed to share expense report:", error);
    },
  });
}

/**
 * Query to fetch expense reports shared with the current user
 */
export function useGetSharedReports() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<SharedReport[]>({
    queryKey: ["sharedReports"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSharedReports();
    },
    enabled: !!actor && !isFetching && !!identity,
    retry: 1,
    refetchInterval: 30000,
  });
}
