function doGet() {
  return HtmlService.createTemplateFromFile('PlayUI')
    .evaluate()
    .setTitle('Football Game UI')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // optional
}
function onOpen() {
  SpreadsheetApp.getUi()
    .addItem("Open Play UI", "showPlayUI")
    .addToUi();
}

//INCLUDE HTML PARTS, EG. JAVASCRIPT, CSS, OTHER HTML FILES
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function showPlayUI() {
  const html = HtmlService.createHtmlOutputFromFile("PlayUI")
    .setWidth(400)
    .setHeight(400);
}

//********************** */
function getGameState(gameId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Games');
  if (!sheet) {
    throw new Error("Sheet 'Games' not found.");
  }
  Logger.log(gameId);
  const data = sheet.getDataRange().getValues(); // includes header
  const headers = data[0];
  // GameId values coming from the sheet can be either numbers or strings.
  // Ensure we compare them as strings so clicking a game card reliably
  // retrieves the corresponding row regardless of type coercion.
  const row = data
    .slice(1)
    .find(r => String(r[0]) === String(gameId));

  if (!row) {
    return null; // or throw new Error("No row found for gameId: " + gameId);
  }

  const result = {};
  headers.forEach((key, index) => {
    result[key] = row[index];
  });
  Logger.log(result);

  return result;
}

function getGamesList() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Games');
  if (!sheet) {
    throw new Error("Sheet 'Games' not found.");
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf('Id');
  const idxHome = headers.indexOf('Home');
  const idxAway = headers.indexOf('Away');
  const idxHomeScore = headers.indexOf('HomeScore');
  const idxAwayScore = headers.indexOf('AwayScore');
  const idxQtr = headers.indexOf('Qtr');
  const idxTime = headers.indexOf('Time');
  const idxDown = headers.indexOf('Down');
  const idxDistance = headers.indexOf('Distance');
  const idxBallOn = headers.indexOf('BallOn');
  const idxPoss = headers.indexOf('Possession');
  const idxHomeLogo = headers.indexOf('HomeLogo');
  const idxAwayLogo = headers.indexOf('AwayLogo');

  return data.slice(1).map(row => ({
    GameId: row[idxId],
    Home: row[idxHome],
    Away: row[idxAway],
    HomeScore: row[idxHomeScore],
    AwayScore: row[idxAwayScore],
    Qtr: row[idxQtr],
    Time: row[idxTime],
    Down: row[idxDown],
    Distance: row[idxDistance],
    BallOn: row[idxBallOn],
    Possession: row[idxPoss],
    HomeLogo: row[idxHomeLogo],
    AwayLogo: row[idxAwayLogo]
  }));
}

function getPlayerTraits() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Players");
  if (!sheet) {
    throw new Error("Sheet 'Players' not found.");
  }

  // Pull columns A through AG (0 - 32) to include DefPos
  const numCols = 33;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();
  Logger.log(data);
  const result = data
    .filter(row => row[0] != null && row[0] !== '') // Ensure 'team' field exists
    .map(row => ({
      team: row[0],
      name: row[1],
      position: row[2],
      offStars: row[3],
      defStars: row[4],
      size: row[5],
      strength: row[6],
      speed: row[7],
      stamina: row[8],
      poise: row[9],
      accuracy: row[10],
      armStrength: row[11],
      readDefense: row[12],
      juke: row[13],
      vision: row[14],
      acceleration: row[15],
      routeRunning: row[16],
      jump: row[17],
      hands: row[18],
      qbFavorite: row[19],
      runBlocking: row[20],
      passProtect: row[21],
      runStop: row[22],
      tackling: row[23],
      runDef: row[24],
      tackleChance: row[25],
      strip: row[26],
      passRush: row[27],
      sackChance: row[28],
      ballHawk: row[29],
      readQB: row[30],
      coverage: row[31],
      defPos: row[32],
      // Local tracking only
      carries: 0,
      fatigue: row[8]
    }));
  Logger.log(result);

  return result;
}

function getRunThresholdsFromSettings() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
  const data = sheet.getDataRange().getValues();
  const thresholds = [];
  let cumulative = 0;

  for (let i = 0; i < data.length; i++) {
    const [label, pct, minYards, maxYards] = data[i];
    if (!label.startsWith("RunType_")|| typeof pct !== "number" || pct <= 0) continue;
    thresholds.push({
      label,
      minYards,
      maxYards,
      rollMin: cumulative,
      rollMax: cumulative + pct
    });
    cumulative += pct;
  }
  return thresholds;
}

function getBreakawayYards() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
  const data = sheet.getDataRange().getValues();
  const breakRanges = data
    .filter(row => typeof row[0] === "string" && row[0].startsWith("Break_"))
    .map(row => ({
      label: row[0],
      percentage: parseFloat(row[1]),
      minYards: parseInt(row[2], 10),
      maxYards: parseInt(row[3], 10)
    }));
  return breakRanges;
}

function getStaminaDrains() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
  const data = sheet.getDataRange().getValues();

  const staminaDrainMap = {};

  data.forEach(row => {
    const key = row[0];
    const drain = parseFloat(row[1]);
    const playType = row[2];

    if (key && typeof key === "string" && key.startsWith("Stamina_Drain_") && playType) {
      staminaDrainMap[playType] = drain;
    }
  });

  return staminaDrainMap;
}

function getTackleDistributions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");
  const data = sheet.getDataRange().getValues();

  return data
    .filter(row => typeof row[0] === "string" && row[0].startsWith("Tackle_"))
    .map(row => ({
      label: row[0],
      yardageCap: Number(row[1]),
      DL: Number(row[2]) || 0,
      LB: Number(row[3]) || 0,
      DBS: Number(row[4]) || 0
    }))
    .sort((a, b) => a.yardageCap - b.yardageCap);
}

