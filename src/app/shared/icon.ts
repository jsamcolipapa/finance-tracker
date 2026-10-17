import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  Archive,
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleQuestionMark,
  Coins,
  CreditCard,
  Download,
  FileBraces,
  Info,
  Landmark,
  LayoutDashboard,
  List,
  LockKeyhole,
  Pencil,
  PiggyBank,
  Plus,
  Settings2,
  ShieldCheck,
  Trash,
  TriangleAlert,
  Upload,
  Wallet,
  WalletCards,
  WifiOff,
  Car,
  Clapperboard,
  Coffee,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingBasket,
  type IconNode,
} from 'lucide';
import { AccountType, TxnKind } from '../data/models';

const ICONS = {
  archive: Archive,
  'arrow-down-left': ArrowDownLeft,
  'arrow-right': ArrowRight,
  'arrow-right-left': ArrowRightLeft,
  'arrow-up-right': ArrowUpRight,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-help': CircleQuestionMark,
  coins: Coins,
  'credit-card': CreditCard,
  download: Download,
  'file-json': FileBraces,
  info: Info,
  landmark: Landmark,
  'layout-dashboard': LayoutDashboard,
  list: List,
  'lock-keyhole': LockKeyhole,
  pencil: Pencil,
  'piggy-bank': PiggyBank,
  plus: Plus,
  'settings-2': Settings2,
  'shield-check': ShieldCheck,
  trash: Trash,
  'triangle-alert': TriangleAlert,
  upload: Upload,
  wallet: Wallet,
  'wallet-cards': WalletCards,
  'wifi-off': WifiOff,
  car: Car,
  clapperboard: Clapperboard,
  coffee: Coffee,
  gift: Gift,
  'graduation-cap': GraduationCap,
  'heart-pulse': HeartPulse,
  house: House,
  plane: Plane,
  receipt: Receipt,
  'shopping-bag': ShoppingBag,
  'shopping-basket': ShoppingBasket,
} satisfies Record<string, IconNode>;

export type IconName = keyof typeof ICONS;

export const ACCOUNT_ICONS: Record<AccountType, IconName> = {
  checking: 'landmark',
  savings: 'piggy-bank',
  cash: 'wallet',
  credit: 'credit-card',
  other: 'coins',
};

export const TXN_ICONS: Record<TxnKind, IconName> = {
  income: 'arrow-down-left',
  expense: 'arrow-up-right',
  transfer: 'arrow-right-left',
};

/** Renders a Lucide icon from its bundled node data (works offline, tree-shaken). */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 24 24"
      [attr.width]="size()"
      [attr.height]="size()"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @for (node of nodes(); track $index) {
        @let a = node[1];
        @switch (node[0]) {
          @case ('path') {
            <path [attr.d]="a['d']" />
          }
          @case ('circle') {
            <circle [attr.cx]="a['cx']" [attr.cy]="a['cy']" [attr.r]="a['r']" />
          }
          @case ('rect') {
            <rect
              [attr.x]="a['x']"
              [attr.y]="a['y']"
              [attr.width]="a['width']"
              [attr.height]="a['height']"
              [attr.rx]="a['rx']"
              [attr.ry]="a['ry']"
            />
          }
          @case ('line') {
            <line [attr.x1]="a['x1']" [attr.y1]="a['y1']" [attr.x2]="a['x2']" [attr.y2]="a['y2']" />
          }
          @case ('polyline') {
            <polyline [attr.points]="a['points']" />
          }
          @case ('polygon') {
            <polygon [attr.points]="a['points']" />
          }
          @case ('ellipse') {
            <ellipse
              [attr.cx]="a['cx']"
              [attr.cy]="a['cy']"
              [attr.rx]="a['rx']"
              [attr.ry]="a['ry']"
            />
          }
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(18);
  protected readonly nodes = computed(() => ICONS[this.name()]);
}
