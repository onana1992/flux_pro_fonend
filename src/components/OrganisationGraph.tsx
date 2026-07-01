"use client";

import { memo, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
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
import type { OrganisationTreeNode, OrganisationType } from "@/lib/types";

const TYPE_COLOR: Record<OrganisationType, "purple" | "blue" | "gray" | "green" | "orange"> = {
  MINISTERE: "purple",
  DIRECTION: "blue",
  DIVISION: "gray",
  SERVICE: "green",
  DRTP: "orange",
};

const MINIMAP_COLOR: Record<OrganisationType, string> = {
  MINISTERE: "#7c3aed",
  DIRECTION: "#2563eb",
  DIVISION: "#64748b",
  SERVICE: "#16a34a",
  DRTP: "#ea580c",
};

type OrgNodeData = {
  label: string;
  code: string;
  type: OrganisationType;
  actif: boolean;
};

type OrgFlowNode = Node<OrgNodeData, "org">;

const NODE_WIDTH = 220;
const NODE_HEIGHT = 88;
const LEVEL_GAP = 110;
const SIBLING_GAP = 24;

const OrgNode = memo(function OrgNode({ data }: NodeProps<OrgFlowNode>) {
  const { t } = useTranslation();
  return (
    <>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Box
        style={{
          width: NODE_WIDTH,
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid var(--gray-a6)",
          background: "var(--color-panel-solid)",
          boxShadow: "var(--shadow-2)",
        }}
      >
        <Flex direction="column" gap="1">
          <Flex align="center" gap="2" wrap="wrap">
            <Badge color={TYPE_COLOR[data.type]} variant="soft" size="1">
              {t(`orgTypes.${data.type}`)}
            </Badge>
            {!data.actif && (
              <Badge color="red" variant="soft" size="1">
                {t("common.inactiveOrg")}
              </Badge>
            )}
          </Flex>
          <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>
            {data.code}
          </Text>
          <Text size="2" weight="medium" style={{ lineHeight: 1.3 }}>
            {data.label}
          </Text>
        </Flex>
      </Box>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </>
  );
});

const nodeTypes = { org: OrgNode };

function addEdge(flowEdges: Edge[], parentId: string, childId: string) {
  flowEdges.push({
    id: `${parentId}-${childId}`,
    source: parentId,
    target: childId,
    type: "smoothstep",
    style: { stroke: "var(--gray-8)", strokeWidth: 2 },
  });
}

function layoutHorizontalTree(nodes: OrganisationTreeNode[]): {
  flowNodes: OrgFlowNode[];
  flowEdges: Edge[];
} {
  const flowNodes: OrgFlowNode[] = [];
  const flowEdges: Edge[] = [];

  function layoutNode(
    node: OrganisationTreeNode,
    depth: number,
    startY: number,
    parentId?: string,
  ): { height: number; centerY: number } {
    const x = depth * (NODE_WIDTH + LEVEL_GAP);

    if (node.children.length === 0) {
      flowNodes.push({
        id: node.id,
        type: "org",
        data: {
          label: node.nom,
          code: node.code,
          type: node.type,
          actif: node.actif,
        },
        position: { x, y: startY },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
      if (parentId) addEdge(flowEdges, parentId, node.id);
      return { height: NODE_HEIGHT, centerY: startY + NODE_HEIGHT / 2 };
    }

    let cursorY = startY;
    const childResults = node.children.map((child) => {
      const result = layoutNode(child, depth + 1, cursorY, node.id);
      cursorY += result.height + SIBLING_GAP;
      return result;
    });

    const totalChildrenHeight = cursorY - startY - SIBLING_GAP;
    const firstCenter = childResults[0].centerY;
    const lastCenter = childResults[childResults.length - 1].centerY;
    const centerY = (firstCenter + lastCenter) / 2;
    const parentY = centerY - NODE_HEIGHT / 2;

    flowNodes.push({
      id: node.id,
      type: "org",
      data: {
        label: node.nom,
        code: node.code,
        type: node.type,
        actif: node.actif,
      },
      position: { x, y: parentY },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
    if (parentId) addEdge(flowEdges, parentId, node.id);

    return {
      height: Math.max(NODE_HEIGHT, totalChildrenHeight),
      centerY,
    };
  }

  let rootOffset = 0;
  nodes.forEach((root, index) => {
    const result = layoutNode(root, 0, rootOffset);
    rootOffset += result.height + (index < nodes.length - 1 ? SIBLING_GAP * 3 : 0);
  });

  return { flowNodes, flowEdges };
}

function countNodes(nodes: OrganisationTreeNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}

function OrganisationGraphInner({ nodes }: { nodes: OrganisationTreeNode[] }) {
  const { t } = useTranslation();
  const { flowNodes, flowEdges } = useMemo(() => layoutHorizontalTree(nodes), [nodes]);

  if (nodes.length === 0) return null;

  return (
    <Box>
      <Text size="2" color="gray" mb="3">
        <Text weight="bold" color="gray" highContrast>
          {t("common.units", { count: countNodes(nodes) })}
        </Text>{" "}
        — {t("admin.org.graphHint")}
      </Text>
      <Box
        style={{
          height: "calc(100vh - 14rem)",
          minHeight: 480,
          borderRadius: 8,
          border: "1px solid var(--gray-a6)",
          background: "var(--gray-2)",
        }}
      >
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: { top: 40, right: 80, bottom: 40, left: 40 } }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
          minZoom={0.3}
          maxZoom={1.5}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} color="var(--gray-6)" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => {
              const type = (node.data as OrgNodeData | undefined)?.type;
              return type ? MINIMAP_COLOR[type] : "#94a3b8";
            }}
            maskColor="rgba(0, 0, 0, 0.08)"
          />
        </ReactFlow>
      </Box>
    </Box>
  );
}

export function OrganisationGraph({ nodes }: { nodes: OrganisationTreeNode[] }) {
  return (
    <ReactFlowProvider>
      <OrganisationGraphInner nodes={nodes} />
    </ReactFlowProvider>
  );
}
