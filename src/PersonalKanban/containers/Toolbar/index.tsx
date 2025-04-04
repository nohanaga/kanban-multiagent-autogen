import React, { useState } from "react";

import AppBar from "@material-ui/core/AppBar";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import Divider from "@material-ui/core/Divider";
import MuiToolbar from "@material-ui/core/Toolbar";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Grid from "@material-ui/core/Grid";
import Popover from "@material-ui/core/Popover";
import Typography from "@material-ui/core/Typography";
import Link from "@material-ui/core/Link";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles, useTheme as useMuiTheme } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";

import { useTranslation } from "PersonalKanban/providers/TranslationProvider";
import ColumnForm from "PersonalKanban/components/ColumnForm";
import IconButton from "PersonalKanban/components/IconButton";
import { Column } from "PersonalKanban/types";
import { useTheme } from "PersonalKanban/providers/ThemeProvider";
import ChatBox from "PersonalKanban/components/ChatBox";

type AddColumnButtonProps = {
  onSubmit: any;
};

const AddColumnButton: React.FC<AddColumnButtonProps> = (props) => {
  const { onSubmit } = props;

  const { t } = useTranslation();

  const [open, setOpen] = React.useState(false);

  const handleOpenDialog = React.useCallback(() => {
    setOpen(true);
  }, []);

  const handleCloseDialog = React.useCallback(() => {
    setOpen(false);
  }, []);

  const handleSubmit = React.useCallback(
    (column: Column) => {
      onSubmit({ column });
      handleCloseDialog();
    },
    [onSubmit, handleCloseDialog]
  );

  return (
    <Box display="block">
      <IconButton icon="add" color="primary" onClick={handleOpenDialog}>
        {t("addColumn")}
      </IconButton>
      <Dialog onClose={handleCloseDialog} open={open}>
        <DialogContent>
          <ColumnForm onSubmit={handleSubmit} onCancel={handleCloseDialog} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

type ClearBoardButtonProps = {
  onClear: any;
  disabled?: boolean;
};

const ClearBoardButton: React.FC<ClearBoardButtonProps> = (props) => {
  const { disabled, onClear } = props;

  const { t } = useTranslation();

  const [open, setOpen] = React.useState(false);

  const handleOpenDialog = React.useCallback(() => {
    setOpen(true);
  }, []);

  const handleCloseDialog = React.useCallback(() => {
    setOpen(false);
  }, []);

  const handleClear = React.useCallback(
    (e) => {
      onClear({ e });
      handleCloseDialog();
    },
    [onClear, handleCloseDialog]
  );

  return (
    <Box display="flex">

        <IconButton
          icon="delete"
          color="primary"
          disabled={disabled}
          onClick={handleOpenDialog}
        ></IconButton>

      <Dialog onClose={handleCloseDialog} open={open}>
        <DialogContent>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography gutterBottom variant="h6">
                {t("clearBoard")}
              </Typography>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>
                {t("clearBoardConfirmation")}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Button variant="outlined" onClick={handleCloseDialog}>
                {t("cancel")}
              </Button>
              &nbsp;
              <Button color="primary" variant="contained" onClick={handleClear}>
                {t("clear")}
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

type LanguageButtonProps = {};

const LanguageButton: React.FC<LanguageButtonProps> = (props) => {
  const { i18n } = useTranslation();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChangeLanguage = (lng: string) => () => {
    i18n.changeLanguage(lng);
    handleClose();
  };

  return (
    <Box display="block">
      <IconButton
        icon={"language"}
        aria-controls="language-menu"
        aria-haspopup="true"
        color="inherit"
        onClick={handleClick}
      />
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleChangeLanguage("en")}>English</MenuItem>
        <MenuItem onClick={handleChangeLanguage("fr")}>Français</MenuItem>
        <MenuItem onClick={handleChangeLanguage("es")}>Español</MenuItem>
        <MenuItem onClick={handleChangeLanguage("ru")}>Pусский</MenuItem>
        <MenuItem onClick={handleChangeLanguage("de")}>Deutsch</MenuItem>
        <MenuItem onClick={handleChangeLanguage("in")}>हिंदी</MenuItem>
        <MenuItem onClick={handleChangeLanguage("jp")}>日本語</MenuItem>
        <MenuItem onClick={handleChangeLanguage("cn")}>中文</MenuItem>
      </Menu>
    </Box>
  );
};

const DarkThemeButton: React.FC<{}> = () => {
  const { darkTheme, handleToggleDarkTheme } = useTheme();

  return (
    <IconButton
      color="inherit"
      icon={darkTheme ? "invertColors" : "invertColorsOff"}
      onClick={handleToggleDarkTheme}
    />
  );
};

const GitHubButton: React.FC<{}> = () => {
  return (
    <IconButton
      color="inherit"
      icon="gitHub"
      component={Link}
      href="https://github.com/nishantpainter/personal-kanban"
      target="_blank"
    />
  );
};

const useInfoButtonStyles = makeStyles((theme) => ({
  paper: {
    maxWidth: 300,
    minWidth: 300,
    maxHeight: 250,
    minHeight: 250,
    padding: theme.spacing(),
  },
  buttonGridItem: {
    textAlign: "center",
  },
}));

const RefreshColumnsButton: React.FC = () => {
  const handleRefresh = () => {
    localStorage.removeItem("columns");
    window.location.reload();
  };

  return (
    <Box display="block">

        <IconButton icon="restore" color="primary" onClick={handleRefresh}>
          リフレッシュ
        </IconButton>

    </Box>
  );
};

const InfoButton: React.FC<{}> = () => {
  const classes = useInfoButtonStyles();
  const [anchorEl, setAnchorEl] = useState(null);

  const openInfo = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const closeInfo = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const id = open ? "info-popover" : undefined;

  return (
    <>
      <IconButton icon="info" color="primary" onClick={openInfo} />
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={closeInfo}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        PaperProps={{ className: classes.paper }}
      >
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Box marginTop={2} textAlign="center">
              <img
                src="https://tinymanager.js.org/readme_logo.png"
                height="30"
                alt="Stacks"
              />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2">
              <Link href="https://tinymanager.js.org/" target="_blank">
                Tiny Manager{" "}
              </Link>
              is an offline first simple application that assists you in
              managing your pet projects. Along with project management it
              allows mundane management using todos and a simple notepad
              application, all at one place.
            </Typography>
          </Grid>
          <Grid item xs={12} className={classes.buttonGridItem}>
            <Button variant="contained" color="primary">
              <Link
                color="inherit"
                href="https://tinymanager.js.org/"
                target="_blank"
              >
                Get Started
              </Link>
            </Button>
          </Grid>
        </Grid>
      </Popover>
    </>
  );
};
const useToolbarStyles = makeStyles(() => ({
  paper: {
    padding: 0,
  },
}));

// ToolbarProps に onTestAddCard を追加
type ToolbarProps = {
  clearButtonDisabled?: boolean;
  onNewColumn: any;
  onClearBoard: any;
  onTestAddCard?: () => void; // テスト用のカード追加ハンドラー
  onNewCardFromWS?: (columnId: string, text: string) => void; // WebSocket 受信時のカード追加ハンドラー
  columns: Column[]; // 追加：KanbanBoard上の全Column一覧
  onSelectedSpeakerChange?: (speaker: string) => void; // 追加：選択されたスピーカーを親コンポーネントに通知するためのコールバック
};

const TestAddCardButton: React.FC<{ onTestAddCard: () => void }> = ({
  onTestAddCard,
}) => {
  return (
    <Box display="block">
      <IconButton
        icon="addcomment"
        color="primary"
        onClick={onTestAddCard}
      >
        カード追加
      </IconButton>
    </Box>
  );
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const { clearButtonDisabled, onNewColumn, onClearBoard, onTestAddCard, onNewCardFromWS, columns, onSelectedSpeakerChange} = props;

  // ...既存の定義
  const { t } = useTranslation();
  const classes = useToolbarStyles();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));
  const { darkTheme, handleToggleDarkTheme } = useTheme();

  // handleNewCardFromWS を内部で定義
  const handleNewCardFromWS = React.useCallback(
    (columnId: string, text: string) => {
      // 親から渡された onNewCardFromWS があれば呼び出す
      if (onNewCardFromWS) {
        onNewCardFromWS(columnId, text);
      } else {
        console.warn("onNewCardFromWS が未実装です");
      }
    },
    [onNewCardFromWS]
  );

  // processing 状態を管理
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  return (
    <AppBar color="default" elevation={6} className={classes.paper}>
      <MuiToolbar>
        <Box display="flex" alignItems="center">
          <IconButton
            icon="personalKanban"
            color="primary"
            size="small"
            iconProps={{ fontSize: "large" }}
            disableRipple
            disableTouchRipple
            disableFocusRipple
          />
          &nbsp;
          <Typography variant={isMobile ? "body1" : "h6"}>
            <b>{t("personalKanban")}</b>
          </Typography>
          <div style={{ display: "none" }} >
            &nbsp; 現在のテーマ: {darkTheme ? "ダークテーマ" : "ライトテーマ"} &nbsp;
            <button onClick={handleToggleDarkTheme}>テーマを切り替え</button>
          </div>
        </Box>
        <Box display="flex" flexGrow={1} />
        <Box display="flex" alignItems="center">
          {/* サーバーが処理中なら CircularProgress を表示 */}
          {isProcessing && (
            <Box marginLeft={2}>
              <CircularProgress size={24} />
            </Box>
          )}
          <ChatBox
            onNewCard={handleNewCardFromWS}
            onProcessingChange={(processing: boolean) => setIsProcessing(processing)}
            columns={columns}
            onSelectedSpeakerChange={onSelectedSpeakerChange} // 追加: 親コンポーネントに選択されたスピーカーを通知
          />
        </Box>
        <Box display="flex">
          <AddColumnButton onSubmit={onNewColumn} />
          &nbsp;
          <ClearBoardButton disabled={clearButtonDisabled} onClear={onClearBoard} />
          &nbsp;
          <RefreshColumnsButton />
          &nbsp;
          {/* テスト用のカード追加ボタン */}
          {onTestAddCard && (
            <>
              <TestAddCardButton onTestAddCard={onTestAddCard} />
            </>
          )}
          {/* <InfoButton /> */}
          &nbsp;
          <DarkThemeButton /> &nbsp;
          <LanguageButton /> 
          {/* <GitHubButton /> */}
        </Box>
      </MuiToolbar>
    </AppBar>
  );
};

export default Toolbar;
