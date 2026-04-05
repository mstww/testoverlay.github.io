var regiao = null;
var idusuario = null;
var nmusuario = null;

function getFlexibleSearchParams() {
  var u = new URL(window.location.href);
  if (u.search && String(u.search).length > 1) {
    return u.searchParams;
  }
  var h = u.hash || "";
  var qi = h.indexOf("?");
  if (qi !== -1) {
    return new URLSearchParams(h.slice(qi + 1));
  }
  return u.searchParams;
}

function normalizeHenrikTier(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && !isNaN(raw)) return raw;
  if (typeof raw === "string") {
    var n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }
  if (typeof raw === "object") {
    var keys = ["tier", "current_tier", "currentTier", "id", "value"];
    for (var ki = 0; ki < keys.length; ki++) {
      var v = raw[keys[ki]];
      if (typeof v === "number" && !isNaN(v)) return v;
      if (typeof v === "string") {
        var n2 = parseInt(v, 10);
        if (!isNaN(n2)) return n2;
      }
    }
  }
  return null;
}

function rankImageStem(tier) {
  if (tier === "Unranked") return "Unranked";
  if (typeof tier === "number" && !isNaN(tier)) return String(tier);
  var n = normalizeHenrikTier(tier);
  if (n != null && !isNaN(n)) return String(n);
  return "Load";
}

