# Easy Flow Common

BPM（EFGP）表單常用 function 集合。

## 使用方式

1. **只複製需要的 function** 貼到表單 JS，不用整份貼。
2. 貼之前先在表單內搜尋有沒有**同名 function**，避免重複定義（後定義的會蓋掉前面的）。
3. 有些 function 會呼叫其他 function 或需要引用外部 JS，貼的時候要一起帶上，見下方〈相依性〉。


## 相依性

複製下列 function 時，右邊的東西也要一起貼上或引用：

| Function | 還需要 |
|---|---|
| `checkRequired`、`resetCss` | 全域變數 `css`、`errorCss` |
| `gridSum` | `isRealNumber`、`numAdd` |
| `dateDiffDays` | `parseDate` |
| `queryBySql`、`queryBySqlId` | 引用 `ajax_DatabaseAccessor.js` |
| `isInGroup`、`getDeptManager` | `queryBySql`、`sqlEscape`、`ajax_DatabaseAccessor.js` |
| `callSapRfc` | 表單上要有對應的 Import / Export Grid，並在系統管理工具完成「SAP欄位整合設定」 |
| 開窗範例（`singleOpenWin`） | 引用 `EFGPShareMethod.js` |

外部 JS 引用方式（放在表單 JS 最上面，要用到才引用）：

```js
document.write('<script type="text/javascript" src="../../dwrDefault/interface/ajax_DatabaseAccessor.js"></script>'); //DB查詢
document.write('<script type="text/javascript" src="../../CustomJsLib/EFGPShareMethod.js"></script>');       //開窗 singleOpenWin
```

其他可引用的：`ajax_FormAccessor.js`、`ajax_OrgAccessor.js`、`ajax_ProcessAccessor.js`、`NumericUtil.js`，完整路徑見檔案第 0 節。

## 系統變數與表單事件

檔案第 0 節有速查表，常用的：

| 變數 | 說明 |
|---|---|
| `userId` / `userName` | 登入者帳號 / 姓名 |
| `mainOrgUnitIds` | 主部門代號 |
| `systemDateTime` | 系統日期 `yyyy/MM/dd` |
| `activityId` | 目前關卡代號，例如 `ACT1` |
| `processInstOID` | 流程 OID，空字串 = 新單 |
| `viewMode` | `'TRACE'` = 追蹤模式 |

表單事件：`formCreate()`（第一次開單）、`formOpen()`（每次開啟）、`formSave()`（`return false` 可擋下送出）、`formClose()`、`formDispatch()`。
元件事件命名為 `元件ID_事件名`，例如 `btnQuery_onclick()`、`grid_rowClick(pRow)`。

## Function 一覽

### 1. 欄位操作

| Function | 說明 |
|---|---|
| `setDisabled(pIds, pDisabled)` | 多個欄位一起停用 / 啟用 |
| `setReadOnly(pIds, pReadOnly)` | 多個欄位一起設唯讀（值會保留） |
| `clearValue(pIds, pValue)` | 多個欄位清空，或全部設成同一個值 |
| `lockFields(pLock, pFieldValues)` | 依條件鎖定欄位並帶預設值，條件不成立時解鎖 |
| `CheckRadio(RadioButtonId)` | 回傳 RadioButton / CheckBox 被勾選的數量 |
| `showIfNotEmpty(pId)` | 欄位有值才顯示（常用在錯誤訊息欄位） |

FormUtil 內建的 `getValue`、`setValue`、`hide`、`show`、`css` 用法也整理在這節的註解裡。

### 2. 必填檢查

| Function | 說明 |
|---|---|
| `checkRequired(pFields)` | 一次檢查多個必填欄位，沒填的變黃底紅字，回傳錯誤訊息 |
| `resetCss(pId)` | 欄位改值後恢復底色 |

```js
function formSave() {
  var tMsg = checkRequired([
    {id: "production_date_txt", label: "Production Date", cssId: "production_date"},
    {id: "category",            label: "Category"}
  ]);
  if (tMsg != "") { alert(tMsg); return false; }
  return true;
}
```

日期元件的值在 `xxx_txt`、上色要用 `xxx`，所以要另外給 `cssId`。

### 3. Grid 單身

Grid 物件名稱 = Grid 代號 + `Obj`（例如 `gridDetail` → `gridDetailObj`）。

| Function | 說明 |
|---|---|
| `reloadGridData(id)` | formOpen 時把隱藏欄位存的資料載回 Grid |
| `refreshGridItem(pGridId, pColumn)` | 重新編排項次 1, 2, 3… |
| `gridSum(pGridId, pColumn)` | 加總某欄位 |
| `gridDuplicate(pGridId, pColumn)` | 回傳重複值陣列，沒重複回傳 `[]` |
| `gridValueExists(pGridId, pColumn, pValue)` | 檢查某值是否已存在 |
| `gridRowColor(pGridId, pCondition, pColor)` | 依條件替資料列上色 |
| `mergeGridData(...)` | 用 key 比對兩個 Grid，把來源欄位寫回目標 Grid |

