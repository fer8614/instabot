import type { AccountContext } from '../types/account.types.js';

let currentAccount: AccountContext | null = null;

export function setCurrentAccount(account: AccountContext | null): void {
  currentAccount = account;
}

export function getCurrentAccount(): AccountContext | null {
  return currentAccount;
}