function syncOverlayParamsFromUrl() {
  var p = getFlexibleSearchParams();
  function pick(keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = p.get(keys[i]);
      if (v != null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    return null;
  }
  regiao = pick(["regiao", "region"]);
  idusuario = pick(["idusuario", "id", "tag"]);
  nmusuario = pick(["nmusuario", "name", "nickname", "nick"]);
}

syncOverlayParamsFromUrl();

var _overlayQ = getFlexibleSearchParams();
var cor = _overlayQ.get("color");
var corfonte = _overlayQ.get("fontcolor");
var bgurl = _overlayQ.get("bu");
var icourl = _overlayQ.get("iu");
var retornostatus = {};
var dadosimportantesElo = {};
var dadosimportantesmmr = {};
var dadosimportantesultimojogo = {};
var dadosimportantesnickconta = {};
var leaderboardajustado = {};
var checkifnull = {};
var dadosimportantesTier = {};
var dadosisunranked = {};
var dadosleaderboard = {};
var cssbarradepts = document.querySelector(":root").style;
const bgpts = document.getElementById("ultmmr");
const corbg = document.getElementById("textonmrank");
var rankatuallog = {};
var rankatualizado = {};
var isunrankedatoatual = {};
var jogosnecessarios = {};
let puuid = {};
let partida1 = {};
let partida2 = {};
let jsonDataWL = {};
let reqpuuid = {};
let dadoswl = {};
let time = {};
let win = 0;
let lose = 0;
let empatou = {};
let semwc = _overlayQ.has("swl");
var valorantCurrentAct = null;
let content = {};
let parsedContent = {};
let matches = {};
let arrayMatches = [];
let novaArray = [];
let hsrateField = 0;
let bsrateField = 0;
let lsrateField = 0;
let kills = 0;
let deaths = 0;
let calcKD = 0;
let calcHS = 0;
let calcLS = 0;
let calcBS = 0;
let jsonUltimaPartida = {};
let novoObj = {};
let NovoobjID = {};
var matchIds = []

function henrikPathSeg(v) {
  return encodeURIComponent(v == null ? "" : String(v));
}

function fazGet(url) {
  var u = url == null ? "" : String(url).trim();
  if (!u || u.indexOf("http") !== 0) {
    return "";
  }
  if (
    u.indexOf("api.henrikdev.xyz") !== -1 &&
    /\/(mmr|v3\/matches|v1\/account)\/null(\/|\?|$)/.test(u)
  ) {
    return "";
  }
  let request = new XMLHttpRequest();
  request.open("GET", u, false);
  request.send();
  return request.responseText;
}

function seasonErrorMeansNoData(err) {
  if (err === true) return true;
  if (typeof err === "string" && err.toLowerCase().indexOf("no data") !== -1)
    return true;
  return false;
}

function leaderboard() {
  syncOverlayParamsFromUrl();
  if (regiao == null || nmusuario == null || idusuario == null) return;
  const reglow = String(regiao).toLowerCase();
  let lb = fazGet(
    "https://api.henrikdev.xyz/valorant/v1/leaderboard/" +
      reglow +
      "?name=" +
      henrikPathSeg(nmusuario) +
      "&tag=" +
      henrikPathSeg(idusuario)
  );
  try {
    if (!lb || String(lb).trim() === "") return;
    var jsonDataLB = JSON.parse(lb);
    if (
      jsonDataLB &&
      String(jsonDataLB.status) === "200" &&
      jsonDataLB.data &&
      jsonDataLB.data[0]
    ) {
      dadosleaderboard = jsonDataLB.data[0].leaderboardRank;
    }
  } catch (e) {}
}

function main() {
  syncOverlayParamsFromUrl();
  if (regiao == null || nmusuario == null || idusuario == null) {
    retornostatus = "0";
    return;
  }
  var regLow = String(regiao).toLowerCase();
  let dados = fazGet(
    "https://api.henrikdev.xyz/valorant/v2/mmr/" +
      regLow +
      "/" +
      henrikPathSeg(nmusuario) +
      "/" +
      henrikPathSeg(idusuario)
  );
  var jsonData;
  try {
    if (!dados || String(dados).trim() === "") return;
    jsonData = JSON.parse(dados);
  } catch (e) {
    return;
  }
  if (
    !jsonData ||
    String(jsonData.status) !== "200" ||
    !jsonData.data ||
    !jsonData.data.current_data
  ) {
    retornostatus =
      jsonData && jsonData.status != null ? jsonData.status : "0";
    return;
  }
  var seasonBlock =
    typeof readHenrikSeasonBlock === "function"
      ? readHenrikSeasonBlock(jsonData.data.by_season, valorantCurrentAct)
      : {
          number_of_games: 0,
          error: "No data Available",
        };
  isunrankedatoatual = seasonBlock.number_of_games;
  nodataseasonatual = seasonBlock.error;
  retornostatus = jsonData.status;
  var normTier = normalizeHenrikTier(jsonData.data.current_data.currenttier);
  checkifnull = normTier;
  dadosimportantesElo = jsonData.data.current_data.currenttierpatched;
  dadosimportantesmmr = jsonData.data.current_data.ranking_in_tier;
  dadosimportantesmmrtxt = jsonData.data.current_data.ranking_in_tier;
  dadosimportantesTier = normTier;
  retornostatus = jsonData.status;
  dadosimportantesultimojogo =
    jsonData.data.current_data.mmr_change_to_last_game;
  dadosimportantesnickconta = jsonData.data.name;
  jateverank = jsonData.data.current_data.old;
  jogosnecessarios = jsonData.data.current_data.games_needed_for_rating;
}

function foda() {
  var actGames = Number(isunrankedatoatual);
  if (isNaN(actGames)) actGames = 0;
  var needRatingFive =
    jogosnecessarios == "5" || jogosnecessarios === 5;
  var noCompTier =
    checkifnull == null || checkifnull === 0;
  var mayBePlacement = noCompTier || needRatingFive;
  if (
    mayBePlacement &&
    (actGames < 5 ||
      (seasonErrorMeansNoData(nodataseasonatual) && needRatingFive))
  ) {
    dadosimportantesElo = "Unranked";
    dadosimportantesmmr = "100";
    dadosimportantesultimojogo = "nRanked";
    dadosimportantesTier = "Unranked"
    dadosimportantesmmrtxt 
    if (seasonErrorMeansNoData(nodataseasonatual)) {
      isunrankedatoatual = 0;
    }
  }
  if (dadosimportantesmmr > "100") {
    dadosimportantesmmr = "0";
  }
  document.getElementById("imgRank").src =
    "./Resources/" + rankImageStem(dadosimportantesTier) + ".png";
  var atualporc = dadosimportantesmmr + "%";
  document.getElementById("headerburrao").innerHTML = dadosimportantesElo + '&nbsp &nbsp;' +dadosimportantesmmrtxt + "RR";
  if (dadosimportantesultimojogo === "nRanked"){
    document.getElementById("headerburrao").innerHTML =
      dadosimportantesElo;
  }
  if (dadosimportantesTier === 27) {
    leaderboard();
    document.getElementById("headerburrao").innerHTML =
      dadosimportantesElo + " #" + dadosleaderboard;
  }
  document.getElementById("mmratual").innerHTML = dadosimportantesmmr;
  cssbarradepts.setProperty("--progresspontinho", atualporc);

  const ultpart = document.getElementById("ultimapartida");
  if (dadosimportantesultimojogo === "nRanked" && jateverank === false) {
    ultpart.innerHTML = "Unranked " + isunrankedatoatual+"/1";
  } else if (dadosimportantesultimojogo === "nRanked" && jateverank === true) {
    ultpart.innerHTML = "Unranked " + isunrankedatoatual+"/1";}
  else if (dadosimportantesTier >= "24" && dadosimportantesultimojogo === 0) {
    ultpart.innerHTML = "Last Match: " + dadosimportantesultimojogo + "pts";
    bgpts.style.backgroundcolor = "grey";
  } else if (dadosimportantesTier >= "24" && dadosimportantesultimojogo >= 1) {
    ultpart.innerHTML = "Last Match: " + dadosimportantesultimojogo + "pts";
    atualporc = "100%";
    cssbarradepts.setProperty("--progresspontinho", atualporc);
  } else if (dadosimportantesTier >= "24" && dadosimportantesultimojogo <= -1) {
    ultpart.innerHTML = "Last Match: " + dadosimportantesultimojogo + "pts";
    atualporc = "0%";
    cssbarradepts.setProperty("--progresspontinho", atualporc);
  } else if (dadosimportantesultimojogo === 0) {
    ultpart.innerHTML = "Last Match: " + dadosimportantesultimojogo + "pts";
  } else if (dadosimportantesultimojogo >= 1) {
    ultpart.innerHTML = "Last Match: + " + dadosimportantesultimojogo + "pts";
  } else if (dadosimportantesultimojogo <= -1) {
    ultpart.innerHTML = "Last Match: " + dadosimportantesultimojogo + "pts";
  }
  document.getElementById("headerburrao").style.color = "#" + corfonte;
  document.getElementById("WLvalue").style.color = "#" + corfonte;
  document.getElementById('kd').style.color = "#" + corfonte;
  document.getElementById('hsr').style.color = "#" + corfonte;

}

if (_overlayQ.get("alpha") === "ss") {
  corbg.style.backgroundColor = "transparent";
} else if (_overlayQ.get("alpha") === "nn") {
  corbg.style.backgroundColor = "#" + cor;
}
if (bgurl != null && String(bgurl).length > 0) {
  corbg.style.backgroundImage = "url(" + bgurl + ")";
}
if (icourl == null || icourl.length == 0) {
  document.getElementById("imgcantinho").style.display = "none";
} else {
  document.getElementById("imgcantinho").style.content = "url(" + icourl + ")";
}

function checadados(){
  if (retornostatus == "200" && checkifnull != null){
    foda()
    }
}
setInterval(main, 15000);
setInterval(checadados, 15000);

setTimeout(function () {
  try {
    if (typeof ensureValorantCurrentActSync === "function") {
      valorantCurrentAct = ensureValorantCurrentActSync();
    }
  } catch (e) {}
  main();
  foda();
  rankatuallog = dadosimportantesTier;
}, 0);

if (semwc === false){
  function setapuuid(){
    syncOverlayParamsFromUrl();
    if (nmusuario == null || idusuario == null) return;
    reqpuuid = fazGet("https://api.henrikdev.xyz/valorant/v1/account/"+
      henrikPathSeg(nmusuario) +
      "/" +
      henrikPathSeg(idusuario));
      let parsepuuid = JSON.parse(reqpuuid)
      puuid = parsepuuid.data.puuid;
    }
    
    function get(){
        syncOverlayParamsFromUrl();
        if (regiao == null || nmusuario == null || idusuario == null) return;
        var r = String(regiao).toLowerCase();
        dadoswl = fazGet("https://api.henrikdev.xyz/valorant/v3/matches/"
          + r +
          "/" +
          henrikPathSeg(nmusuario) +
          "/" +
          henrikPathSeg(idusuario) + 
         "?mode=competitive");
        jsonDataWL = JSON.parse(dadoswl);
    }
    
    function getprimeirapartida(){
      get();
      partida1 = jsonDataWL.data[0].metadata.matchid;
      matchIds.push(partida1);
    return partida1;
    }
    
    function achatime(){
        let timedojogador = jsonDataWL.data[0].players.all_players.find(jogador => jogador.puuid === puuid);
        time = timedojogador.team;
        return time.toLowerCase()
    }
    
    function venceu(){
        if(jsonDataWL.data[0].teams.red.has_won == false && jsonDataWL.data[0].teams.blue.has_won == false){
            empatou = 'S'
        }
        else{
            empatou = 'N'
        }
        timevenceu = jsonDataWL.data[0].teams[achatime()].has_won;
        return timevenceu;
    }
    
    function AtualizaVisual(){
        document.getElementById("WLvalue").innerHTML = win + " Win / " + lose + " Lose";
    }
    
    function winlose(){
      get();
      if (!matchIds.includes(jsonDataWL.data[0].metadata.matchid)){
      matchIds.push(jsonDataWL.data[0].metadata.matchid);
      venceu();
      partida2 = jsonDataWL.data[0].metadata.matchid;
      if (partida2 != partida1){
              if(timevenceu === true){
                  var totalwin = win + 1;
                  win = totalwin;
                  partida1 = jsonDataWL.data[0].metadata.matchid;
                  AtualizaVisual();
              }
              else if(timevenceu===false && empatou === 'N'){
                  var totallose = lose + 1;
                  lose = totallose;
                  partida1 = jsonDataWL.data[0].metadata.matchid;
              }
      }
      }
      AtualizaVisual()
    }
    
    
    setapuuid()
    getprimeirapartida()
    setInterval(winlose, 30000);
    AtualizaVisual();
}
else if (semwc === true){
  document.getElementById("headerburrao").style.top = "-5px";
  document.getElementById("WLvalue").style.display = "none";

}

let corpoRequest = {
  type: "matchhistory",
  value: puuid,
  region: regiao,
  queries: "?startIndex=0&endIndex=20&queue=competitive",
};

async function fazFetch(puuid, regiao) {
  const request = await fetch("https://api.henrikdev.xyz/valorant/v1/raw", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "matchhistory",
      value: puuid,
      region: regiao,
      queries: "?startIndex=0&endIndex=20&queue=competitive",
    }),
  });
  content = await request.json();

  console.log(content);
}

