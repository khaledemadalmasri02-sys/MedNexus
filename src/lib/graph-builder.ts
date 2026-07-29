import { type MedicalEntity, type EntityRelationship, type KnowledgeGraphNodeData, type KnowledgeGraphEdgeData } from "./medical-entities";
import { type EntityExtractor } from "./entity-extractor";
import type { DB } from "../db/index";
import { knowledgeGraphNodes, knowledgeGraphEdges } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./logger";

export interface GraphBuildOptions {
  maxNodes?: number;
  maxEdges?: number;
  relationshipTypes?: string[];
  minEntityConfidence?: number;
}

export class GraphBuilder {
  private entityExtractor: EntityExtractor;
  private db: DB;

  constructor(entityExtractor: EntityExtractor, db: DB) {
    this.entityExtractor = entityExtractor;
    this.db = db;
  }

  async buildGraph(text: string, options: GraphBuildOptions = {}): Promise<{ nodes: KnowledgeGraphNodeData[]; edges: EntityRelationship[] }> {
    const result = await this.entityExtractor.extractEntities(text, {
      minConfidence: options.minEntityConfidence,
    });

    const nodes: KnowledgeGraphNodeData[] = result.entities.map((entity: MedicalEntity) => ({
      id: entity.id,
      type: "entity" as const,
      name: entity.name,
      content: entity.description,
      metadata: {
        entityType: entity.type,
        confidence: entity.confidence,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const edges = this.detectRelationships(nodes, text, options);

    return { nodes, edges };
  }

  detectRelationships(nodes: KnowledgeGraphNodeData[], text: string, options: GraphBuildOptions = {}): EntityRelationship[] {
    const edges: EntityRelationship[] = [];

    const relationshipKeywords: Record<string, string> = {
      causes: "causes|leads to|results in|induces|triggers",
      treats: "treats|therapy|management|drug|medication",
      manifests: "manifests as|presents with|shows|exhibits",
      diagnosed_by: "diagnosed by|diagnosis confirmed by|identified by",
      associated_with: "associated with|linked to|related to",
      precedes: "precedes|follows|occurs before",
      follows: "follows|after|subsequent to",
      contraindicated_with: "contraindicated with|avoid with",
      prevents: "prevents|prophylaxis|prevention",
      measured_by: "measured by|assessed by|evaluated by",
      located_in: "located in|found in|resides in",
      part_of: "part of|component of|portion of",
      requires: "requires|needs|depends on",
      produces: "produces|generates|creates",
      targets: "targets|binds to|interacts with",
      metabolized_by: "metabolized by|processed by",
      excreted_by: "excreted by|eliminated by",
    };

    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;

        const source = nodes[i];
        const target = nodes[j];

        for (const [relType, keywords] of Object.entries(relationshipKeywords)) {
          if (options.relationshipTypes && !options.relationshipTypes.includes(relType)) continue;

          const pattern = new RegExp(`${source.name}\\s+(?:is|was|are|were)?\\s+(?:${keywords})\\s+${target.name}`, "i");
          if (pattern.test(text)) {
            edges.push({
              sourceId: source.id,
              targetId: target.id,
              relationshipType: relType,
              strength: 0.8,
              evidence: `${source.name} ${relType} ${target.name}`,
            });
          }
        }
      }
    }

    return edges;
  }

  async persistGraph(nodes: KnowledgeGraphNodeData[], edges: EntityRelationship[]): Promise<{ nodeCount: number; edgeCount: number }> {
    try {
      if (nodes.length > 0) {
        const nodeRows = nodes.map((n: KnowledgeGraphNodeData) => ({
          id: n.id,
          type: n.type,
          name: n.name,
          content: n.content || null,
          metadata: n.metadata ? JSON.stringify(n.metadata) : null,
          createdAt: n.createdAt || new Date(),
          updatedAt: n.updatedAt || new Date(),
        }));
        await this.db.insert(knowledgeGraphNodes).values(nodeRows).onConflictDoNothing();
      }

      if (edges.length > 0) {
        const edgeRows = edges.map((e: EntityRelationship) => ({
          sourceId: e.sourceId,
          targetId: e.targetId,
          relationshipType: e.relationshipType,
          createdAt: new Date(),
        }));
        await this.db.insert(knowledgeGraphEdges).values(edgeRows);
      }

      return { nodeCount: nodes.length, edgeCount: edges.length };
    } catch (err) {
      logger.error({ err: (err as Error)?.message, nodeCount: nodes.length, edgeCount: edges.length }, "Failed to persist graph");
      throw err;
    }
  }

  async findRelatedNodes(nodeId: string, relationshipTypes?: string[]): Promise<KnowledgeGraphNodeData[]> {
    const edgeResult = await this.db.query.knowledgeGraphEdges.findMany({
      where: inArray(knowledgeGraphEdges.sourceId, [nodeId]),
    });

    const targetIds = edgeResult
      .filter((e: { relationshipType: string }) => !relationshipTypes || relationshipTypes.includes(e.relationshipType))
      .map((e: { targetId: string }) => e.targetId);

    if (targetIds.length === 0) return [];

    const nodes = await this.db.query.knowledgeGraphNodes.findMany({
      where: inArray(knowledgeGraphNodes.id, targetIds),
    });

    return nodes.map((n: { id: string; type: string; name: string; content: string | null; metadata: string | null; createdAt: Date; updatedAt: Date }) => ({
      id: n.id,
      type: n.type as "entity" | "concept" | "fact",
      name: n.name,
      content: n.content || undefined,
      metadata: n.metadata ? JSON.parse(n.metadata) as Record<string, unknown> : undefined,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));
  }

  async getNeighbors(nodeId: string, depth = 1, relationshipTypes?: string[]): Promise<KnowledgeGraphNodeData[]> {
    if (depth < 1) return [];

    const directNeighbors = await this.findRelatedNodes(nodeId, relationshipTypes);
    const neighborIds = directNeighbors.map((n: KnowledgeGraphNodeData) => n.id);

    if (depth === 1) return directNeighbors;

    const secondLevelNodes: KnowledgeGraphNodeData[] = [];
    for (const neighborId of neighborIds) {
      const neighbors = await this.findRelatedNodes(neighborId, relationshipTypes);
      secondLevelNodes.push(...neighbors);
    }

    return [...directNeighbors, ...secondLevelNodes];
  }

  async clearGraph(): Promise<void> {
    await this.db.delete(knowledgeGraphEdges);
    await this.db.delete(knowledgeGraphNodes);
  }
}

export function createGraphBuilder(entityExtractor: EntityExtractor, db: DB): GraphBuilder {
  return new GraphBuilder(entityExtractor, db);
}