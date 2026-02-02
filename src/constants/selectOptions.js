// Common select options for reuse across the application

export const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "pending", label: "Pending" },
];

export const MAP_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "busy", label: "Busy" },
  { value: "idle", label: "Idle" },
];

export const LOST_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "Lost", label: "Lost" },
  { value: "Searching", label: "Searching" },
  { value: "Found", label: "Found" },
];

export const TICKET_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "closed", label: "Closed" },
  { value: "open", label: "Open" },
];

export const PLAN_OPTIONS = [
  { value: "all", label: "All Plans" },
  { value: "basic", label: "Basic Plan" },
  { value: "premium", label: "Premium Plan" },
  { value: "enterprise", label: "Enterprise Plan" },
  { value: "custom", label: "Custom Plan" },
];

export const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const SORT_OPTIONS = [
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
  { value: "date_asc", label: "Date (Oldest)" },
  { value: "date_desc", label: "Date (Newest)" },
  { value: "status", label: "Status" },
];

export const PAGE_SIZE_OPTIONS = [
  { value: 10, label: "10 / page" },
  { value: 25, label: "25 / page" },
  { value: 50, label: "50 / page" },
  { value: 100, label: "100 / page" },
];

export const COMPANY_OPTIONS = [
  { value: 'all', label: 'All Sub Company' },
  { value: 'company_a', label: 'Company A' },
  { value: 'company_b', label: 'Company B' },
  { value: 'company_c', label: 'Company C' },
  { value: 'company_d', label: 'Company D' },
  { value: 'company_e', label: 'Company E' },
];