function setapuuidNew() {
  syncOverlayParamsFromUrl();
  if (nmusuario == null || idusuario == null) return;
  reqpuuid = fazGet(
    "https://api.henrikdev.xyz/valorant/v1/account/" +
      henrikPathSeg(nmusuario) +
      "/" +
      henrikPathSeg(idusuario)
  );
  let parsepuuid = JSON.parse(reqpuuid);
  puuid = parsepuuid.data.puuid;
}

function getMatches() {
  syncOverlayParamsFromUrl();
  fazFetch(puuid, regiao == null ? regiao : String(regiao).toLowerCase());
  setTimeout(ParseMatches,3000)
}

function ParseMatches() {
  matches = content.History;
  for (let i = 0; i < matches.length; i++) {
    let obj = matches[i].MatchID;
    arrayMatches.push(obj);
  }
  console.log(arrayMatches);
  for (let i = 0; i < arrayMatches.length; i++) {
    let objID = matches[i].MatchID;
    dadoPartida = fazGet(
      "https://api.henrikdev.xyz/valorant/v2/match/" + objID
    );
    jsonDadoPartida = JSON.parse(dadoPartida);
    let Player = jsonDadoPartida.data.players.all_players.find(
      (jogador) => jogador.puuid === puuid
    );
    hsrateField = parseInt(hsrateField) + Number(Player.stats.headshots);
    bsrateField = parseInt(bsrateField) + Number(Player.stats.bodyshots);
    lsrateField = parseInt(lsrateField) + Number(Player.stats.legshots);
    deaths = deaths + parseInt(Player.stats.deaths);
    kills = kills + parseInt(Player.stats.kills);
  }
  calcKD = parseFloat(kills / deaths).toFixed(2);
  calcHS =
    Math.round(
      (hsrateField / (hsrateField + bsrateField + lsrateField)) * 100
    ) + "%";
  calcLS =
    Math.round(
      (bsrateField / (hsrateField + bsrateField + lsrateField)) * 100
    ) + "%";
  calcBS =
    Math.round(
      (lsrateField / (hsrateField + bsrateField + lsrateField)) * 100
    ) + "%";
    document.getElementById('kd').innerHTML = 'K/D&nbsp' + calcKD;
    document.getElementById('hsr').innerHTML = "HS " + calcHS;
}

