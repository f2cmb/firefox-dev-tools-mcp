import type { Page } from 'playwright';
import { z } from 'zod';
import type { FirefoxBrowser } from '../browser.js';

export const takeSnapshotSchema = z.object({
  url: z.string().url().optional().describe('URL to navigate to before taking snapshot'),
  verbose: z.boolean().optional().describe('Include detailed accessibility information'),
});

export type TakeSnapshotArgs = z.infer<typeof takeSnapshotSchema>;

interface AccessibilityNode {
  role?: string;
  name?: string;
  value?: string | number;
  description?: string;
  keyshortcuts?: string;
  roledescription?: string;
  valuetext?: string;
  disabled?: boolean;
  expanded?: boolean;
  focused?: boolean;
  modal?: boolean;
  multiline?: boolean;
  multiselectable?: boolean;
  readonly?: boolean;
  required?: boolean;
  selected?: boolean;
  checked?: boolean | 'mixed';
  pressed?: boolean | 'mixed';
  level?: number;
  valuemin?: number;
  valuemax?: number;
  autocomplete?: string;
  haspopup?: string;
  invalid?: string;
  orientation?: string;
  children?: AccessibilityNode[];
  uid?: string;
}

interface UIDCounter {
  value: number;
}

/**
 * Recursively assign unique IDs to interactive elements
 */
function assignUIDs(node: AccessibilityNode, verbose: boolean, counter: UIDCounter): void {
  // Assign UID to interactive/important elements
  const interactiveRoles = [
    'button', 'link', 'textbox', 'searchbox', 'checkbox', 'radio',
    'combobox', 'listbox', 'option', 'menuitem', 'tab', 'switch',
    'slider', 'spinbutton'
  ];

  if (node.role && (interactiveRoles.includes(node.role) || verbose)) {
    node.uid = `uid_${++counter.value}`;
  }

  // Remove verbose properties if not needed
  if (!verbose) {
    delete node.description;
    delete node.keyshortcuts;
    delete node.roledescription;
    delete node.valuetext;
    delete node.autocomplete;
    delete node.haspopup;
    delete node.invalid;
    delete node.orientation;
  }

  // Recursively process children
  if (node.children) {
    node.children.forEach((child) => assignUIDs(child, verbose, counter));
  }
}

/**
 * Format snapshot as readable text
 */
function formatSnapshot(node: AccessibilityNode, depth: number = 0): string {
  const indent = '  '.repeat(depth);
  let result = '';

  // Build node description
  const parts: string[] = [];

  if (node.uid) parts.push(`[${node.uid}]`);
  if (node.role) parts.push(node.role);
  if (node.name) parts.push(`"${node.name}"`);
  if (node.value) parts.push(`value="${node.value}"`);

  // Add states
  const states: string[] = [];
  if (node.disabled) states.push('disabled');
  if (node.checked === true) states.push('checked');
  if (node.checked === 'mixed') states.push('mixed');
  if (node.expanded === true) states.push('expanded');
  if (node.expanded === false) states.push('collapsed');
  if (node.selected) states.push('selected');
  if (node.focused) states.push('focused');
  if (node.required) states.push('required');
  if (node.readonly) states.push('readonly');

  if (states.length > 0) {
    parts.push(`(${states.join(', ')})`);
  }

  if (parts.length > 0) {
    result += `${indent}${parts.join(' ')}\n`;
  }

  // Process children
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      result += formatSnapshot(child, depth + 1);
    });
  }

  return result;
}

/**
 * Take accessibility tree snapshot of the current page
 */
export async function takeSnapshot(
  page: Page,
  browser: FirefoxBrowser,
  args: TakeSnapshotArgs
): Promise<string> {
  // Navigate to URL if provided
  if (args.url) {
    await browser.goto(args.url);
  }

  // Create UID counter
  const uidCounter: UIDCounter = { value: 0 };

  // Get accessibility snapshot
  console.error('Taking accessibility snapshot...');
  const snapshot = await page.accessibility.snapshot();

  if (!snapshot) {
    return 'No accessibility tree available for this page.';
  }

  // Assign UIDs to interactive elements
  assignUIDs(snapshot, args.verbose || false, uidCounter);

  // Format as text
  const formattedText = formatSnapshot(snapshot);

  const summary = `Accessibility Snapshot (${uidCounter.value} interactive elements)\n`;
  const separator = '='.repeat(60) + '\n';

  return summary + separator + formattedText;
}

export const takeSnapshotTool = {
  name: 'take_snapshot',
  description: 'Take a text-based snapshot of the page using the accessibility tree. ' +
    'This provides a semantic representation of the page structure with unique IDs for interactive elements. ' +
    'Essential for understanding page state and enabling precise element interaction.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to navigate to before taking snapshot (optional)',
      },
      verbose: {
        type: 'boolean',
        description: 'Include detailed accessibility information (default: false)',
      },
    },
  } as const,
  handler: takeSnapshot,
};
