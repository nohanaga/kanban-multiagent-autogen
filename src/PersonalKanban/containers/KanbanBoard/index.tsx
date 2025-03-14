import React from "react";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/core/styles";

import KanbanBoard from "PersonalKanban/components/KanbanBoard";
import { Column, Record } from "PersonalKanban/types";
import {
  getId,
  getCreatedAt,
  getInitialState,
  reorder,
  reorderCards,
} from "PersonalKanban/services/Utils";
import StorageService from "PersonalKanban/services/StorageService";
import Toolbar from "PersonalKanban/containers/Toolbar";
import IconButton from "PersonalKanban/components/IconButton";
import Link from "@material-ui/core/Link";

const useTinyManagerStyles = makeStyles((theme) => ({
  button: {
    position: "fixed",
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    padding: theme.spacing(),
    backgroundColor: "#3f51b5",
    color: "#ffffff",
    "&:hover": {
      backgroundColor: "#ffffff",
      color: "#3f51b5",
      border: "1px solid #3f51b5",
    },
  },
}));

const TinyManagerButton = () => {
  const styles = useTinyManagerStyles();
  return (
    <IconButton
      icon="list"
      href="https://tinymanager.js.org/showcase.html"
      component={Link}
      target="_blank"
      title="Tiny Manager"
      className={styles.button}
    />
  );
};

const useKanbanBoardStyles = makeStyles((theme) => ({
  toolbar: theme.mixins.toolbar,
}));

type KanbanBoardContainerProps = {};

let initialState = StorageService.getColumns();
if (!initialState) {
  initialState = getInitialState();
}

