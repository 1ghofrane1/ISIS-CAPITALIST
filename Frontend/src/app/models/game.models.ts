import type { GetWorldQuery, RatioType } from '../graphql/operations';

export type World = NonNullable<GetWorldQuery['getWorld']>;
export type Product = World['products'][number];
export type Palier = World['managers'][number];
export type { RatioType };

export type PurchaseMode = 1 | 10 | 100 | 'max';
export type ModalName = 'managers' | 'unlocks' | 'cash' | 'investors' | 'angels';
export type SnackKind = 'success' | 'error' | 'info';

export interface SnackMessage {
  id: number;
  text: string;
  kind: SnackKind;
}

export interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}
