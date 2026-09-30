/****************************************************************************************
 * BPM (EFGP) 表單常用 function
 *
 * 使用方式：
 *   把需要的 function 複製貼到表單 JS 裡（不用整份貼）。
 *   貼之前先搜尋表單內有沒有同名 function，避免重複定義。
 *
 * 目錄：
 *   0. 引用外部JS / 系統變數速查
 *   1. 欄位操作（停用、唯讀、清空、顯示隱藏）
 *   2. 必填檢查
 *   3. Grid 單身
 *   4. 數字運算（避免浮點誤差）
 *   5. 日期
 *   6. 資料庫查詢
 *   7. 關卡 / 權限
 *   8. 開窗
 *   9. Excel 匯入 / 匯出
 *  10. 其他
 *  11. SAP RFC 呼叫
 ****************************************************************************************/


//==================================== 0. 引用外部JS / 系統變數速查 ====================================//

/*
 * 放在表單 JS 最上面，要用到才引用
 *
document.write('<script type="text/javascript" src="../../dwrDefault/interface/ajax_DatabaseAccessor.js"></script>'); //DB查詢
document.write('<script type="text/javascript" src="../../dwrDefault/interface/ajax_FormAccessor.js"></script>');
document.write('<script type="text/javascript" src="../../dwrDefault/interface/ajax_OrgAccessor.js"></script>');
document.write('<script type="text/javascript" src="../../dwrDefault/interface/ajax_ProcessAccessor.js"></script>');
document.write('<script type="text/javascript" src="../../CustomJsLib/EFGPShareMethod.js"></script>');       //開窗 singleOpenWin
document.write('<script type="text/javascript" src="../../CustomJsLib/NumericUtil.js"></script>');
 */

/*
 * 系統變數（表單內可直接使用）
 *   userId            登入者帳號
 *   userName          登入者姓名
 *   mainOrgId         主要組織代號
 *   mainOrgName       主要組織名稱（公司）
 *   mainOrgUnitIds    主部門代號
 *   mainOrgUnitNames  主部門名稱
 *   mainFunctionName  職稱
 *   systemDateTime    系統日期 (yyyy/MM/dd)
 *   activityId        目前關卡代號，例如 'ACT1'、'UserTask_77'
 *   processInstOID    流程OID，空字串 = 還沒送出過的新單
 *   serialNumber      流程序號
 *   viewMode          'TRACE' = 追蹤模式
 *   formMode          'isPrintForm' = 列印模式
 *
 * 表單事件
 *   formCreate()    第一次開單（填單）
 *   formOpen()      每次開啟表單（含簽核、追蹤）
 *   formSave()      儲存/送出前，return false 可擋下
 *   formClose()     關閉
 *   formDispatch()  派送
 *
 * 元件事件命名：元件ID_事件名，例如 btnQuery_onclick()、CMMark_onchange()、grid_rowClick(pRow)
 */


//==================================== 1. 欄位操作 ====================================//

/*
 * 取值 / 設值（FormUtil 內建）
 *   FormUtil.getValue("欄位ID")[0]          //回傳陣列，取第一個；RadioButton / CheckBox 也用這個
 *   FormUtil.setValue("欄位ID", ["值"]);
 *
 * 顯示 / 隱藏（FormUtil 內建，會連標籤一起處理）
 *   FormUtil.hide(["欄位ID1", "欄位ID2"]);
 *   FormUtil.show(["欄位ID1", "欄位ID2"]);
 *
 * 樣式
 *   FormUtil.css(["欄位ID"], {"background-color": "yellow", "color": "red"});
 *
 * RadioButton 單一選項：document.getElementById("rdoType_0").checked  (_0、_1、_2 依選項順序)
 */

//多個欄位一起停用/啟用
//例：setDisabled(["mNo", "unit", "batchNo"], true);
//注意：disabled 的欄位在標準 HTML 送出時不會帶值，若要保留值請改用 setReadOnly
function setDisabled(pIds, pDisabled) {
  for (var i = 0; i < pIds.length; i++) {
    var tObj = document.getElementById(pIds[i]);
    if (tObj) {
      tObj.disabled = pDisabled;
    }
  }
}

//多個欄位一起設唯讀（看得到、不能改、值會保留）
//例：setReadOnly(["mNo", "unit"], true);
function setReadOnly(pIds, pReadOnly) {
  for (var i = 0; i < pIds.length; i++) {
    var tObj = document.getElementById(pIds[i]);
    if (tObj) {
      tObj.readOnly = pReadOnly;
    }
  }
}

//多個欄位一起清空，或設成同一個值
//例：clearValue(["mNo", "batchNo"]);      清空
//例：clearValue(["mNo", "batchNo"], "0"); 全部設成 0
function clearValue(pIds, pValue) {
  var tValue = (pValue == undefined) ? "" : pValue;
  for (var i = 0; i < pIds.length; i++) {
    var tObj = document.getElementById(pIds[i]);
    if (tObj) {
      tObj.value = tValue;
    }
  }
}