const KanbanBoardContainer: React.FC<KanbanBoardContainerProps> = (props) => {
  const [columns, setColumns] = React.useState<Column[]>(initialState);
  const [selectedSpeaker, setSelectedSpeaker] = React.useState<string>("");
  const classes = useKanbanBoardStyles();

  // 別の箇所で columns の shallow copy を使うためのヘルパー
  const cloneColumns = React.useCallback((columns: Column[]) => {
    return columns.map((column: Column) => ({
      ...column,
      records: [...(column.records || [])],
    }));
  }, []);

  const getColumnIndex = React.useCallback(
    (id: string) => {
      return columns.findIndex((c: Column) => c.id === id);
    },
    [columns]
  );

  const getRecordIndex = React.useCallback(
    (recordId: string, columnId: string) => {
      const colIndex = getColumnIndex(columnId);
      return columns[colIndex]?.records?.findIndex(
        (r: Record) => r.id === recordId
      );
    },
    [columns, getColumnIndex]
  );

  const handleClearBoard = React.useCallback(() => {
    setColumns([]);
  }, []);

  const handleAddColumn = React.useCallback(
    ({ column }: { column: Column }) => {
      setColumns((cols: Column[]) => [
        ...cols,
        {
          id: getId(),
          records: [],
          createdAt: getCreatedAt(),
          ...((({ id, ...rest }) => rest)(column))
        },
      ]);
    },
    []
  );

  const handleColumnMove = React.useCallback(
    ({ column, index }: { column: Column; index: number }) => {
      const updatedColumns = reorder(columns, getColumnIndex(column.id), index);
      setColumns(updatedColumns);
    },
    [columns, getColumnIndex]
  );

  const handleColumnEdit = React.useCallback(
    ({ column }: { column: Column }) => {
      setColumns((prevColumns) => {
        const columnIndex = getColumnIndex(column.id);
        const updatedColumns = cloneColumns(prevColumns);
        updatedColumns[columnIndex] = {
          ...updatedColumns[columnIndex],
          title: column.title,
          description: column.description,
          color: column.color,
          wipEnabled: column.wipEnabled,
          wipLimit: column.wipLimit,
        };
        return updatedColumns;
      });
    },
    [getColumnIndex, cloneColumns]
  );

  const handleColumnDelete = React.useCallback(
    ({ column }: { column: Column }) => {
      setColumns((prevColumns) => {
        const updatedColumns = cloneColumns(prevColumns);
        updatedColumns.splice(getColumnIndex(column.id), 1);
        return updatedColumns;
      });
    },
    [cloneColumns, getColumnIndex]
  );

  const handleCardMove = React.useCallback(
    ({
      column,
      index,
      source,
      record,
    }: {
      column: Column;
      index: number;
      source: Column;
      record: Record;
    }) => {
      const updatedColumns = reorderCards({
        columns,
        destinationColumn: column,
        destinationIndex: index,
        sourceColumn: source,
        sourceIndex: getRecordIndex(record.id, source.id)!,
      });
      setColumns(updatedColumns);
    },
    [columns, getRecordIndex]
  );

  const handleAddRecord = React.useCallback(
    ({ column, record }: { column: Column; record: Record }) => {
      setColumns((prevColumns) => {
        const updatedColumns = cloneColumns(prevColumns);
        const columnIndex = updatedColumns.findIndex((c: Column) => c.id === column.id);
        if (columnIndex === -1) return updatedColumns;
        // 各カラムの全レコード数から発言番号を再計算
        const newMessageCount =
          updatedColumns.reduce(
            (count, col) => count + (col.records?.length || 0),
            0
          ) + 1;
        updatedColumns[columnIndex].records.push({
          id: getId(),
          title: `発言 #${newMessageCount}`,
          description: record.description,
          color: record.color,
          createdAt: getCreatedAt(),
        });
        return updatedColumns;
      });
    },
    [cloneColumns]
  );

  const handleRecordEdit = React.useCallback(
    ({ column, record }: { column: Column; record: Record }) => {
      const columnIndex = getColumnIndex(column.id);
      const recordIndex = getRecordIndex(record.id, column.id);
      setColumns((prevColumns) => {
        const updatedColumns = cloneColumns(prevColumns);
        const _record = updatedColumns[columnIndex].records[recordIndex!];
        _record.title = record.title;
        _record.description = record.description;
        _record.color = record.color;
        return updatedColumns;
      });
    },
    [getColumnIndex, getRecordIndex, cloneColumns]
  );

  const handleRecordDelete = React.useCallback(
    ({ column, record }: { column: Column; record: Record }) => {
      const columnIndex = getColumnIndex(column.id);
      const recordIndex = getRecordIndex(record.id, column.id);
      setColumns((prevColumns) => {
        const updatedColumns = cloneColumns(prevColumns);
        updatedColumns[columnIndex].records.splice(recordIndex!, 1);
        return updatedColumns;
      });
    },
    [cloneColumns, getColumnIndex, getRecordIndex]
  );

  const handleAllRecordDelete = React.useCallback(
    ({ column }: { column: Column }) => {
      const columnIndex = getColumnIndex(column.id);
      setColumns((prevColumns) => {
        const updatedColumns = cloneColumns(prevColumns);
        updatedColumns[columnIndex].records = [];
        return updatedColumns;
      });
    },
    [cloneColumns, getColumnIndex]
  );

  const handleTestAddCard = React.useCallback(() => {
    if (columns.length === 0) {
      console.warn("No column available to add a card");
      return;
    }
    const targetColumn = columns[0];
    const newRecord = {
      id: getId(),
      title: "テストカード",
      description: "これはテストで追加されたカードです",
      color: "Blue",
      createdAt: getCreatedAt(),
    };
    handleAddRecord({ column: targetColumn, record: newRecord });
  }, [columns, handleAddRecord]);

  React.useEffect(() => {
    StorageService.setColumns(columns);
  }, [columns]);

  const handleNewCardFromWS = React.useCallback(
    (columnTitle: string, text: string) => {
      let targetColumn = columns[0];
      if (!text.includes("TERMINATE")) {
        targetColumn = columns.find((col) => col.title === columnTitle) || targetColumn;
      }
      const newRecord = {
        id: getId(),
        title: "",
        description: text,
        color: "Default",
        createdAt: getCreatedAt(),
      };
      handleAddRecord({ column: targetColumn, record: newRecord });
    },
    [columns, handleAddRecord]
  );

  return (
    <>
      <Toolbar
        clearButtonDisabled={!columns.length}
        onNewColumn={handleAddColumn}
        onClearBoard={handleClearBoard}
        onTestAddCard={handleTestAddCard}
        onNewCardFromWS={handleNewCardFromWS}
        onSelectedSpeakerChange={(speaker: string) => setSelectedSpeaker(speaker)}
        columns={columns}
      />
      <div className={classes.toolbar} />
      <Box padding={1}>
        <KanbanBoard
          columns={columns}
          selectedSpeaker={selectedSpeaker}
          onColumnMove={handleColumnMove}
          onColumnEdit={handleColumnEdit}
          onColumnDelete={handleColumnDelete}
          onCardMove={handleCardMove}
          onAddRecord={handleAddRecord}
          onRecordEdit={handleRecordEdit}
          onRecordDelete={handleRecordDelete}
          onAllRecordDelete={handleAllRecordDelete}
        />
      </Box>
      {/* <TinyManagerButton /> */}
    </>
  );
};

export default KanbanBoardContainer;
