import type { Edge, Node } from "@xyflow/react";
import type {
  CategoryGroup,
  ModuleStatus,
  RequirementCategory,
  RequirementProgress,
  RequirementSubcategory,
  ResolvedModule,
  UserModuleState,
} from "@/types";
import type { ModuleHandbookEntry } from "@/config/moduleHandbook.catalog";

export type GraphModuleStatus =
  | "done"
  | "planned"
  | "gap"
  | "failed"
  | "inactive";

export type NodeKind = "catalogue" | "subcategory" | "module";

export type CatalogueNodeData = {
  kind: "catalogue";
  variant: "group" | "category";
  label: string;
  requirementId: string | null;
  earnedCredits: number;
  requiredMin: number;
  requiredMax: number;
  remainingCredits: number;
  progressStatus: RequirementProgress["status"] | "not-started";
  isExpanded: boolean;
  isHighlighted: boolean;
};

export type SubcategoryNodeData = {
  kind: "subcategory";
  label: string;
  requirementId: string;
  moduleCount: number;
  earnedCredits: number;
  requiredMin: number;
  requiredMax: number;
  remainingCredits: number;
  progressStatus: RequirementProgress["status"];
  isExpanded: boolean;
  isHighlighted: boolean;
};

export type ModuleNodeData = {
  kind: "module";
  module: ResolvedModule;
  handbookEntry: ModuleHandbookEntry | null;
  moduleStatus: GraphModuleStatus;
  semesterLabel: string | null;
  isHighlighted: boolean;
};

export type GraphNodeData =
  | CatalogueNodeData
  | SubcategoryNodeData
  | ModuleNodeData;

export type BuildGraphOptions = {
  categoryGroups: CategoryGroup[];
  categories: RequirementCategory[];
  subcategories: RequirementSubcategory[];
  modules: ResolvedModule[];
  states: UserModuleState[];
  handbookCatalog: ModuleHandbookEntry[];
  requirementById: Record<string, RequirementProgress>;
  expandedNodeIds: Set<string>;
  searchTerm: string;
  focusedRequirementId: string | null;
  semesterLabelById: Record<string, string>;
};

export type GraphLayoutResult = {
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  focusNodeId: string | null;
};

type TreeNode = {
  id: string;
  parentId: string | null;
};

type Point = {
  x: number;
  y: number;
};

const NODE_DIMS = {
  catalogue: { width: 244, height: 92 },
  subcategory: { width: 220, height: 92 },
  module: { width: 220, height: 110 },
} as const;

const toTopLeftPosition = (center: Point, dims: { width: number; height: number }) => ({
  x: center.x - dims.width / 2,
  y: center.y - dims.height / 2,
});

const ROOT_Y = 92;
const TOP_MARGIN_X = 120;
const GAPS = {
  topLevel: 180,
  catalogue: 144,
  subcategory: 108,
  module: 72,
} as const;

const getChildGap = (parentNode: Node<GraphNodeData>) => {
  if (parentNode.data.kind === "subcategory") {
    return GAPS.module;
  }

  if (parentNode.data.kind === "catalogue" && parentNode.data.variant === "group") {
    return GAPS.topLevel;
  }

  return GAPS.catalogue;
};

const getVerticalGap = (parentNode: Node<GraphNodeData>, childNode: Node<GraphNodeData>) => {
  if (childNode.data.kind === "module") {
    return 214;
  }

  if (parentNode.id === "root-total-degree") {
    return 208;
  }

  if (parentNode.id === "group-subject-areas") {
    return 196;
  }

  if (parentNode.id === "cat-specialization-dse") {
    return childNode.id === "cat-dse-practice-block" ? 240 : 214;
  }

  if (parentNode.id === "cat-dse-practice-block") {
    return 208;
  }

  return childNode.data.kind === "subcategory" ? 214 : 196;
};

