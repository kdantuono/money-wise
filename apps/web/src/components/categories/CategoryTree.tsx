'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, Lock, Pencil, Folder, Info } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Category } from '@/services/categories.client';

// =============================================================================
// Type Definitions
// =============================================================================

export interface CategoryTreeProps {
  /** List of all categories */
  categories: Category[];
  /** Currently selected category ID */
  selectedId?: string;
  /** Callback when a category is selected */
  onSelect?: (category: Category) => void;
  /** Callback when edit button is clicked */
  onEdit?: (category: Category) => void;
  /** Show transaction count badge */
  showTransactionCount?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Loading state */
  isLoading?: boolean;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
  level: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Render icon by name
 */
function renderIcon(iconName: string | null, className?: string, style?: React.CSSProperties): React.ReactNode {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  const IconComponent = iconName ? (icons[iconName] || Folder) : Folder;
  return <IconComponent className={className} style={style} />;
}

/**
 * Build tree structure from flat category list
 */
function buildTree(categories: Category[]): CategoryNode[] {
  const categoryMap = new Map<string, CategoryNode>();
  const rootNodes: CategoryNode[] = [];

  // First pass: create nodes
  categories.forEach((cat) => {
    categoryMap.set(cat.id, {
      ...cat,
      children: [],
      level: 0,
    });
  });

  // Second pass: build hierarchy
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.id);
    if (!node) return;

    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        // Parent not found, treat as root
        rootNodes.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });

  // Sort by sortOrder, then by name
  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(rootNodes);
  return rootNodes;
}

// =============================================================================
// TreeNode Component
// =============================================================================

interface TreeNodeProps {
  node: CategoryNode;
  selectedId?: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect?: (category: Category) => void;
  onEdit?: (category: Category) => void;
  showTransactionCount?: boolean;
}

function TreeNode({
  node,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  onEdit,
  showTransactionCount,
}: TreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;

  // Handle expand/collapse toggle (chevron click)
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(node.id);
    }
  };

  // Handle navigation to detail page (info button or name click)
  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(node);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(node);
  };

  return (
    <div>
      {/* Node row */}
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        className={`
          group flex items-center gap-2 px-3 py-2 rounded-lg
          transition-colors duration-150
          ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
        `}
        style={{ paddingLeft: `${12 + node.level * 16}px` }}
      >
        {/* Expand/Collapse chevron - clickable */}
        <button
          type="button"
          onClick={handleToggleExpand}
          disabled={!hasChildren}
          className={`w-5 h-5 flex items-center justify-center flex-shrink-0 rounded
            ${hasChildren ? 'hover:bg-gray-200 cursor-pointer' : 'cursor-default'}
            focus:outline-none focus:ring-2 focus:ring-blue-500`}
          aria-label={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : undefined}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )
          ) : null}
        </button>

        {/* Icon with color background */}
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: node.color ? `${node.color}20` : '#f3f4f6',
          }}
        >
          {renderIcon(node.icon, 'h-4 w-4', { color: node.color || '#6b7280' })}
        </span>

        {/* Name and color dot - clickable for navigation */}
        <button
          type="button"
          onClick={handleNavigate}
          className="flex-grow flex items-center gap-2 min-w-0 text-left hover:text-blue-600 transition-colors"
        >
          <span className="truncate font-medium text-gray-900 group-hover:text-blue-600">{node.name}</span>
          {node.color && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: node.color }}
            />
          )}
        </button>

        {/* Transaction count badge (optional) */}
        {showTransactionCount && (
          <span className="px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
            0
          </span>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Info/Details button */}
          <button
            type="button"
            onClick={handleNavigate}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-blue-100
              transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`View details of ${node.name}`}
          >
            <Info className="h-3.5 w-3.5 text-blue-500" />
          </button>

          {/* System lock icon or Edit button */}
          {node.isSystem ? (
            <Lock
              className="h-4 w-4 text-gray-400"
              aria-label="System category (cannot be modified)"
            />
          ) : (
            <button
              type="button"
              onClick={handleEdit}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-gray-200
                transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Edit ${node.name}`}
            >
              <Pencil className="h-3.5 w-3.5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div role="group" aria-label={`${node.name} subcategories`}>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onEdit={onEdit}
              showTransactionCount={showTransactionCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CategoryTree Component
// =============================================================================

export function CategoryTree({
  categories,
  selectedId,
  onSelect,
  onEdit,
  showTransactionCount = false,
  className = '',
  isLoading = false,
}: CategoryTreeProps) {
  // Track expanded node IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build tree structure
  const tree = useMemo(() => buildTree(categories), [categories]);

  // Toggle expand/collapse
  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2 animate-pulse"
          >
            <div className="w-5 h-5 bg-gray-200 rounded" />
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            <div className="flex-1 h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (tree.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Folder className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No categories found</p>
        <p className="text-gray-400 text-sm mt-1">
          Create your first custom category to get started
        </p>
      </div>
    );
  }

  return (
    <div
      role="tree"
      aria-label="Category tree"
      data-testid="category-tree"
      className={`space-y-1 ${className}`}
    >
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onToggle={handleToggle}
          onSelect={onSelect}
          onEdit={onEdit}
          showTransactionCount={showTransactionCount}
        />
      ))}
    </div>
  );
}

export default CategoryTree;
