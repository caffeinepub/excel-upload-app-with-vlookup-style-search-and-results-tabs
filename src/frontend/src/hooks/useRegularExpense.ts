import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Budget, ExpenseEntry } from '../backend';

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
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budget: { monthlyLimit: number; savingsGoal: number; lastUpdated: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveBudget(
        BigInt(budget.monthlyLimit),
        BigInt(budget.savingsGoal),
        budget.lastUpdated
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
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
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: { date: string; type: string; amount: number; description: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.addExpense(
        expense.date,
        expense.type,
        BigInt(expense.amount),
        expense.description
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error) => {
      console.error('Failed to add expense:', error);
    },
  });
}
