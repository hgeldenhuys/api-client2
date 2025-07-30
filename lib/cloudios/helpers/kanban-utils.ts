// ====================
// KANBAN BOARD UTILITIES
// ====================
import {BoardDetails, ColumnDetails, KanbanCard} from "../types";
import {CLOUDIOS_SERVER} from "./config";
import {ProjectUtils} from "./project-utils";
import {ProcessUtils} from "./process-utils";
import {DebugUtils} from "./debug-utils";

export const KanbanUtils = {
  async getCardDetails(cardId: number): Promise<KanbanCard> {
    const cardResponse = await fetch(`${CLOUDIOS_SERVER}/api/kanban/card/${cardId}`, {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });

    if (cardResponse.ok) {
      try {
        const cardData = await cardResponse.json();
        if (cardData.card) {
          return cardData.card;
        }
      } catch (e) {
        // Fall through to workaround
      }
    }

    const projectName = ProjectUtils.paths().PROJECT_NAME;
    const cardsResponse = await fetch(`${CLOUDIOS_SERVER}/api/kanban/cards?projectName=${projectName}`, {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });

    if (!cardsResponse.ok) {
      ProcessUtils.error(`Failed to get card ${cardId}: ${cardResponse.status}`);
      process.exit(1);
    }

    const cardsData = await cardsResponse.json() as { cards: KanbanCard[] };
    const card = cardsData.cards.find((c) => c.id === cardId);

    if (!card) {
      ProcessUtils.error(`Card ${cardId} not found`);
      process.exit(1);
    }

    return card;
  },

  async getBoardDetails(): Promise<BoardDetails> {
    // Get board details to find the configured review column
    const projectName = ProjectUtils.paths().PROJECT_NAME;
    const boardResponse = await fetch(`${CLOUDIOS_SERVER}/api/kanban/board/${projectName}`, {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });

    if (!boardResponse.ok) {
      ProcessUtils.error(`Failed to get board: ${boardResponse.status}`);
      process.exit(1);
    }

    const data = await boardResponse.json();
    // Map the API response to our expected structure
    return {
      board_id: data.board.id || 0,
      board_title: data.board.title,
      board_order: data.board.order || 0,
      work_column_id: 0, // Will be set by getWorkColumn
      work_column_title: data.board.work_column || "In Progress",
      work_column_order: 0,
      review_column_id: 0, // Will be set by getReviewColumn
      review_column_title: data.board.review_column,
      review_column_order: 0
    };
  },

  async getColumns(): Promise<ColumnDetails[]> {
    const projectName = ProjectUtils.paths().PROJECT_NAME;
    const columnsResponse = await fetch(`${CLOUDIOS_SERVER}/api/kanban/columns?projectName=${projectName}`, {
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    });

    if (!columnsResponse.ok) {
      ProcessUtils.error(`Failed to get columns: ${columnsResponse.status}`);
      process.exit(1);
    }

    const {columns} = await columnsResponse.json();
    return columns;
  },

  async getReviewColumn() {
    const board = await KanbanUtils.getBoardDetails();
    const reviewColumnName = board.review_column_title;
    const columns = await KanbanUtils.getColumns();

    const reviewColumn = columns.find((col) => col.title === reviewColumnName);
    if (!reviewColumn) {
      ProcessUtils.error(`No "${reviewColumnName}" column found`);
      process.exit(1);
    }

    return reviewColumn;
  },
  async getWorkColumn() {
    const board = await KanbanUtils.getBoardDetails();
    const workColumnName = board.work_column_title;
    const columns = await KanbanUtils.getColumns();

    const workColumn = columns.find((col) => col.title === workColumnName);
    if (!workColumn) {
      ProcessUtils.error(`No "${workColumnName}" column found`);
      process.exit(1);
    }

    return workColumn;
  },

  async moveCardTo(column: "work" | "review", cardId: number, sessionId: string, details?: string): Promise<boolean> {
    try {
      const card = await KanbanUtils.getCardDetails(cardId);
      const toColumn = await {
        work: KanbanUtils.getWorkColumn,
        review: KanbanUtils.getReviewColumn
      }[column]();

      DebugUtils.debug(`Card ${cardId} is in column ${card.column_id}, Review column is ${toColumn.id}`);

      if (card.column_id === toColumn.id) {
        DebugUtils.debug(`Card is already in the ${column} column`);
        return true;
      }

      // Move the card
      const moveResponse = await fetch(`${CLOUDIOS_SERVER}/api/kanban/cards`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          cardId: cardId,
          fromColumnId: card.column_id,  // Include the from column for proper SSE broadcast
          toColumnId: toColumn.id,
          agentSessionId: sessionId,
          details
        })
      });

      if (!moveResponse.ok) {
        const errorText = await moveResponse.text();
        ProcessUtils.error(`Failed to move card: ${moveResponse.status} - ${errorText}`);
        process.exit(1);
      }

      const result = await moveResponse.json();
      DebugUtils.debug(`Move response: ${JSON.stringify(result)}`);

      if (result.success && result.card) {
        DebugUtils.debug(`✅ Card moved to column ${result.card.column_id}`);
      } else {
        ProcessUtils.error("Move failed - no success in response");
      }

      return true;
    } catch (error) {
      ProcessUtils.error(`Error moving card: ${(error as Error).message}`);
      return false;
    }
  },
  async getNextCard(sessionId: string, includeUnassigned: boolean = true): Promise<KanbanCard | null> {
    const {PROJECT_NAME} = ProjectUtils.paths();
    try {
      const includeParam = includeUnassigned ? '&includeUnassigned=true' : '';
      const response = await fetch(`${CLOUDIOS_SERVER}/api/kanban/next-assigned-task?projectName=${PROJECT_NAME}&agentSessionId=${sessionId}${includeParam}`, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'}
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        ProcessUtils.error(`Failed to get next task: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.card || null;
    } catch (error) {
      ProcessUtils.error(`Error fetching next task: ${(error as Error).message}`);
      return null;
    }
  }
};