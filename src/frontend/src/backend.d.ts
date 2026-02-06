import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface DataHistoryEntry {
    dtSensitivityScore: bigint;
    determinant: string;
    maintenanceAction: string;
    mpvShortList: string;
    trueCheck: boolean;
    filterLabels: Array<string>;
    scoreSummary: string;
    indicatorsUsed: string;
    itemReviewed: string;
    varControlStatus: string;
    manipulatedVariables: string;
    varDefSummary: string;
    diagnosticTestResult: string;
    filterCount: bigint;
}
export interface backendInterface {
    addHistoryEntry(determinant: string, diagnosticTestResult: string, dtSensitivityScore: bigint, filterCount: bigint, filterLabelsOpt: Array<string> | null, indicatorsUsed: string, itemReviewed: string, maintenanceAction: string, manipulatedVariables: string, mpvShortList: string, scoreSummary: string, trueCheck: boolean, varControlStatus: string, varDefSummary: string): Promise<[bigint, DataHistoryEntry]>;
    clearHistory(): Promise<void>;
    clearWithFilterCount(filterCount: bigint): Promise<void>;
    clearWithFilterLabel(filterLabel: string): Promise<void>;
    convertAndAddHistoryEntry(determinant: string, diagnosticTestResult: string, dtSensitivityScore: bigint, filterCount: bigint, filterLabelsArray: Array<string>, indicatorsUsed: string, itemReviewed: string, maintenanceAction: string, manipulatedVariables: string, mpvShortList: string, scoreSummary: string, trueCheck: boolean, varControlStatus: string, varDefSummary: string): Promise<[bigint, DataHistoryEntry]>;
    count(): Promise<bigint>;
    existsWithFilterCount(filterCount: bigint): Promise<boolean>;
    findByFilterLabel(filterLabel: string): Promise<Array<[bigint, DataHistoryEntry]>>;
    getEntry(id: bigint): Promise<DataHistoryEntry | null>;
    listEntries(): Promise<Array<[bigint, DataHistoryEntry]>>;
}