//依條件鎖定欄位並帶預設值，條件不成立時解鎖
//例：下拉選單 CMMark 為 3 時，鎖住並帶預設值
//  function CMMark_onchange(){
//    lockFields(CMMark.value == '3', {"mNo": "0", "unit": "MIN", "storageLocation": "0"});
//  }
function lockFields(pLock, pFieldValues) {
  for (var tId in pFieldValues) {
    var tObj = document.getElementById(tId);
    if (!tObj) {
      continue;
    }
    if (pLock) {
      tObj.value = pFieldValues[tId];
    }
    tObj.disabled = pLock;
  }
}

//檢查 RadioButton / CheckBox 有幾個被勾選，0 = 都沒選
//例：if (CheckRadio("rdoPRType") == 0) { alert("請先選擇請購類型!!"); }
function CheckRadio(RadioButtonId) {
  var tRadioButton = document.getElementsByName(RadioButtonId);
  var count = 0;
  for (var i = 0; i < tRadioButton.length; i++) {
    if (tRadioButton[i].checked == true) {
      count = count + 1;
    }
  }
  return count;
}

//依值有沒有內容顯示/隱藏欄位（常用在錯誤訊息欄位）
//例：showIfNotEmpty("txaExcelError");
function showIfNotEmpty(pId) {
  var tObj = document.getElementById(pId);
  if (tObj.value != "") {
    tObj.style.display = "";
  } else {
    tObj.style.display = "none";
  }
}


//==================================== 2. 必填檢查 ====================================//

var css = {
  "background-color" : "white",
  "color" : "black"
};
var errorCss = {
  "background-color" : "yellow",
  "color" : "red"
};

//一次檢查多個必填欄位，沒填的變黃底紅字，有填的恢復白底，回傳錯誤訊息
//id    : 要檢查值的欄位ID
//label : 錯誤訊息顯示的名稱
//cssId : (選填) 要上色的元件ID，日期元件的值在 xxx_txt、上色要用 xxx 時使用
//
//例：
//  function formSave(){
//    var tMsg = checkRequired([
//      {id: "production_date_txt", label: "Production Date", cssId: "production_date"},
//      {id: "category",            label: "Category"},
//      {id: "businessDesc",        label: "Business Description"}
//    ]);
//    if (tMsg != "") { alert(tMsg); return false; }
//    return true;
//  }
function checkRequired(pFields) {
  var tMsg = "";
  var tErrNodes = [];
  var tOkNodes = [];
  for (var i = 0; i < pFields.length; i++) {
    var tField = pFields[i];
    var tCssId = tField.cssId ? tField.cssId : tField.id;
    var tObj = document.getElementById(tField.id);
    if (tObj && tObj.value == "") {
      tMsg += "未填寫" + tField.label + "\n";
      tErrNodes.push(tCssId);
    } else {
      tOkNodes.push(tCssId);
    }
  }
  FormUtil.css(tOkNodes, css);
  FormUtil.css(tErrNodes, errorCss);
  return tMsg;
}

//欄位改值後把錯誤底色恢復
//例：function category_onchange(){ resetCss("category"); }
function resetCss(pId) {
  FormUtil.css([pId], css);
}


//==================================== 3. Grid 單身 ====================================//

/*
 * Grid 物件名稱 = Grid代號 + "Obj"，例如 Grid代號 gridMM020 → gridMM020Obj
 *
 *   gridObj.addRow();              新增一筆（把繫結欄位的值加進 Grid）
 *   gridObj.editRow();             修改選取的那筆
 *   gridObj.deleteRow();           刪除選取的那筆
 *   gridObj.clearBinding();        清空繫結欄位
 *   gridObj.getData();             取全部資料，回傳 [{欄位代號: 值}, ...]
 *   gridObj.reload(tData);         用陣列重新載入，reload([]) = 清空
 *   gridObj.getRowIndex();         目前選取第幾筆（從 0 開始）
 *   gridObj.hideColumn(["欄位"]);  隱藏欄位，hideColumn([]) = 全部顯示
 *   gridObj.showColumn(["欄位"]);
 *   gridObj.setRowCssStyle(i, {"background-color": "#FFFF33"});  某一列上色
 *   gridObj.hide(); / gridObj.show();
 *
 * 頁籤
 *   SubTab1Obj.hide("SubTab1_0");  SubTab1Obj.show("SubTab1_0");  SubTab1Obj.setSelected("SubTab1_0");
 *
 * 標準新增/修改/刪除按鈕寫法見 FormTemplate.js
 */

//formOpen 時把隱藏欄位存的 Grid 資料載回 Grid
//例：reloadGridData('gridMM020');
function reloadGridData(id) {
  var hdnGridData = document.getElementById(id).value;
  if (hdnGridData != "") {
    hdnGridData = eval(hdnGridData);
    eval(id + "Obj").reload(hdnGridData);
  }
}