const mapModuleStatus = (status: ModuleStatus | undefined): GraphModuleStatus => {
  switch (status) {
    case "passed":
    case "recognised":
      return "done";
    case "planned":
    case "registered":
    case "ongoing":
      return "planned";
    case "incomplete":
      return "gap";
    case "failed":
      return "failed";
    case "withdrawn":
    case "extra":
      return "inactive";
    default:
      return "gap";
  }
};

const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

const buildFocusChain = (focusNodeId: string | null, treeById: Record<string, TreeNode>) => {
  if (!focusNodeId) {
    return new Set<string>();
  }

  const chain = new Set<string>();
  let currentId: string | null = focusNodeId;

  while (currentId) {
    chain.add(currentId);
    currentId = treeById[currentId]?.parentId ?? null;
  }

  return chain;
};

export const getGraphFocusNodeId = (
  requirementId: string | null,
  categoryGroups: CategoryGroup[],
  categories: RequirementCategory[],
  subcategories: RequirementSubcategory[],
) => {
  if (!requirementId) {
    return null;
  }

  if (requirementId === "total-degree") {
    return "root-total-degree";
  }

  if (requirementId === "elective-specialization") {
    return "cat-elective-specialization";
  }

  if (requirementId === "core-course-catalogues") {
    return "cat-core-course-catalogues";
  }

  if (requirementId === "specialization-dse" || requirementId === "dse-elective-area") {
    return "cat-specialization-dse";
  }

  if (requirementId === "dse-practice-block") {
    return "cat-dse-practice-block";
  }

  if (requirementId === "studium-generale") {
    return "cat-studium-generale";
  }

  if (requirementId === "master-thesis") {
    return "cat-master-thesis";
  }

  if (subcategories.some((subcategory) => subcategory.id === requirementId)) {
    return `sub-${requirementId}`;
  }

  if (categories.some((category) => category.id === requirementId)) {
    return `cat-${requirementId}`;
  }

  if (categoryGroups.some((group) => group.id === requirementId)) {
    return `group-${requirementId}`;
  }

  return `group-${requirementId}`;
};

