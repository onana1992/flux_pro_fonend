import type { OrganisationTreeNode } from "@/lib/types";

export function flattenOrgTree(nodes: OrganisationTreeNode[]): OrganisationTreeNode[] {
  const result: OrganisationTreeNode[] = [];
  function walk(list: OrganisationTreeNode[]) {
    for (const node of list) {
      result.push(node);
      if (node.children.length > 0) walk(node.children);
    }
  }
  walk(nodes);
  return result.sort((a, b) => a.code.localeCompare(b.code));
}

/** DFS order with depth — preserves hierarchy (no alphabetical re-sort). */
export function flattenOrgTreeHierarchical(
  nodes: OrganisationTreeNode[],
  options?: { activeOnly?: boolean },
): { node: OrganisationTreeNode; depth: number }[] {
  const result: { node: OrganisationTreeNode; depth: number }[] = [];
  const activeOnly = options?.activeOnly ?? false;

  function walk(list: OrganisationTreeNode[], depth: number) {
    for (const node of list) {
      if (!activeOnly || node.active) {
        result.push({ node, depth });
      }
      if (node.children?.length) {
        walk(node.children, depth + 1);
      }
    }
  }

  walk(nodes, 0);
  return result;
}

export function findOrgNode(nodes: OrganisationTreeNode[], id: string): OrganisationTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findOrgNode(node.children, id);
    if (found) return found;
  }
  return null;
}

export function collectDescendantIds(nodes: OrganisationTreeNode[], rootId: string): Set<string> {
  const root = findOrgNode(nodes, rootId);
  const ids = new Set<string>();
  if (!root) return ids;
  function walk(node: OrganisationTreeNode) {
    ids.add(node.id);
    node.children.forEach(walk);
  }
  walk(root);
  return ids;
}

export function countOrgNodes(nodes: OrganisationTreeNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countOrgNodes(node.children), 0);
}

export function parentCodeOf(nodes: OrganisationTreeNode[], nodeId: string): string | null {
  for (const node of flattenOrgTree(nodes)) {
    for (const child of node.children) {
      if (child.id === nodeId) return node.code;
    }
  }
  return null;
}