//重新編排項次 1,2,3...（刪除資料後常用）
//例：refreshGridItem("gridMM020", "serialNo");
function refreshGridItem(pGridId, pColumn) {
  var pGridData = eval(pGridId + "Obj").getData();
  for (var r = 0; r < pGridData.length; r++) {
    pGridData[r][pColumn] = (r + 1);
  }
  eval(pGridId + "Obj").reload(pGridData);
}

//加總 Grid 某個欄位
//例：orderAmount.value = gridSum("detail", "G19");
function gridSum(pGridId, pColumn) {
  var tData = eval(pGridId + "Obj").getData();
  var tTotal = 0;
  for (var i = 0; i < tData.length; i++) {
    if (isRealNumber(tData[i][pColumn])) {
      tTotal = numAdd(tTotal, tData[i][pColumn]);
    }
  }
  return tTotal;
}

//檢查 Grid 某個欄位有沒有重複值，回傳重複的值陣列，沒重複回傳 []
//例：var tDup = gridDuplicate("gridMM020", "MATNR");
//    if (tDup.length > 0) { tMsg += "料號重複：" + tDup.join(",") + "\n"; }
function gridDuplicate(pGridId, pColumn) {
  var tData = eval(pGridId + "Obj").getData();
  var tSeen = {};
  var tDup = [];
  for (var i = 0; i < tData.length; i++) {
    var tValue = tData[i][pColumn];
    if (tSeen[tValue] && tDup.indexOf(tValue) == -1) {
      tDup.push(tValue);
    }
    tSeen[tValue] = true;
  }
  return tDup;
}

//Grid 新增前檢查某欄位值是否已存在（例如同料號不能加兩次）
//例：
//  function grid_add_onclick(){
//    if (gridValueExists("grid", "mNo", mNo.value)) { alert("料號已存在"); return false; }
//    gridObj.addRow(); gridObj.clearBinding(); return true;
//  }
function gridValueExists(pGridId, pColumn, pValue) {
  var tData = eval(pGridId + "Obj").getData();
  for (var i = 0; i < tData.length; i++) {
    if (tData[i][pColumn] == pValue) {
      return true;
    }
  }
  return false;
}

//Grid 資料依條件上色
//例：收貨數量為空或 0 的列變黃色
//  gridRowColor("gridMM020", function(row){ return row.MENGE1 == '' || row.MENGE1 == '0'; }, "#FFFF33");
function gridRowColor(pGridId, pCondition, pColor) {
  var tGridObj = eval(pGridId + "Obj");
  var tData = tGridObj.getData();
  for (var i = 0; i < tData.length; i++) {
    if (pCondition(tData[i])) {
      tGridObj.setRowCssStyle(i, {"background-color": pColor});
    }
  }
}

//用 key 比對兩個 Grid，把來源 Grid 的欄位寫回目標 Grid
//mergeFieldObj 格式：{'目標欄位': '來源欄位'}
//例：mergeGridData("gridMM020", "MATNR", "IT_OUTPUT", "MATNR", {'EBELN': 'EBELN', 'EBELP': 'EBELP'});
function mergeGridData(targetGridId, targetGridField, sourceGridId, sourceGridIdField, mergeFieldObj) {
  var targetGridData = eval(targetGridId + "Obj").getData();
  var sourceGridData = eval(sourceGridId + "Obj").getData();
  if (targetGridData.length > 0 && sourceGridData.length > 0) {
    for (var t = 0; t < targetGridData.length; t++) {
      var targetRow = targetGridData[t];
      for (var s = 0; s < sourceGridData.length; s++) {
        var sourceRow = sourceGridData[s];
        if (targetRow[targetGridField] == sourceRow[sourceGridIdField]) {
          for (var key in mergeFieldObj) {
            targetRow[key] = sourceRow[mergeFieldObj[key]];
          }
          break;
        }
      }
    }
    eval(targetGridId + "Obj").reload(targetGridData);
  }
}

//點選 Grid 某一列時取得該列資料
//函式名稱要改成 Grid代號_rowClick
//  function grid_rowClick(pRow){
//    var tIndex = gridObj.getRowIndex();
//    var tRow = gridObj.getData()[tIndex];
//    console.log(tRow["mNo"]);
//  }


//==================================== 4. 數字運算 ====================================//

//判斷是否為有效數字
//例：isRealNumber("12.5") → true；isRealNumber("abc") → false
function isRealNumber(val) {
  return !isNaN(parseFloat(val)) && isFinite(val);
}

//轉數字，空值或非數字回傳 0
//例：var qty = toNum(tgrid[i].G4);
function toNum(val) {
  var tNum = parseFloat(val);
  return isNaN(tNum) ? 0 : tNum;
}

