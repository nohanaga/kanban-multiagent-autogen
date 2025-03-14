import React, { useEffect, useState } from "react";
import clsx from "clsx";
import Box from "@material-ui/core/Box";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

import { Record } from "PersonalKanban/types";
import IconButton from "PersonalKanban/components/IconButton";
import { CARD_PAPER_HEIGHT, CARD_DESCRIPTION_MAX_HEIGHT, CARD_DESCRIPTION_MIN_HEIGHT } from "PersonalKanban/constants";

const useStyles = makeStyles(() => ({
  paper: {
    height: CARD_PAPER_HEIGHT,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  description: {
    maxHeight: CARD_DESCRIPTION_MAX_HEIGHT,
    minHeight: CARD_DESCRIPTION_MIN_HEIGHT,
    display: "-webkit-box",
    "-webkit-line-clamp": 10,
    "-webkit-box-orient": "vertical",
    overflow: "hidden",
    whiteSpace: "pre-line",
  },
  flash: { // 新規追加時に flash 効果を出すためのクラス
    animation: "$flashAnimation 1s ease-out",
  },
  "@keyframes flashAnimation": {
    // 1秒間で背景色を変化させるアニメーション
    from: { backgroundColor: "#ffff99" },
    to: { backgroundColor: "inherit" },
  },
  footer: {
    marginTop: "auto",
    paddingTop: 4,
    // borderTop: "1px solid #eee",
  },
}));

type CardProps = {
  record: Record;
  index?: number; 
  className?: string;
  style?: any;
  innerRef?: any;
  showEditAction?: boolean;
  showDeleteAction?: boolean;
  onDelete?: (record: Record) => void;
  onEdit?: (record: Record) => void;
};

const Card: React.FC<CardProps> = (props) => {
  const {
    record,
    index,
    className,
    innerRef,
    style,
    showEditAction,
    showDeleteAction,
    onDelete,
    onEdit,
    ...rest
  } = props;
  const { title, description, createdAt } = record;

  const classes = useStyles();

  // 新規追加時に flash 効果を出すための state
  const [flash, setFlash] = useState<boolean>(true);
  useEffect(() => {
    const timer = setTimeout(() => setFlash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEdit = React.useCallback(() => onEdit && onEdit(record), [record, onEdit]);
  const handleDelete = React.useCallback(() => onDelete && onDelete(record), [record, onDelete]);

  return (
    <Paper
      className={clsx(classes.paper, className, { [classes.flash]: flash })}
      style={style}
      ref={innerRef}
      {...rest}
    >
      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography title={title} gutterBottom noWrap>
            <b>{title}</b>
          </Typography>
          <Box display="flex" alignItems="center">
            {showEditAction && <IconButton icon="edit" onClick={handleEdit} />}
            {showDeleteAction && (
              <IconButton icon="deleteForever" onClick={handleDelete} />
            )}
          </Box>
        </Box>
        <Typography
          title={description}
          className={classes.description}
          variant="body2"
          gutterBottom
        >
          {description}
        </Typography>
      </Box>
      <Typography component="p" variant="caption" noWrap className={classes.footer}>
        {createdAt}
      </Typography>
    </Paper>
  );
};

Card.defaultProps = {
  showDeleteAction: true,
  showEditAction: true,
};

export default Card;