export const buildGraphLayout = ({
  categoryGroups,
  categories,
  subcategories,
  modules,
  states,
  handbookCatalog,
  requirementById,
  expandedNodeIds,
  searchTerm,
  focusedRequirementId,
  semesterLabelById,
}: BuildGraphOptions): GraphLayoutResult => {
  const stateByModuleId = Object.fromEntries(states.map((state) => [state.moduleId, state]));
  const handbookByCode = new Map(handbookCatalog.map((entry) => [entry.moduleCode, entry]));

  const nodeTreeById: Record<string, TreeNode> = {};
  const searchValue = normalizeText(searchTerm);
  const matchingNodeIds = new Set<string>();

  const addSearchMatch = (nodeId: string, ...values: Array<string | undefined | null>) => {
    if (!searchValue) {
      return;
    }

    const isMatch = values.some((value) => value && normalizeText(value).includes(searchValue));
    if (isMatch) {
      matchingNodeIds.add(nodeId);
    }
  };

  const registerTreeNode = (id: string, parentId: string | null) => {
    nodeTreeById[id] = { id, parentId };
  };

  const requirementNodeLabels: Record<string, string> = {
    "root-total-degree": requirementById["total-degree"]?.label ?? "M.Sc. Computer Science",
    "group-subject-areas": "Subject Areas",
    "cat-elective-specialization":
      requirementById["elective-specialization"]?.label ?? "A. Elective Areas & Specializations",
    "cat-core-course-catalogues":
      categories.find((category) => category.id === "core-course-catalogues")?.label ??
      requirementById["core-course-catalogues"]?.label ??
      "Core Course Catalogues",
    "cat-specialization-dse":
      categories.find((category) => category.id === "specialization-dse")?.label ??
      "Data Science and Engineering",
    "cat-dse-practice-block": "Study-related services",
    "cat-studium-generale":
      categories.find((category) => category.id === "studium-generale")?.label ??
      requirementById["studium-generale"]?.label ??
      "General Education",
    "cat-master-thesis":
      categories.find((category) => category.id === "master-thesis")?.label ??
      requirementById["master-thesis"]?.label ??
      "Master Thesis",
  };

  const categoryChildren: Record<string, string[]> = {
    "group-subject-areas": ["cat-elective-specialization", "cat-studium-generale"],
    "cat-elective-specialization": ["cat-core-course-catalogues", "cat-specialization-dse"],
    "cat-core-course-catalogues": ["sub-basic-software-hardware", "sub-basic-theory"],
    "cat-specialization-dse": [
      "sub-dse-foundations",
      "sub-dse-data-systems",
      "sub-dse-applications",
      "cat-dse-practice-block",
    ],
    "cat-dse-practice-block": [
      "sub-dse-seminar",
      "sub-dse-lab-project",
      "sub-dse-practical-lab-teaching",
      "sub-dse-research-paper",
    ],
    "cat-studium-generale": [
      "sub-ge-languages",
      "sub-ge-humanities-social-economics",
      "sub-ge-environment-engineering-natural",
    ],
  };

  registerTreeNode("root-total-degree", null);
  registerTreeNode("group-subject-areas", "root-total-degree");
  registerTreeNode("cat-master-thesis", "root-total-degree");

  for (const [parentId, childIds] of Object.entries(categoryChildren)) {
    for (const childId of childIds) {
      registerTreeNode(childId, parentId);
    }
  }

  for (const [nodeId, label] of Object.entries(requirementNodeLabels)) {
    addSearchMatch(nodeId, label);
  }

  for (const subcategory of subcategories) {
    addSearchMatch(`sub-${subcategory.id}`, subcategory.label);
  }

  for (const plannedModule of modules) {
    registerTreeNode(`mod-${plannedModule.id}`, `sub-${plannedModule.assignedBasketId}`);
    addSearchMatch(`mod-${plannedModule.id}`, plannedModule.title, plannedModule.moduleCode);
  }

  const focusNodeId = getGraphFocusNodeId(
    focusedRequirementId,
    categoryGroups,
    categories,
    subcategories,
  );
  const searchExpandedNodeIds = buildFocusChain(
    matchingNodeIds.values().next().value ?? null,
    nodeTreeById,
  );

  for (const nodeId of [...matchingNodeIds]) {
    for (const ancestorId of buildFocusChain(nodeId, nodeTreeById)) {
      searchExpandedNodeIds.add(ancestorId);
    }
  }

  const focusedChainIds = buildFocusChain(focusNodeId, nodeTreeById);
  const effectiveExpandedNodeIds = new Set<string>([
    ...expandedNodeIds,
    ...searchExpandedNodeIds,
    ...focusedChainIds,
  ]);

  const nodes: Node<GraphNodeData>[] = [];
  const edges: Edge[] = [];
  const visibleChildrenById: Record<string, string[]> = {};

  const pushNode = (node: Node<GraphNodeData>) => {
    nodes.push(node);
  };

  const pushEdge = (edge: Edge) => {
    visibleChildrenById[edge.source] ??= [];
    visibleChildrenById[edge.source].push(edge.target);
    edges.push(edge);
  };

  const pushCatalogueNode = ({
    nodeId,
    label,
    requirementId,
    variant,
  }: {
    nodeId: string;
    label: string;
    requirementId: string | null;
    variant: "group" | "category";
  }) => {
    const requirement = requirementId ? requirementById[requirementId] : null;

    pushNode({
      id: nodeId,
      type: "catalogueNode",
      position: { x: 0, y: 0 },
      data: {
        kind: "catalogue",
        variant,
        label,
        requirementId,
        earnedCredits: requirement?.counted ?? 0,
        requiredMin: requirement?.min ?? 0,
        requiredMax: requirement?.max ?? 0,
        remainingCredits: requirement?.remaining ?? 0,
        progressStatus: requirement?.status ?? "not-started",
        isExpanded: effectiveExpandedNodeIds.has(nodeId),
        isHighlighted: matchingNodeIds.has(nodeId) || focusedChainIds.has(nodeId),
      },
    });
  };

  const totalRequirement = requirementById["total-degree"];
  const thesisRequirement = requirementById["master-thesis"];
  const subjectAreaEarnedCredits = Math.max(
    (totalRequirement?.counted ?? 0) - (thesisRequirement?.counted ?? 0),
    0,
  );
  const subjectAreaRemainingCredits = Math.max(90 - subjectAreaEarnedCredits, 0);
  const subjectAreaStatus: RequirementProgress["status"] =
    subjectAreaRemainingCredits === 0
      ? "satisfied"
      : subjectAreaEarnedCredits > 0
        ? "in-progress"
        : "not-started";

  pushNode({
    id: "root-total-degree",
    type: "catalogueNode",
    position: { x: 0, y: 0 },
    data: {
      kind: "catalogue",
      variant: "group",
      label: requirementNodeLabels["root-total-degree"],
      requirementId: "total-degree",
      earnedCredits: totalRequirement?.counted ?? 0,
      requiredMin: totalRequirement?.min ?? 120,
      requiredMax: totalRequirement?.max ?? 120,
      remainingCredits: totalRequirement?.remaining ?? 0,
      progressStatus: totalRequirement?.status ?? "not-started",
      isExpanded: true,
      isHighlighted: matchingNodeIds.has("root-total-degree") || focusedChainIds.has("root-total-degree"),
    },
  });

  pushNode({
    id: "group-subject-areas",
    type: "catalogueNode",
    position: { x: 0, y: 0 },
    data: {
      kind: "catalogue",
      variant: "group",
      label: requirementNodeLabels["group-subject-areas"],
      requirementId: "elective-specialization",
      earnedCredits: subjectAreaEarnedCredits,
      requiredMin: 90,
      requiredMax: 90,
      remainingCredits: subjectAreaRemainingCredits,
      progressStatus: subjectAreaStatus,
      isExpanded: effectiveExpandedNodeIds.has("group-subject-areas"),
      isHighlighted: matchingNodeIds.has("group-subject-areas") || focusedChainIds.has("group-subject-areas"),
    },
  });

  pushEdge({
    id: "edge-root-total-degree-group-subject-areas",
    source: "root-total-degree",
    target: "group-subject-areas",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#cbd5e1", strokeWidth: 1.2 },
  });

  pushCatalogueNode({
    nodeId: "cat-master-thesis",
    label: requirementNodeLabels["cat-master-thesis"],
    requirementId: "master-thesis",
    variant: "category",
  });

  pushEdge({
    id: "edge-root-total-degree-cat-master-thesis",
    source: "root-total-degree",
    target: "cat-master-thesis",
    type: "smoothstep",
    animated: false,
    style: { stroke: "#cbd5e1", strokeWidth: 1.2 },
  });

  const pushBranchNode = (
    parentId: string,
    nodeId: string,
    requirementId: string | null,
    variant: "group" | "category",
  ) => {
    pushCatalogueNode({
      nodeId,
      label: requirementNodeLabels[nodeId],
      requirementId,
      variant,
    });

    pushEdge({
      id: `edge-${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: "smoothstep",
      animated: false,
      style: { stroke: "#cbd5e1", strokeWidth: 1.1 },
    });
  };

  const pushSubcategoryNode = (parentId: string, subcategoryId: string) => {
    const subcategory = subcategories.find((item) => item.id === subcategoryId);
    const subcategoryRequirement = requirementById[subcategoryId];
    if (!subcategory || !subcategoryRequirement) {
      return;
    }

    const subcategoryNodeId = `sub-${subcategoryId}`;
    const subcategoryModules = modules.filter((plannedModule) => plannedModule.assignedBasketId === subcategoryId);

    pushNode({
      id: subcategoryNodeId,
      type: "subcategoryNode",
      position: { x: 0, y: 0 },
      data: {
        kind: "subcategory",
        label: subcategory.label,
        requirementId: subcategoryId,
        moduleCount: subcategoryModules.length,
        earnedCredits: subcategoryRequirement.counted,
        requiredMin: subcategoryRequirement.min,
        requiredMax: subcategoryRequirement.max,
        remainingCredits: subcategoryRequirement.remaining,
        progressStatus: subcategoryRequirement.status,
        isExpanded: effectiveExpandedNodeIds.has(subcategoryNodeId),
        isHighlighted: matchingNodeIds.has(subcategoryNodeId) || focusedChainIds.has(subcategoryNodeId),
      },
    });

    pushEdge({
      id: `edge-${parentId}-${subcategoryNodeId}`,
      source: parentId,
      target: subcategoryNodeId,
      type: "smoothstep",
      animated: false,
      style: { stroke: "#d8dee9", strokeWidth: 1 },
    });

    if (!effectiveExpandedNodeIds.has(subcategoryNodeId)) {
      return;
    }

    subcategoryModules.forEach((plannedModule) => {
      const moduleState = stateByModuleId[plannedModule.id];
      const handbookEntry = plannedModule.moduleCode ? handbookByCode.get(plannedModule.moduleCode) ?? null : null;
      const moduleStatus = mapModuleStatus(moduleState?.status);

      pushNode({
        id: `mod-${plannedModule.id}`,
        type: "moduleNode",
        position: { x: 0, y: 0 },
        data: {
          kind: "module",
          module: plannedModule,
          handbookEntry,
          moduleStatus,
          semesterLabel: moduleState?.semesterId ? semesterLabelById[moduleState.semesterId] ?? null : null,
          isHighlighted: matchingNodeIds.has(`mod-${plannedModule.id}`),
        },
      });

      pushEdge({
        id: `edge-${subcategoryNodeId}-mod-${plannedModule.id}`,
        source: subcategoryNodeId,
        target: `mod-${plannedModule.id}`,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#e2e8f0", strokeWidth: 1 },
      });
    });
  };

  if (effectiveExpandedNodeIds.has("group-subject-areas")) {
    pushBranchNode("group-subject-areas", "cat-elective-specialization", "elective-specialization", "category");
    pushBranchNode("group-subject-areas", "cat-studium-generale", "studium-generale", "category");
  }

  if (effectiveExpandedNodeIds.has("cat-elective-specialization")) {
    pushBranchNode("cat-elective-specialization", "cat-core-course-catalogues", "core-course-catalogues", "category");
    pushBranchNode("cat-elective-specialization", "cat-specialization-dse", "specialization-dse", "category");
  }

  if (effectiveExpandedNodeIds.has("cat-core-course-catalogues")) {
    pushSubcategoryNode("cat-core-course-catalogues", "basic-software-hardware");
    pushSubcategoryNode("cat-core-course-catalogues", "basic-theory");
  }

  if (effectiveExpandedNodeIds.has("cat-specialization-dse")) {
    pushSubcategoryNode("cat-specialization-dse", "dse-foundations");
    pushSubcategoryNode("cat-specialization-dse", "dse-data-systems");
    pushSubcategoryNode("cat-specialization-dse", "dse-applications");
    pushBranchNode("cat-specialization-dse", "cat-dse-practice-block", "dse-practice-block", "category");
  }

  if (effectiveExpandedNodeIds.has("cat-dse-practice-block")) {
    pushSubcategoryNode("cat-dse-practice-block", "dse-seminar");
    pushSubcategoryNode("cat-dse-practice-block", "dse-lab-project");
    pushSubcategoryNode("cat-dse-practice-block", "dse-practical-lab-teaching");
    pushSubcategoryNode("cat-dse-practice-block", "dse-research-paper");
  }

  if (effectiveExpandedNodeIds.has("cat-studium-generale")) {
    pushSubcategoryNode("cat-studium-generale", "ge-languages");
    pushSubcategoryNode("cat-studium-generale", "ge-humanities-social-economics");
    pushSubcategoryNode("cat-studium-generale", "ge-environment-engineering-natural");
  }

  if (effectiveExpandedNodeIds.has("cat-master-thesis")) {
    const thesisModules = modules.filter((plannedModule) => plannedModule.assignedBasketId === "master-thesis");
    thesisModules.forEach((plannedModule) => {
      const moduleState = stateByModuleId[plannedModule.id];
      const handbookEntry = plannedModule.moduleCode ? handbookByCode.get(plannedModule.moduleCode) ?? null : null;
      const moduleStatus = mapModuleStatus(moduleState?.status);

      pushNode({
        id: `mod-${plannedModule.id}`,
        type: "moduleNode",
        position: { x: 0, y: 0 },
        data: {
          kind: "module",
          module: plannedModule,
          handbookEntry,
          moduleStatus,
          semesterLabel: moduleState?.semesterId ? semesterLabelById[moduleState.semesterId] ?? null : null,
          isHighlighted: matchingNodeIds.has(`mod-${plannedModule.id}`),
        },
      });

      pushEdge({
        id: `edge-cat-master-thesis-mod-${plannedModule.id}`,
        source: "cat-master-thesis",
        target: `mod-${plannedModule.id}`,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#e2e8f0", strokeWidth: 1 },
      });
    });
  }

  const nodesById = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const subtreeWidthCache = new Map<string, number>();
  const positionsById: Record<string, Point> = {};

  const getSubtreeWidth = (nodeId: string): number => {
    const cached = subtreeWidthCache.get(nodeId);
    if (cached !== undefined) {
      return cached;
    }

    const node = nodesById[nodeId];
    if (!node) {
      return 0;
    }

    const nodeWidth = NODE_DIMS[node.data.kind].width;
    const childIds = visibleChildrenById[nodeId] ?? [];

    if (childIds.length === 0) {
      subtreeWidthCache.set(nodeId, nodeWidth);
      return nodeWidth;
    }

    const gap = getChildGap(node);
    const totalChildWidth =
      childIds.reduce((sum, childId) => sum + getSubtreeWidth(childId), 0) +
      gap * Math.max(childIds.length - 1, 0);
    const subtreeWidth = Math.max(nodeWidth, totalChildWidth);
    subtreeWidthCache.set(nodeId, subtreeWidth);
    return subtreeWidth;
  };

  const assignPositions = (nodeId: string, leftX: number, centerY: number) => {
    const node = nodesById[nodeId];
    if (!node) {
      return;
    }

    const subtreeWidth = getSubtreeWidth(nodeId);
    positionsById[nodeId] = {
      x: leftX + subtreeWidth / 2,
      y: centerY,
    };

    const childIds = visibleChildrenById[nodeId] ?? [];
    if (childIds.length === 0) {
      return;
    }

    const gap = getChildGap(node);
    const totalChildWidth =
      childIds.reduce((sum, childId) => sum + getSubtreeWidth(childId), 0) +
      gap * Math.max(childIds.length - 1, 0);
    let childLeftX = leftX + (subtreeWidth - totalChildWidth) / 2;

    childIds.forEach((childId) => {
      const childNode = nodesById[childId];
      if (!childNode) {
        return;
      }

      const childWidth = getSubtreeWidth(childId);
      assignPositions(
        childId,
        childLeftX,
        centerY + getVerticalGap(node, childNode),
      );
      childLeftX += childWidth + gap;
    });
  };

  assignPositions("root-total-degree", TOP_MARGIN_X, ROOT_Y);

  return {
    focusNodeId,
    nodes: nodes.map((node) => {
      const dims = NODE_DIMS[node.data.kind];
      const center = positionsById[node.id] ?? { x: TOP_MARGIN_X + dims.width / 2, y: ROOT_Y };

      return {
        ...node,
        position: toTopLeftPosition(center, dims),
      };
    }),
    edges,
  };
};