function getLastMatch() {
  novaArray = [];
  novoObj = [];
  syncOverlayParamsFromUrl();
  if (regiao == null || nmusuario == null || idusuario == null) return;
  var r = String(regiao).toLowerCase();
  ultimaPartida = fazGet(
    "https://api.henrikdev.xyz/valorant/v3/matches/" +
      r +
      "/" +
      henrikPathSeg(nmusuario) +
      "/" +
      henrikPathSeg(idusuario) +
      "?mode=competitive"
  );
  jsonUltimaPartida = JSON.parse(ultimaPartida);
  let IDultimaPartida = jsonUltimaPartida.data[0].metadata.matchid;
  let Partidas = jsonUltimaPartida.data;
  let partidasNoData = jsonUltimaPartida;
  if (arrayMatches.includes(IDultimaPartida)) {
  } else {
    for (let i = 0; i < Partidas.length; i++) {
      novoObj = partidasNoData.data[i].metadata.matchid;
      if (arrayMatches.includes(novoObj)) {
      } else {
        novaArray.push(novoObj);
      }
    }
    for (let i = 0; i < novaArray.length; i++) {
      NovoobjID = novaArray[i];
      ultimaPartidaDados = fazGet(
        "https://api.henrikdev.xyz/valorant/v2/match/" + NovoobjID
      );
      jsonDadoPartida = JSON.parse(ultimaPartidaDados);
      let Player = jsonDadoPartida.data.players.all_players.find(
        (jogador) => jogador.puuid === puuid
      );
      hsrateField = parseInt(hsrateField) + Number(Player.stats.headshots);
      bsrateField = parseInt(bsrateField) + Number(Player.stats.bodyshots);
      lsrateField = parseInt(lsrateField) + Number(Player.stats.legshots);
      deaths = deaths + parseInt(Player.stats.deaths);
      kills = kills + parseInt(Player.stats.kills);
    }
    newArray = arrayMatches.concat(novaArray);
    arrayMatches = newArray;
  }
}

function kdhs() {
  getLastMatch();
  calcKD = parseFloat(kills / deaths).toFixed(2);
  calcHS =
    Math.round(
      (hsrateField / (hsrateField + bsrateField + lsrateField)) * 100
    ) + "%";
  calcLS =
    Math.round(
      (bsrateField / (hsrateField + bsrateField + lsrateField)) * 100
    ) + "%";
  calcBS =
    Math.round(
      (lsrateField / (hsrateField + bsrateField + lsrateField)) * 100
    ) + "%";
    document.getElementById('kd').innerHTML = 'K/D&nbsp' + calcKD;
    document.getElementById('hsr').innerHTML = "HS " + calcHS;
}

setapuuidNew();
getMatches();
setInterval(kdhs, 60000);