//加法（避免 0.1 + 0.2 = 0.30000000000000004）
function numAdd(num1, num2) {
  var baseNum, baseNum1, baseNum2;
  try { baseNum1 = num1.toString().split(".")[1].length; } catch (e) { baseNum1 = 0; }
  try { baseNum2 = num2.toString().split(".")[1].length; } catch (e) { baseNum2 = 0; }
  baseNum = Math.pow(10, Math.max(baseNum1, baseNum2));
  return (num1 * baseNum + num2 * baseNum) / baseNum;
}

//減法，注意回傳的是字串（toFixed），要比大小可以用 Number() 包起來
function numSub(num1, num2) {
  var baseNum, baseNum1, baseNum2, precision;
  try { baseNum1 = num1.toString().split(".")[1].length; } catch (e) { baseNum1 = 0; }
  try { baseNum2 = num2.toString().split(".")[1].length; } catch (e) { baseNum2 = 0; }
  baseNum = Math.pow(10, Math.max(baseNum1, baseNum2));
  precision = (baseNum1 >= baseNum2) ? baseNum1 : baseNum2;
  return ((num1 * baseNum - num2 * baseNum) / baseNum).toFixed(precision);
}

//乘法
function numMulti(num1, num2) {
  var baseNum = 0;
  try { baseNum += num1.toString().split(".")[1].length; } catch (e) {}
  try { baseNum += num2.toString().split(".")[1].length; } catch (e) {}
  return Number(num1.toString().replace(".", "")) * Number(num2.toString().replace(".", "")) / Math.pow(10, baseNum);
}

//除法
function numDiv(num1, num2) {
  var baseNum1 = 0, baseNum2 = 0;
  try { baseNum1 = num1.toString().split(".")[1].length; } catch (e) { baseNum1 = 0; }
  try { baseNum2 = num2.toString().split(".")[1].length; } catch (e) { baseNum2 = 0; }
  var baseNum3 = Number(num1.toString().replace(".", ""));
  var baseNum4 = Number(num2.toString().replace(".", ""));
  return (baseNum3 / baseNum4) * Math.pow(10, baseNum2 - baseNum1);
}

//四捨五入 + 千分位
//tDigits  : 小數第幾位，負值 = 小數點前第幾位
//tThousnds: true 加千分位
//例：rounding(1234.567, 2, true) → "1,234.57"
function rounding(tValue, tDigits, tThousnds) {
  var tAbsDigits = Math.abs(tDigits);
  var tDeci = Math.pow(10, tAbsDigits);
  var tReturnValue;
  if (tDigits >= 0) {
    tReturnValue = Math.round(tValue * tDeci) / tDeci;
  } else {
    tReturnValue = Math.round(tValue / tDeci) * tDeci;
  }
  if (tThousnds) {
    tReturnValue += "";
    var arr = tReturnValue.split(".");
    var re = /(\d{1,3})(?=(\d{3})+$)/g;
    return arr[0].replace(re, "$1,") + (arr.length == 2 ? "." + arr[1] : "");
  } else {
    return tReturnValue;
  }
}


//==================================== 5. 日期 ====================================//

//Date 物件轉字串 yyyy/MM/dd
//例：formatDate(new Date()) → "2026/09/15"
function formatDate(pDate) {
  var tMonth = pDate.getMonth() + 1;
  var tDay = pDate.getDate();
  if (tMonth < 10) { tMonth = "0" + tMonth; }
  if (tDay < 10) { tDay = "0" + tDay; }
  return pDate.getFullYear() + "/" + tMonth + "/" + tDay;
}

//字串 yyyy/MM/dd 轉 Date 物件
//例：var d = parseDate(production_date_txt.value);
function parseDate(pStr) {
  var tArr = pStr.split("/");
  return new Date(tArr[0], tArr[1] - 1, tArr[2]);
}

//日期加減
//interval：y 年、q 季、m 月、w 週、d 天、h 時、mm 分、ss 秒
//例：formatDate(DateAdd("d", 7, new Date()))  → 7 天後
function DateAdd(interval, number, date) {
  switch (interval) {
    case "y":  date.setFullYear(date.getFullYear() + number); break;
    case "q":  date.setMonth(date.getMonth() + number * 3);   break;
    case "m":  date.setMonth(date.getMonth() + number);       break;
    case "w":  date.setDate(date.getDate() + number * 7);     break;
    case "h":  date.setHours(date.getHours() + number);       break;
    case "mm": date.setMinutes(date.getMinutes() + number);   break;
    case "ss": date.setSeconds(date.getSeconds() + number);   break;
    default:   date.setDate(date.getDate() + number);         break;
  }
  return date;
}

//兩個日期相差幾天（pEnd - pStart），參數為 yyyy/MM/dd 字串
//例：if (dateDiffDays(startDate.value, endDate.value) < 0) { alert("結束日不可早於開始日"); }
function dateDiffDays(pStart, pEnd) {
  return Math.round((parseDate(pEnd) - parseDate(pStart)) / 86400000);
}

