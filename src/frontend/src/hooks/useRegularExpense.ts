import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { useAddHistoryEntry } from './useQueries';
import { parseNatBigInt } from '../utils/number/parseNatBigInt';
import type { Budget, ExpenseEntry } from '../backend';
import { HistoryType } from '../backend';

/**
 * Query to fetch the current user's budget
 */
export function useGetBudget() {
  const { actor, isFetching } = useActor();

  return useQuery<Budget | null>({
    queryKey: ['budget'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
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
    mutationFn: async (budget: { monthlyLimit: string; dayLimit: string; savingsGoal: string; lastUpdated: string }) => {
      // Check authentication
      if (!identity) {
        throw new Error('Please log in to save budget settings');
      }

      // Check actor readiness
      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      // Parse and validate all numeric inputs
      const monthlyLimitResult = parseNatBigInt(budget.monthlyLimit);
      if (!monthlyLimitResult.success) {
        throw new Error(`Monthly limit: ${monthlyLimitResult.error}`);
      }

      const dayLimitResult = parseNatBigInt(budget.dayLimit);
      if (!dayLimitResult.success) {
        throw new Error(`Daily limit: ${dayLimitResult.error}`);
      }

      const savingsGoalResult = parseNatBigInt(budget.savingsGoal);
      if (!savingsGoalResult.success) {
        throw new Error(`Savings goal: ${savingsGoalResult.error}`);
      }

      await actor.saveBudget(
        monthlyLimitResult.value,
        dayLimitResult.value,
        savingsGoalResult.value,
        budget.lastUpdated
      );

      return {
        monthlyLimit: Number(monthlyLimitResult.value),
        dayLimit: Number(dayLimitResult.value),
        savingsGoal: Number(savingsGoalResult.value),
        lastUpdated: budget.lastUpdated,
      };
    },
    onSuccess: (budget) => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      // Add history entry for budget change
      addHistory.mutate({
        entryType: HistoryType.budgetChange,
        details: `Budget updated: Monthly limit $${budget.monthlyLimit}, Savings goal $${budget.savingsGoal}`,
      });
    },
    onError: (error) => {
      console.error('Failed to save budget:', error);
    },
  });
}

/**
 * Query to fetch the current user's expenses
 */
export function useGetExpenses() {
  const { actor, isFetching } = useActor();

  return useQuery<ExpenseEntry[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getExpensesForCaller();
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
    mutationFn: async (expense: { date: string; category: string; amount: string; description: string }) => {
      // Check authentication
      if (!identity) {
        throw new Error('Please log in to add expenses');
      }

      // Check actor readiness
      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      // Parse and validate amount
      const amountResult = parseNatBigInt(expense.amount);
      if (!amountResult.success) {
        throw new Error(`Amount: ${amountResult.error}`);
      }

      const id = await actor.addExpense(
        amountResult.value,
        expense.category,
        expense.description,
        expense.date
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      // Add history entry for expense change
      addHistory.mutate({
        entryType: HistoryType.expenseChange,
        details: `Expense added: ${expense.category} - $${expense.amount} (${expense.description || 'No description'})`,
      });
    },
    onError: (error) => {
      console.error('Failed to add expense:', error);
    },
  });
}

/**
 * Mutation to edit an existing expense
 */
export function useEditExpense() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const addHistory = useAddHistoryEntry();

  return useMutation({
    mutationFn: async (expense: { id: bigint; date: string; category: string; amount: string; description: string }) => {
      // Check authentication
      if (!identity) {
        throw new Error('Please log in to edit expenses');
      }

      // Check actor readiness
      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      // Parse and validate amount
      const amountResult = parseNatBigInt(expense.amount);
      if (!amountResult.success) {
        throw new Error(`Amount: ${amountResult.error}`);
      }

      await actor.editExpense(
        expense.id,
        amountResult.value,
        expense.category,
        expense.description,
        expense.date
      );

      return {
        id: expense.id,
        amount: Number(amountResult.value),
        category: expense.category,
        description: expense.description,
        date: expense.date,
      };
    },
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      // Add history entry for expense change
      addHistory.mutate({
        entryType: HistoryType.expenseChange,
        details: `Expense edited: ${expense.category} - $${expense.amount} (${expense.description || 'No description'})`,
      });
    },
    onError: (error) => {
      console.error('Failed to edit expense:', error);
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
      // Check authentication
      if (!identity) {
        throw new Error('Please log in to delete expenses');
      }

      // Check actor readiness
      if (!actor) {
        throw new Error('Backend connection not ready. Please wait a moment and try again.');
      }

      if (isFetching) {
        throw new Error('Backend is initializing. Please wait a moment and try again.');
      }

      await actor.deleteExpense(id);
      return { id, details };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      // Add history entry for expense deletion
      addHistory.mutate({
        entryType: HistoryType.expenseChange,
        details: `Expense deleted: ${data.details}`,
      });
    },
    onError: (error) => {
      console.error('Failed to delete expense:', error);
    },
  });
}
