import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useGetCustomers() {
  const { actor, isFetching } = useActor();

  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCustomers();
    },
    enabled: !!actor && !isFetching,
  });
}

export interface CustomerInput {
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  company: string;
  workDetails: string;
}

export function useAddCustomer() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      if (!actor || !identity) throw new Error("Not authenticated");
      if (!input.name.trim()) throw new Error("Customer name cannot be empty");
      return actor.addCustomer(
        input.name.trim(),
        input.email.trim(),
        input.phoneNumber.trim(),
        input.address.trim(),
        input.company.trim(),
        input.workDetails.trim(),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CustomerInput & { id: bigint }) => {
      if (!actor || !identity) throw new Error("Not authenticated");
      if (!input.name.trim()) throw new Error("Customer name cannot be empty");
      return actor.updateCustomer(
        input.id,
        input.name.trim(),
        input.email.trim(),
        input.phoneNumber.trim(),
        input.address.trim(),
        input.company.trim(),
        input.workDetails.trim(),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useDeleteCustomer() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !identity) throw new Error("Not authenticated");
      return actor.deleteCustomer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export interface ImportResult {
  successCount: number;
  duplicateCount: number;
  errors: string[];
}

export function useImportCustomers() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customers,
      existingCustomers,
    }: {
      customers: CustomerInput[];
      existingCustomers: Customer[];
    }): Promise<ImportResult> => {
      if (!actor || !identity) throw new Error("Not authenticated");

      let successCount = 0;
      let duplicateCount = 0;
      const errors: string[] = [];

      for (const c of customers) {
        // Duplicate detection by phone or email
        const isDuplicate = existingCustomers.some(
          (existing) =>
            (c.phoneNumber.trim() !== "" &&
              existing.phoneNumber === c.phoneNumber.trim()) ||
            (c.email.trim() !== "" && existing.email === c.email.trim()),
        );

        if (isDuplicate) {
          duplicateCount++;
          continue;
        }

        try {
          await actor.addCustomer(
            c.name.trim(),
            c.email.trim(),
            c.phoneNumber.trim(),
            c.address.trim(),
            c.company.trim(),
            c.workDetails.trim(),
          );
          successCount++;
        } catch {
          errors.push(c.name || "Unknown");
        }
      }

      return { successCount, duplicateCount, errors };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
