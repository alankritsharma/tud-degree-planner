"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ModuleDetailPanel } from "@/components/graph/ModuleDetailPanel";
import { CatalogueNode } from "@/components/graph/nodes/CatalogueNode";
import { ModuleNode } from "@/components/graph/nodes/ModuleNode";
import { SubcategoryNode } from "@/components/graph/nodes/SubcategoryNode";
import { moduleHandbookCatalog } from "@/config/moduleHandbook.catalog";
import {
  buildGraphLayout,
  type GraphNodeData,
  type ModuleNodeData,
} from "@/lib/graph/layout";
import {
  CategoryGroup,
  ModuleStatus,
  RequirementCategory,
  RequirementProgress,
  RequirementSubcategory,
  ResolvedModule,
  Semester,
  UserModuleState,
} from "@/types";

const nodeTypes = {
  catalogueNode: CatalogueNode,
  subcategoryNode: SubcategoryNode,
  moduleNode: ModuleNode,
};

type CatalogueGraphProps = {
  categoryGroups: CategoryGroup[];
  categories: RequirementCategory[];
  subcategories: RequirementSubcategory[];
  modules: ResolvedModule[];
  states: UserModuleState[];
  semesters: Semester[];
  requirementById: Record<string, RequirementProgress>;
  focusedRequirementId: string | null;
  onFocusedRequirementHandled: () => void;
  onUpdateStatus: (moduleId: string, status: ModuleStatus) => void;
  onUpdateSemester: (moduleId: string, semesterId: string) => void;
};

const initialExpandedNodeIds = new Set<string>([
  "group-subject-areas",
  "cat-elective-specialization",
  "cat-studium-generale",
  "cat-specialization-dse",
  "cat-core-course-catalogues",
]);

export const CatalogueGraph = ({
  categoryGroups,
  categories,
  subcategories,
  modules,
  states,
  semesters,
  requirementById,
  focusedRequirementId,
  onFocusedRequirementHandled,
  onUpdateStatus,
  onUpdateSemester,
}: CatalogueGraphProps) => {
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(initialExpandedNodeIds);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const semesterLabelById = useMemo(
    () => Object.fromEntries(semesters.map((semester) => [semester.id, semester.label])),
    [semesters],
  );

  const layout = useMemo(
    () =>
      buildGraphLayout({
        categoryGroups,
        categories,
        subcategories,
        modules,
        states,
        handbookCatalog: moduleHandbookCatalog,
        requirementById,
        expandedNodeIds,
        searchTerm,
        focusedRequirementId,
        semesterLabelById,
      }),
    [
      categoryGroups,
      categories,
      subcategories,
      modules,
      states,
      requirementById,
      expandedNodeIds,
      searchTerm,
      focusedRequirementId,
      semesterLabelById,
    ],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layout.edges, layout.nodes, setEdges, setNodes]);

  useEffect(() => {
    if (focusedRequirementId) {
      onFocusedRequirementHandled();
    }
  }, [focusedRequirementId, onFocusedRequirementHandled]);

  const selectedModule = selectedModuleId
    ? modules.find((module) => module.id === selectedModuleId) ?? null
    : null;
  const selectedState = selectedModuleId
    ? states.find((state) => state.moduleId === selectedModuleId) ?? null
    : null;
  const selectedHandbookEntry =
    selectedModule?.moduleCode
      ? moduleHandbookCatalog.find((entry) => entry.moduleCode === selectedModule.moduleCode) ?? null
      : null;

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    const nodeData = node.data as GraphNodeData;

    if (nodeData.kind === "module") {
      const moduleData = nodeData as ModuleNodeData;
      setSelectedModuleId(moduleData.module.id);
      return;
    }

    setSelectedModuleId(null);
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  };

  return (
    <section className="relative flex h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="absolute left-4 right-4 top-4 z-20 flex flex-wrap items-start justify-between gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
          Programme graph
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search modules in the graph"
            className="w-64 rounded-xl border border-slate-300 bg-white/95 px-3 py-2 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200"
          />
            <button
              type="button"
              onClick={() => {
                setExpandedNodeIds(new Set(initialExpandedNodeIds));
                setSearchTerm("");
                setSelectedModuleId(null);
              }}
            className="rounded-xl border border-slate-300 bg-white/95 px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Reset view
          </button>
        </div>
      </div>

      <div className="h-full min-h-0 flex-1">
        <ReactFlow
          nodes={nodes.map((node) => ({ ...node, selected: node.id === layout.focusNodeId || node.selected }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedModuleId(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.14, minZoom: 0.56, maxZoom: 0.82 }}
          minZoom={0.48}
          maxZoom={1.65}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1}
            color="#cbd5e1"
          />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            pannable
            zoomable
            style={{
              backgroundColor: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(148,163,184,0.25)",
              borderRadius: 12,
            }}
            nodeColor={(node) => {
              const nodeData = node.data as GraphNodeData;
              if (nodeData.kind === "module") {
                const moduleData = nodeData as ModuleNodeData;
                if (moduleData.moduleStatus === "done") return "#10b981";
                if (moduleData.moduleStatus === "planned") return "#0ea5e9";
                if (moduleData.moduleStatus === "gap") return "#f59e0b";
                if (moduleData.moduleStatus === "failed") return "#ef4444";
                return "#94a3b8";
              }
              if (nodeData.kind === "subcategory") {
                return "#c084fc";
              }
              return "#1f2937";
            }}
          />
        </ReactFlow>
      </div>

      <ModuleDetailPanel
        module={selectedModule}
        state={selectedState}
        handbookEntry={selectedHandbookEntry}
        semesters={semesters}
        onClose={() => setSelectedModuleId(null)}
        onUpdateStatus={onUpdateStatus}
        onUpdateSemester={onUpdateSemester}
      />
    </section>
  );
};