//日期去掉斜線，給 SAP 用
//例：toSapDate("2026/09/15") → "20260915"
function toSapDate(pStr) {
  return pStr.replace(/\//g, "");
}


//==================================== 6. 資料庫查詢 ====================================//
//需引用 ajax_DatabaseAccessor.js

//直接下 SQL，回傳二維陣列 [[欄1, 欄2], ...]，查無資料回傳 []
//pDBId：系統管理工具的資料來源代號，例如 'EFGP'、'HCP'
//例：
//  var tRows = queryBySql('EFGP', "select id, userName from Users where id = '" + userId + "'");
//  if (tRows.length > 0) { txtApplierName.value = tRows[0][1]; }
//注意：SQL 用字串串接使用者輸入的值有被注入的風險，正式環境建議改用 SQL 註冊器（queryBySqlId）
function queryBySql(pDBId, pSql) {
  var tResult = [];
  DWREngine.setAsync(false); //關閉非同步
  ajax_DatabaseAccessor.executeQuery(pDBId, pSql, null, null, function (data) {
    if (data.recordValues.length > 0) {
      tResult = data.recordValues;
    }
  });
  DWREngine.setAsync(true);  //開啟非同步
  return tResult;
}

//使用 SQL 註冊器，SQL 裡用 ? 當參數
//pParamTypes：12 = 字串(VARCHAR)、4 = 整數、3 = 小數
//例：var tRows = queryBySqlId("zCheckMATNR", [tStore, tMATNR], [12, 12]);
function queryBySqlId(pSqlId, pParams, pParamTypes) {
  var tResult = [];
  DWREngine.setAsync(false);
  ajax_DatabaseAccessor.query(pSqlId, pParams, pParamTypes, function (pData) {
    if (pData.recordValues.length > 0) {
      tResult = pData.recordValues;
    }
  });
  DWREngine.setAsync(true);
  return tResult;
}

//SQL 字串值跳脫單引號，串接 SQL 時至少要做
//例："where name = '" + sqlEscape(txtName.value) + "'"
function sqlEscape(pValue) {
  return String(pValue).replace(/'/g, "''");
}


//==================================== 7. 關卡 / 權限 ====================================//

//目前關卡是否在清單中
//例：if (isActivity(["ACT2", "UserTask_77"])) { FormUtil.show(["btnQuery"]); }
function isActivity(pActivityIds) {
  return pActivityIds.indexOf(activityId) > -1;
}

//是否為新單（還沒送出過）
function isNewForm() {
  return processInstOID == "";
}

//登入者是否在某個群組
//例：if (userId == 'administrator' || isInGroup('A01')) { SubTab32Obj.show(); }
function isInGroup(pGroupId) {
  var tSql = "select A.id from Users A " +
             " inner join Group_User B on A.OID = B.UserOID " +
             " inner join Groups C on B.GroupOID = C.OID " +
             " where C.id = '" + sqlEscape(pGroupId) + "' and A.id = '" + sqlEscape(userId) + "' ";
  return queryBySql('EFGP', tSql).length > 0;
}

//取某部門的主管帳號
//例：hdnManager.value = getDeptManager(mainOrgUnitIds);
function getDeptManager(pOrgUnitId) {
  var tSql = "select U.id from OrganizationUnit OU " +
             " inner join Users U on OU.managerOID = U.OID " +
             " where OU.id = '" + sqlEscape(pOrgUnitId) + "' ";
  var tRows = queryBySql('EFGP', tSql);
  return tRows.length > 0 ? tRows[0][0] : "";
}


//==================================== 8. 開窗 ====================================//
//需引用 EFGPShareMethod.js

/*
 * 開窗查詢範例
 *
function btnQuery_onclick() {
  var FileName = "SingleOpenWin";      //單選：SingleOpenWin；多選：PluralityOpenWin
  var tDBId = "EFGP";
  var tSql = "select id, userName from Users where leaveDate is null ";
  var SQLClaused = new Array(tSql);
  var SQLLabel = new Array("帳號", "姓名");            //開窗 Grid 顯示的欄位名稱
  var QBEField = new Array("id", "userName");          //可模糊查詢的欄位，要和 DB 欄位名稱相同
  var QBELabel = new Array("帳號", "姓名");            //模糊查詢的標籤
  var ReturnId = new Array("hdnResult");               //選完的結果放到哪個欄位
  singleOpenWin(FileName, tDBId, SQLClaused, SQLLabel, QBEField, QBELabel, ReturnId, 650, 500);
}

//開窗關閉後會自動呼叫
function checkPointOnClose(pReturnId) {
  if (pReturnId == "hdnResult") {
    var tData = eval(document.getElementById("hdnResult").value);
    //單選：tData[0][1] = 第一個欄位（index 0 是序號，資料從 1 開始）
    //多選：跑迴圈組成 Grid 資料後 reload
    var tJSONArray = [];
    for (var i = 0; i < tData.length; i++) {
      tJSONArray.push({
        'serialNo': (i + 1) + "",
        'userId': tData[i][1],
        'userName': tData[i][2]
      });
    }
    gridObj.reload(tJSONArray);
  }
}
 */

//自訂資料開窗（單選）：資料不是查 DB 時用，例如 SAP RFC 回傳的 Grid 資料、JS 陣列
//singleOpenWin 只能下 SQL，資料來源是 SAP 或其他 JS 陣列時改用這個
//pData    : [{欄位: 值}, ...]
//pColumns : 開窗要顯示的欄位 [{field: '欄位', label: '標題'}, ...]
//pOnSelect: 點選某一列後執行 function(pRow)，pRow 為該列完整資料
//例：
//  openDataWin(TABLE_PRICEObj.getData(),
//    [{field: 'FLIEF', label: 'Vendor'}, {field: 'FLIEF_N', label: 'Vendor Name'}, {field: 'INTAXPR_1', label: 'Price'}],
//    function (pRow) {
//      document.getElementById("suppiler").value = pRow.FLIEF + "_" + pRow.FLIEF_N;
//      document.getElementById("PriceWithTax").value = pRow.INTAXPR_1;
//    });
function openDataWin(pData, pColumns, pOnSelect) {
  var tOld = document.getElementById("dataWinMask");
  if (tOld) {
    tOld.parentNode.removeChild(tOld);
  }

  var tMask = document.createElement("div");
  tMask.id = "dataWinMask";
  tMask.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,.4);z-index:9999;";
  var tBox = document.createElement("div");
  tBox.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:750px;max-height:500px;" +
                       "background:#fff;padding:10px;border-radius:4px;display:flex;flex-direction:column;";

  var tHtml = "<div style='margin-bottom:6px'>Search: <input id='dataWinQry' style='width:300px'>" +
              " <button type='button' id='dataWinClose' style='float:right'>Close</button></div>" +
              "<div style='overflow:auto;flex:1'><table border='1' style='border-collapse:collapse;width:100%;font-size:12px'><thead><tr>";
  for (var c = 0; c < pColumns.length; c++) {
    tHtml += "<th style='background:#ddd;position:sticky;top:0'>" + pColumns[c].label + "</th>";
  }
  tHtml += "</tr></thead><tbody></tbody></table></div>";
  tBox.innerHTML = tHtml;
  tMask.appendChild(tBox);
  document.body.appendChild(tMask);

  var tBody = tBox.getElementsByTagName("tbody")[0];
  function closeWin() {
    if (tMask.parentNode) {
      tMask.parentNode.removeChild(tMask);
    }
  }
  //依搜尋文字過濾（任一顯示欄位包含即可，不分大小寫）
  function render(pKeyword) {
    tBody.innerHTML = "";
    var tKeyword = (pKeyword || "").toLowerCase();
    for (var i = 0; i < pData.length; i++) {
      var tText = "";
      var tTr = document.createElement("tr");
      for (var c = 0; c < pColumns.length; c++) {
        var tValue = pData[i][pColumns[c].field] == null ? "" : String(pData[i][pColumns[c].field]);
        tText += tValue.toLowerCase() + " ";
        var tTd = document.createElement("td");
        tTd.textContent = tValue;
        tTr.appendChild(tTd);
      }
      if (tKeyword && tText.indexOf(tKeyword) < 0) {
        continue;
      }
      tTr.style.cursor = "pointer";
      tTr.onmouseover = function () { this.style.background = "#ffffcc"; };
      tTr.onmouseout = function () { this.style.background = ""; };
      tTr.onclick = (function (pRow) {
        return function () {
          pOnSelect(pRow);
          closeWin();
        };
      })(pData[i]);
      tBody.appendChild(tTr);
    }
  }
  render("");
  document.getElementById("dataWinQry").onkeyup = function () { render(this.value); };
  document.getElementById("dataWinClose").onclick = closeWin;
}


//==================================== 9. Excel 匯入 / 匯出 ====================================//

/*
 * 匯入 Excel 範例
 *
function btnImportExcel_onclick() {
  var tFormGridName = "grid";                  //Grid 代號
  var tExcelFieldName = "料號,數量";            //Excel 第一列的欄位名稱，順序要一致
  var tUrl = encodeURI('/NaNaWeb/GP/WMS/PerformWorkItem/CallExcelImporter' +
                       '?hdnMethod=initExcelImporter&excelFieldName=' + tExcelFieldName +
                       '&formGridName=' + tFormGridName);
  openDialog(tUrl, '480', '380', 'titlebar,scrollbars,status,resizable');
}

//匯入完成後會自動呼叫，returnData 為二維陣列字串
function loadExcelData(formGridId, returnData) {
  var rDataArray = eval(returnData);
  var tMsg = "";
  var tJSONArray = [];
  for (var i = 0; i < rDataArray.length; i++) {
    if (rDataArray[i][0] == "") {
      tMsg += "第" + (i + 1) + "筆資料料號為空!!\n";
      continue;
    }
    if (!isRealNumber(rDataArray[i][1])) {
      tMsg += "第" + (i + 1) + "筆數量非數字!!\n";
      continue;
    }
    tJSONArray.push({
      'serialNo': (tJSONArray.length + 1) + "",
      'mNo': rDataArray[i][0].trim(),
      'qty': rDataArray[i][1]
    });
  }
  if (tMsg != "") { alert(tMsg); }
  eval(formGridId + "Obj").reload(tJSONArray);
}
 */

/*
 * 匯出 Excel 範例（需要表單上有隱藏欄位 hdnGridData、hdnLabelName、hdnExportFileName、hdnRequest_SQL）
 *
function btnExportExcel_onclick() {
  var tHeadColumn = '序號,料號,數量';                 //Excel 欄位名稱
  var tColumnIds = ['serialNo', 'mNo', 'qty'];        //對應的 Grid 欄位代號
  var tFileName = "匯出檔名";

  transGridToArrayString("grid", "hdnGridData", tColumnIds);
  document.getElementById("hdnLabelName").value = tHeadColumn;
  document.getElementById("hdnExportFileName").value = encodeURIComponent(tFileName);

  var tForm = document.forms[0];
  var tOriAction = tForm.action;
  tForm.action = "/zCustomExcelServlet/ExportExcelFileServlet.excel?hdnFunction=hdnGridData" +
                 "&hdnLabel=hdnLabelName&hdnFileName=hdnExportFileName&hdnSQL=hdnRequest_SQL";
  tForm.method = "post";
  tForm.submit();
  tForm.action = tOriAction;   //一定要還原，不然表單送出會出錯
}
 */

//Grid 資料轉成二維陣列字串存到隱藏欄位（匯出 Excel 用）
//欄位順序依 pColumnIds 的順序
//例：transGridToArrayString("grid", "hdnGridData", ['serialNo', 'mNo', 'qty']);
function transGridToArrayString(pGridId, pHdnGridId, pColumnIds) {
  var tGridData = eval(pGridId + "Obj").getData();
  var tRows = [];
  for (var i = 0; i < tGridData.length; i++) {
    var tCols = [];
    for (var j = 0; j < pColumnIds.length; j++) {
      var tValue = tGridData[i][pColumnIds[j]];
      tValue = (tValue == undefined) ? "" : String(tValue).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      tCols.push("'" + tValue + "'");
    }
    tRows.push("[" + tCols.join(",") + "]");
  }
  document.getElementById(pHdnGridId).value = "[" + tRows.join(",") + "]";
}


//==================================== 10. 其他 ====================================//

//開啟另一張表單的追蹤畫面
//例：openTraceForm("MM020", "流程OID");
function openTraceForm(pFormId, pProcessInstOID) {
  var tURL = "/NaNaWeb/GP/WMS/TraceProcess/TraceProcessForSearchForm?hdnMethod=searchSingleFormDetail" +
             "&hdnFormDefId=" + pFormId +
             "&hdnProcessInstOID=" + pProcessInstOID +
             "&hdnCurrentUserId=" + userId +
             "&hdnIsManager=true";
  window.open(tURL, "Form", "height=600,width=800");
}

//Grid 按鈕文字改英文（英國表單用）
//例：setGridButtonText("grid");
function setGridButtonText(pGridId) {
  document.getElementById(pGridId + "_add").innerText = 'Add';
  document.getElementById(pGridId + "_edit").innerText = 'Edit';
  document.getElementById(pGridId + "_delete").innerText = 'Delete';
}


//==================================== 11. SAP RFC 呼叫 ====================================//

/*
 * 前置設定（系統管理工具 →「SAP欄位整合設定」）
 *   整合設定代號：程式呼叫用的 ID，例如 callZMM_MATERIAL_PRICEANDLIFNR
 *   1.RFC        ：SAP Function 名稱，要和 SAP 完全一致（請 SAP 人員確認）
 *   2.連線主機   ：例如 SAPRFC
 *   3.表單名稱   ：要呼叫的表單，例如 UKPO001
 *   Import / Export：
 *     tableId  = 表單上的 Grid 代號（表單要有這個 Grid，可隱藏）
 *     SAP欄位  = RFC 參數欄位名稱，照規格書，拼錯會抓不到值
 *     表單欄位 = Grid 裡的欄位代號（程式 reload / getData 用這個名稱）
 *     固定值   = 每次都傳一樣的值（例如採購組織 5000），程式不用再給
 *
 * 呼叫方式：connectionToSap("整合設定代號");
 *   同步執行：呼叫前先把 Import Grid reload 好，呼叫完下一行就能 getData() 讀 Export Grid
 *
 * 常見錯誤
 *   Get SapFormMapping ID:xxx has error
 *     → 找不到整合設定代號：程式的代號和設定不一致（一個字都不能差），或設定的表單名稱不是這張表單
 *   xxxObj is not defined
 *     → 表單上沒有 tableId 那個 Grid
 *   Export Grid 沒資料
 *     → SAP 查無資料，或 SAP欄位名稱拼錯；RFC 有回傳 RTNCODE/MESSAGE 時建議也設定成 Export 以便顯示原因
 */

//呼叫 SAP RFC，回傳 Export Grid 資料 [{欄位: 值}, ...]
//pSapId        : 整合設定代號
//pImportGrids  : {Import Grid代號: [資料列]}，資料列的 key 用整合設定的「表單欄位」（固定值欄位不用給）
//pExportGridId : Export Grid代號
//回傳 null = 表單上找不到 Grid（會 alert）；[] = SAP 沒有回傳資料
//例：
//  var tPrice = callSapRfc("callZMM_MATERIAL_PRICEANDLIFNR",
//                          {"TABLE_MATERIAL": [{itemCode: "50MF100231", itemName: ""}]},
//                          "TABLE_PRICE");
//  if (tPrice == null) { return; }
//  if (tPrice.length == 0) { alert("No data found in SAP."); return; }
function callSapRfc(pSapId, pImportGrids, pExportGridId) {
  var tGridIds = [pExportGridId];
  for (var tGridId in pImportGrids) {
    tGridIds.push(tGridId);
  }
  for (var i = 0; i < tGridIds.length; i++) {
    try {
      eval(tGridIds[i] + "Obj");
    } catch (e) {
      alert("Grid " + tGridIds[i] + " not found on the form.");
      return null;
    }
  }

  for (var tGridId in pImportGrids) {
    eval(tGridId + "Obj").reload(pImportGrids[tGridId]);
  }
  eval(pExportGridId + "Obj").reload([]);   //清掉上次結果，避免 SAP 失敗時讀到舊資料
  connectionToSap(pSapId);
  return eval(pExportGridId + "Obj").getData();
}

/*
 * 完整範例：按下按鈕 → 呼叫 SAP → 開窗選擇 → 帶回欄位
 * （UKPO001 取得料號之價格及供應商，RFC 規格書：乾杯英國_EIP取得料號之價格及供應商RFC_功能規格書 v3.0）
 *
 * 還沒有 RFC 時把 SAP_MOCK 設 true，用假資料先測開窗與帶值；RFC 設定好後改 false
 *
var SAP_MOCK = false;

function Select_Suppiler_onclick() {
  var tMATNR = document.getElementById("itemCode").value.trim();
  if (tMATNR == "") {
    alert("Please enter Material No. first.");
    return;
  }

  var tPrice;
  if (SAP_MOCK) {
    tPrice = [
      {FLIEF: '0000100001', FLIEF_N: 'Mock Vendor A Ltd', INFNR: '5300000001', WAERS: 'GBP', INTAXPR_1: '14.40000'},
      {FLIEF: '0000100002', FLIEF_N: 'Mock Vendor B Ltd', INFNR: '5300000002', WAERS: 'GBP', INTAXPR_1: '11.50000'}
    ];
  } else {
    //EKORG / WERKS 在整合設定用固定值帶入，這裡只給料號
    tPrice = callSapRfc("callZMM_MATERIAL_PRICEANDLIFNR",
                        {"TABLE_MATERIAL": [{itemCode: tMATNR, itemName: ""}]},
                        "TABLE_PRICE");
    if (tPrice == null) {
      return;
    }
  }
  if (tPrice.length == 0) {
    alert("No price / vendor found in SAP for material " + tMATNR + ".");
    return;
  }

  openDataWin(tPrice,
    [
      {field: 'FLIEF',     label: 'Vendor'},
      {field: 'FLIEF_N',   label: 'Vendor Name'},
      {field: 'INFNR',     label: 'Info Record'},
      {field: 'WAERS',     label: 'Currency'},
      {field: 'INTAXPR_1', label: 'Unit Price (Tax Incl.)'}
    ],
    function (pRow) {
      document.getElementById("suppiler").value = pRow.FLIEF + "_" + pRow.FLIEF_N;
      document.getElementById("currency_2").value = pRow.WAERS;
      document.getElementById("PriceWithTax").value = pRow.INTAXPR_1;
    });
}

//按鈕綁定（formOpen 內），onclick 後面不能加括號，不然開表單就會直接執行
function formOpen() {
  var tBtn = document.getElementById("Select_Suppiler");
  if (tBtn) {
    tBtn.onclick = Select_Suppiler_onclick;
  }
  return true;
}
 */