### 4. 數字運算

| Function | 說明 |
|---|---|
| `isRealNumber(val)` | 是否為有效數字 |
| `toNum(val)` | 轉數字，空值或非數字回傳 0 |
| `numAdd` / `numSub` / `numMulti` / `numDiv` | 加減乘除，避免浮點誤差 |
| `rounding(tValue, tDigits, tThousnds)` | 四捨五入，可加千分位 |

### 5. 日期

| Function | 說明 |
|---|---|
| `formatDate(pDate)` | Date → `yyyy/MM/dd` |
| `parseDate(pStr)` | `yyyy/MM/dd` → Date |
| `DateAdd(interval, number, date)` | 日期加減（`y` `q` `m` `w` `d` `h` `mm` `ss`） |
| `dateDiffDays(pStart, pEnd)` | 相差幾天（pEnd − pStart） |
| `toSapDate(pStr)` | `2026/09/15` → `20260915` |

### 6. 資料庫查詢

| Function | 說明 |
|---|---|
| `queryBySql(pDBId, pSql)` | 直接下 SQL，回傳二維陣列 |
| `queryBySqlId(pSqlId, pParams, pParamTypes)` | 使用 SQL 註冊器，參數型別 12 = 字串、4 = 整數、3 = 小數 |
| `sqlEscape(pValue)` | 跳脫單引號 |

兩個查詢都是**同步**執行，呼叫完下一行就能用結果。

### 7. 關卡 / 權限

| Function | 說明 |
|---|---|
| `isActivity(pActivityIds)` | 目前關卡是否在清單中 |
| `isNewForm()` | 是否為新單（還沒送出過） |
| `isInGroup(pGroupId)` | 登入者是否在某群組 |
| `getDeptManager(pOrgUnitId)` | 取部門主管帳號 |

### 8. 開窗

| Function | 說明 |
|---|---|
| `openDataWin(pData, pColumns, pOnSelect)` | 自訂資料開窗（單選），資料來源不是 DB 時用，例如 SAP 回傳的 Grid 資料 |

用 SQL 查詢的標準開窗（`singleOpenWin` + `checkPointOnClose`）範例在這節的註解裡。

### 9. Excel 匯入 / 匯出

| Function | 說明 |
|---|---|
| `transGridToArrayString(pGridId, pHdnGridId, pColumnIds)` | Grid 資料轉二維陣列字串存到隱藏欄位（匯出用） |

匯入（`btnImportExcel_onclick` + `loadExcelData`）與匯出（`btnExportExcel_onclick`）的完整範例在這節的註解裡。匯出需要表單上有隱藏欄位 `hdnGridData`、`hdnLabelName`、`hdnExportFileName`、`hdnRequest_SQL`。

### 10. 其他

| Function | 說明 |
|---|---|
| `openTraceForm(pFormId, pProcessInstOID)` | 開啟另一張表單的追蹤畫面 |
| `setGridButtonText(pGridId)` | Grid 按鈕文字改英文（Add / Edit / Delete） |

### 11. SAP RFC 呼叫

| Function | 說明 |
|---|---|
| `callSapRfc(pSapId, pImportGrids, pExportGridId)` | 呼叫 SAP RFC，回傳 Export Grid 資料；`null` = 找不到 Grid，`[]` = SAP 無資料 |

```js
var tPrice = callSapRfc("callZMM_GET_PRICE",
                        {"IT_MATERIAL": [{itemCode: "MAT0001", itemName: ""}]},
                        "ET_PRICE");
if (tPrice == null) { return; }
if (tPrice.length == 0) { alert("No data found in SAP."); return; }
```

前置設定（系統管理工具 →「SAP欄位整合設定」）、常見錯誤排除，以及「按鈕 → 呼叫 SAP → 開窗選擇 → 帶回欄位」的完整範例（含 `SAP_MOCK` 假資料測試）都在這節的註解裡。

## 注意事項

- **`disabled` vs `readOnly`**：disabled 的欄位在標準 HTML 送出時不會帶值，要保留值請用 `setReadOnly`。
- **`numSub` 回傳字串**（`toFixed` 的結果），要比大小請用 `Number()` 包起來。
- **`DateAdd` 會直接修改傳入的 Date 物件**，不想改到原本的日期請先複製：`DateAdd("d", 7, new Date(tDate))`。
- **SQL 注入**：`queryBySql` 用字串串接 SQL，串使用者輸入的值至少要用 `sqlEscape`，正式環境建議改用 `queryBySqlId`（SQL 註冊器）。
- **匯出 Excel 後要還原 `form.action`**，不然表單送出會出錯。
- **按鈕綁定事件**時 `onclick = 函式名` 後面不能加括號，不然開表單就會直接執行。
- `openDataWin` 使用 `flex`、`position: sticky` 等 CSS，舊版 IE 顯示可能跑版。
