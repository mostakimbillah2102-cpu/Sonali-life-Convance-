export interface BranchData {
  branch: string;
  name: string;
  mobile: string;
  ext: string;
  email: string;
}

export interface BranchDatabase {
  [code: string]: BranchData;
}

export interface BillItem extends BranchData {
  code: string; // The branch code
  serial: string; // User input for serial number
  amount: string; // User input for amount
}

export interface ToastData {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface AppState {
  searchedToday: number;
  lastSearchTime: string | null;
  savedLists: SavedList[];
}

export interface SavedList {
  name: string;
  date: string;
  items: BillItem[];
  note: string;
}

export type TabType = 'search' | 'list' | 'settings';