function getFrontendSettings() {
  return {
    thresholds: getRunThresholdsFromSettings(),
    breakaways: getBreakawayYards(),
    staminaDrains: getStaminaDrains(),
    tackleTable: getTackleDistributions()
  };
}
function predictPlayType(down, distance) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PlayHistory");
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return "Run";

  const filtered = data.slice(1)
    .filter(row => {
      const d = parseInt(row[1], 10);
      const dist = parseInt(row[2], 10);
      return d === down && Math.abs(dist - distance) <= 2;
    });

  if (filtered.length === 0) return "Run";

  const runCount = filtered.filter(r => r[3] === "Run").length;
  const pctRun = runCount / filtered.length;

  return Math.random() < pctRun ? "Run" : "Pass";
}
function logPlayHistory(play) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PlayHistory");
  if (!sheet) {
    Logger.log("Sheet 'PlayHistory' not found.");
    return;
  }

  const {
    gameid,
    timestamp,  // ✅ use this
    qtr,
    time,
    possession,
    down,
    distance,
    ballon,
    playtype,
    player,
    yards,
    defensepredicted,
    predictioncorrect,
    tackler,
    result,
    desc,
    newdown,
    newdist,
    newballon,
    drivestart,
    homescore,
    awayscore
  } = play;

  // Convert ISO string to Date object if needed
  const ts = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  sheet.appendRow([
    String(gameid || ""),
    ts,
    Number(qtr) || 0,
    Number(time) || 0,
    String(possession || ""),
    Number(down) || 0,
    Number(distance) || 0,
    Number(ballon) || 0,
    String(playtype || ""),
    String(player || ""),
    Number(yards) || 0,
    String(defensepredicted || ""),
    predictioncorrect === true || predictioncorrect === "true" ? true : false,
    String(tackler || ""),
    String(result || ""),
    String(desc || ""),
    Number(newdown) || 0,
    Number(newdist) || 0,
    Number(newballon) || 0,
    Number(drivestart) || 0,
    Number(homescore) || 0,
    Number(awayscore) || 0
  ]);
}

function getPlayHistory(gameId) {
  Logger.log(gameId);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PlayHistory");
  if (!sheet) {
    throw new Error("Sheet 'PlayHistory' not found.");
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // no data

  const headers = data[0];
  const rows = data.slice(1);
  const timezone = Session.getScriptTimeZone();

  const result = rows
    .filter(row => row[0] == gameId) // column A = GameId
    .map(row => {
      const obj = {};
      headers.forEach((key, i) => {
        if (key === "Timestamp" && row[i] instanceof Date) {
          obj[key] = Utilities.formatDate(row[i], timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
        } else {
          obj[key] = row[i];
        }
      });
      if (obj.newballon !== undefined && obj.NewBallOn === undefined) {
        obj.NewBallOn = obj.newballon;
        delete obj.newballon;
      }
      if (obj.quarter !== undefined && obj.Qtr === undefined) {
        obj.Qtr = obj.quarter;
        delete obj.quarter;
      }
      if (obj.homescore !== undefined && obj.HomeScore === undefined) {
        obj.HomeScore = obj.homescore;
        delete obj.homescore;
      }
      if (obj.awayscore !== undefined && obj.AwayScore === undefined) {
        obj.AwayScore = obj.awayscore;
        delete obj.awayscore;
      }
      return obj;
    });

  Logger.log(result[0]);
  return result;
}




//JS function calls

function switchPossession(fromTurnover = false) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("GameState");
  const state = getGameState("3");
  const newPossession = (state.possession === "Home") ? "Away" : "Home";

  const newBallOn = fromTurnover ? state.ballOn : 25;
  sheet.getRange("A2:B5").getValues().forEach((row, i) => {
    const key = row[0];
    if (key === "Possession") sheet.getRange(i + 2, 2).setValue(newPossession);
    if (key === "BallOn") sheet.getRange(i + 2, 2).setValue(newBallOn);
    if (key === "Down") sheet.getRange(i + 2, 2).setValue(1);
    if (key === "Distance") sheet.getRange(i + 2, 2).setValue(10);
  });
}

function pushGameState({ gameId, quarter, time, down, distance, ballOn, homeScore, awayScore, driveStart, previous, possession }) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Games');
  if (!sheet) {
    throw new Error("Sheet 'Games' not found.");
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rowIndex = data.slice(1).findIndex(r => r[0] === gameId);
  if (rowIndex === -1) {
    throw new Error("No row found for gameId: " + gameId);
  }

  const rowNumber = rowIndex + 2;
  const updates = {
    Qtr: quarter,
    Time: time,
    Down: down,
    Distance: distance,
    BallOn: ballOn,
    HomeScore: homeScore,
    AwayScore: awayScore,
    DriveStart: driveStart,
    Previous: previous,
    Possession: possession
  };

  Object.keys(updates).forEach(key => {
    const col = headers.indexOf(key);
    if (col !== -1) {
      sheet.getRange(rowNumber, col + 1).setValue(updates[key]);
    }
  });
}

function logPlayResult({ player, playType, yards, down, distance, ballOn }) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PlayHistory");
  const ts = new Date();
  sheet.appendRow([ts, down, distance, playType, player, yards]);

  const gameSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("GameState");
  const keys = ["Down", "Distance", "BallOn", "Previous"];
  const values = [down, distance, ballOn, ballOn];

  keys.forEach((k, i) => {
    const row = gameSheet.getRange("A2:A7").getValues().findIndex(r => r[0] === k);
    if (row >= 0) gameSheet.getRange(row + 2, 2).setValue(values[i]);
  });
}




function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function average(a, b) {
  return (a + b) / 2;
}
