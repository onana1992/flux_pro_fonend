"use client";

import { memo, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge, Box, Flex, Text } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { orgTypeColorHex } from "@/lib/org-type-colors";
import { countOrgNodes } from "@/lib/org-tree";
import type { OrganisationTreeNode, OrganizationType } from "@/lib/types";

const BADGE_COLORS = new Set(["purple", "blue", "gray", "green", "orange", "red", "yellow"]);

function badgeColor(type: OrganizationType): "purple" | "blue" | "gray" | "green" | "orange" {
  const c = type.color?.toLowerCase();
  if (c && BADGE_COLORS.has(c)) return c as "purple" | "blue" | "gray" | "green" | "orange";
  const fallback: Record<string, "purple" | "blue" | "gray" | "green" | "orange"> = {
    MINISTRY: "purple",
    DIRECTORATE: "blue",
    DIVISION: "gray",
    SERVICE: "green",
    REGIONAL_DIRECTORATE: "orange",
  };
  return fallback[type.code] ?? "gray";
}

type OrgNodeData = {
  label: string;
  code: string;
  type: OrganizationType;
  active: boolean;
};

type OrgFlowNode = Node<OrgNodeData, "org">;

const NODE_WIDTH = 260;
const NODE_HEIGHT = 96;
const LEVEL_GAP = 100;
const SIBLING_GAP = 32;

const OrgNode = memo(function OrgNode({ data }: NodeProps<OrgFlowNode>) {
  const { t } = useTranslation();
  const accent = orgTypeColorHex(data.type.color);

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 8, height: 8 }} />
      <Box
        style={{
          width: NODE_WIDTH,
          minHeight: NODE_HEIGHT,
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid var(--gray-a6)",
          borderLeft: `4px solid ${accent}`,
          background: data.active ? "var(--color-panel-solid)" : "var(--gray-a2)",
          boxShadow: "var(--shadow-3)",
          cursor: "pointer",
          opacity: data.active ? 1 : 0.82,
        }}
      >
        <Flex direction="column" gap="2">
          <Flex align="center" gap="2" wrap="wrap">
            <Badge color={badgeColor(data.type)} variant="soft" size="1">
              {t(`orgTypes.${data.type.code}`, { defaultValue: data.type.name })}
            </Badge>
            {!data.active && (
              <Badge color="red" variant="soft" size="1">
                {t("common.inactiveOrg")}
              </Badge>
            )}
          </Flex>
          <Text size="1" color="gray" style={{ fontFamily: "var(--font-geist-mono)" }}>
            {data.code}
          </Text>
          <Text size="3" weight="medium" style={{ lineHeight: 1.35 }}>
            {data.label}
          </Text>
        </Flex>
      </Box>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 8, height: 8 }} />
    </>
  );
});

const nodeTypes = { org: OrgNode };

const edgeDefaults = {
  type: "smoothstep" as const,
  style: { stroke: "var(--gray-9)", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "var(--gray-9)" },
};

function addEdge(flowEdges: Edge[], parentId: string, childId: string) {
  flowEdges.push({
    id: `${parentId}-${childId}`,
    source: parentId,
    target: childId,
    ...edgeDefaults,
  });
}

function layoutVerticalTree(nodes: OrganisationTreeNode[]): {
  flowNodes: OrgFlowNode[];
  flowEdges: Edge[];
} {
  const flowNodes: OrgFlowNode[] = [];
  const flowEdges: Edge[] = [];

  function layoutNode(
    node: OrganisationTreeNode,
    depth: number,
    startX: number,
    parentId?: string,
  ): { width: number; centerX: number } {
    const y = depth * (NODE_HEIGHT + LEVEL_GAP);

    if (node.children.length === 0) {
      flowNodes.push({
        id: node.id,
        type: "org",
        data: {
          label: node.name,
          code: node.code,
          type: node.type,
          active: node.active,
        },
        position: { x: startX, y },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
      if (parentId) addEdge(flowEdges, parentId, node.id);
      return { width: NODE_WIDTH, centerX: startX + NODE_WIDTH / 2 };
    }

    let cursorX = startX;
    const childResults = node.children.map((child) => {
      const result = layoutNode(child, depth + 1, cursorX, node.id);
      cursorX += result.width + SIBLING_GAP;
      return result;
    });

    const totalChildrenWidth = cursorX - startX - SIBLING_GAP;
    const firstCenter = childResults[0].centerX;
    const lastCenter = childResults[childResults.length - 1].centerX;
    const centerX = (firstCenter + lastCenter) / 2;
    const parentX = centerX - NODE_WIDTH / 2;

    flowNodes.push({
      id: node.id,
      type: "org",
      data: {
        label: node.name,
        code: node.code,
        type: node.type,
        active: node.active,
      },
      position: { x: parentX, y },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
    if (parentId) addEdge(flowEdges, parentId, node.id);

    return {
      width: Math.max(NODE_WIDTH, totalChildrenWidth),
      centerX,
    };
  }

  let rootOffset = 0;
  nodes.forEach((root, index) => {
    const result = layoutNode(root, 0, rootOffset);
    rootOffset += result.width + (index < nodes.length - 1 ? SIBLING_GAP * 4 : 0);
  });

  return { flowNodes, flowEdges };
}

function OrganisationGraphInner({
  nodes,
  onNodeClick,
}: {
  nodes: OrganisationTreeNode[];
  onNodeClick?: (nodeId: string) => void;
}) {
  const { t } = useTranslation();
  const { flowNodes, flowEdges } = useMemo(() => layoutVerticalTree(nodes), [nodes]);

  if (nodes.length === 0) return null;

  return (
    <Box>
      <Text size="2" color="gray" mb="3">
        <Text weight="bold" color="gray" highContrast>
          {t("common.units", { count: countOrgNodes(nodes) })}
        </Text>{" "}
        — {t("admin.org.graphHint")}
      </Text>
      <Box
        className="org-graph-canvas"
        style={{
          height: "calc(100vh - 15rem)",
          minHeight: 560,
          borderRadius: 10,
          border: "1px solid var(--gray-a6)",
          background: "var(--gray-2)",
        }}
      >
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2, minZoom: 0.4, maxZoom: 1 }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
          minZoom={0.25}
          maxZoom={1.25}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={Boolean(onNodeClick)}
          onNodeClick={
            onNodeClick
              ? (_event, node) => {
                  onNodeClick(node.id);
                }
              : undefined
          }
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="var(--gray-6)" />
          <Controls showInteractive={false} position="bottom-right" />
          <MiniMap
            nodeColor={(node) => {
              const type = (node.data as OrgNodeData | undefined)?.type;
              return type ? orgTypeColorHex(type.color) : "#94a3b8";
            }}
            maskColor="rgba(0, 0, 0, 0.08)"
            position="bottom-left"
          />
        </ReactFlow>
      </Box>
    </Box>
  );
}

export function OrganisationGraph({
  nodes,
  onNodeClick,
}: {
  nodes: OrganisationTreeNode[];
  onNodeClick?: (nodeId: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <OrganisationGraphInner nodes={nodes} onNodeClick={onNodeClick} />
    </ReactFlowProvider>
  );
}
