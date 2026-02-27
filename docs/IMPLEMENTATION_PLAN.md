# Implementation Plan - Dashboard Filters

## Step 1: Foundation (Types & Utils)
- Create \rontend/src/types/filters.ts\ to define \DatePreset\, \DateRange\, and \DashboardFilters\.
- Create \rontend/src/utils/dateRange.ts\ for date logic using \date-fns\ (already in package.json).

## Step 2: Global State Management
- Create \rontend/src/state/dashboardFilterStore.tsx\ using React Context.
- Implement persistence using \localStorage\.
- Provide a \useDashboardFilters\ hook.

## Step 3: UI Integration (Dropdown)
- Create a \DateRangePicker\ component (or update existing dropdown if any).
- Integrate the picker into the Dashboard header.

## Step 4: Data Layer Integration
- Update \dataApi.fetchDashboardKPIs\ in \rontend/src/data/api.ts\ to accept \DashboardFilters\.
- Update Dashboard page to pass the current filters from the store to the API calls.
- Ensure charts and KPI cards react to filter changes.

## Step 5: Validation
- Verify that switching presets updates all metrics.
- Verify that 'Custom' range works as expected.
- Ensure no regressions on other pages.

## Files to Edit/Create
- \rontend/src/types/filters.ts\ (New)
- \rontend/src/utils/dateRange.ts\ (New)
- \rontend/src/state/dashboardFilterStore.tsx\ (New)
- \rontend/src/data/api.ts\ (Edit)
- \rontend/src/pages/dashboard.tsx\ (Edit)
