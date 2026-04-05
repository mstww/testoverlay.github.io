/**
 * Güncel competitive act: https://valorant-api.com/v1/seasons
 * Henrik MMR by_season kısa anahtarları ile eşleme + güvenli geri dönüş.
 */
(function (global) {
  var SEASONS_URL = "https://valorant-api.com/v1/seasons";
  var CACHE_KEY = "overlay_valorant_current_act_v1";
  var TTL_MS = 3600000;
  var didWarnHenrikFallback = false;

  /**
   * valorant-api act uuid → Henrik by_season anahtarı.
   * assetPath türetimi yetmezse (Henrik farklı isim kullanıyorsa) tek satır ekleyin.
   */
  var VALORANT_ACT_UUID_TO_HENRIK = {};

  function nowUtc() {
    return new Date().getTime();
  }

  function readSessionAct() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o.ts !== "number" || !o.act) return null;
      if (nowUtc() - o.ts > TTL_MS) return null;
      return o.act;
    } catch (e) {
      return null;
    }
  }

  function writeSessionAct(act) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ts: nowUtc(), act: act })
      );
    } catch (e) {}
  }

  function fetchSeasonsJsonSync() {
    var request = new XMLHttpRequest();
    request.open("GET", SEASONS_URL, false);
    request.send();
    return request.responseText;
  }

  function pickCurrentActFromSeasonsData(data) {
    if (!data || !Array.isArray(data)) return null;
    var acts = data.filter(function (s) {
      return (
        s &&
        s.type === "EAresSeasonType::Act" &&
        s.startTime &&
        s.endTime
      );
    });
    if (!acts.length) return null;
    var t = nowUtc();
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      var st = Date.parse(a.startTime);
      var et = Date.parse(a.endTime);
      if (!isNaN(st) && !isNaN(et) && t >= st && t < et) {
        return {
          uuid: a.uuid,
          assetPath: a.assetPath || "",
          displayName: a.displayName || "",
        };
      }
    }
    var started = acts.filter(function (a) {
      var st = Date.parse(a.startTime);
      return !isNaN(st) && t >= st;
    });
    if (!started.length) return null;
    started.sort(function (x, y) {
      return Date.parse(y.startTime) - Date.parse(x.startTime);
    });
    var a = started[0];
    return {
      uuid: a.uuid,
      assetPath: a.assetPath || "",
      displayName: a.displayName || "",
    };
  }

  /**
   * Senkron: önbellek veya ağ. Başarısızsa null.
   */
  function ensureValorantCurrentActSync() {
    var cached = readSessionAct();
    if (cached && cached.uuid) return cached;
    var text = fetchSeasonsJsonSync();
    if (!text) return null;
    var json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return null;
    }
    if (!json || json.status !== 200 || !json.data) return null;
    var act = pickCurrentActFromSeasonsData(json.data);
    if (act) writeSessionAct(act);
    return act;
  }

  function henrikKeyCandidatesFromAssetPath(assetPath) {
    var keys = [];
    if (!assetPath || typeof assetPath !== "string") return keys;
    var m = assetPath.match(/Season_Episode(\d+)_Act(\d+)_/i);
    if (m) keys.push("e" + m[1] + "a" + m[2]);
    m = assetPath.match(/Season_EpisodeV(\d+)-\d+_Act(\d+)_/i);
    if (m) {
      keys.push("e" + m[1] + "a" + m[2]);
      keys.push("v" + m[1] + "a" + m[2]);
    }
    return keys;
  }

  function parseHenrikSeasonKeyRank(key) {
    var m = /^e(\d+)a(\d+)$/i.exec(key);
    if (m) return { ep: parseInt(m[1], 10), act: parseInt(m[2], 10) };
    m = /^v(\d+)a(\d+)$/i.exec(key);
    if (m) return { ep: 1000 + parseInt(m[1], 10), act: parseInt(m[2], 10) };
    m = /^(\d+)a(\d+)$/i.exec(key);
    if (m) return { ep: parseInt(m[1], 10), act: parseInt(m[2], 10) };
    return null;
  }

  function compareSeasonRank(a, b) {
    if (!a) return 1;
    if (!b) return -1;
    if (a.ep !== b.ep) return a.ep - b.ep;
    return a.act - b.act;
  }

  function newestHenrikKeyInBySeason(bySeason) {
    var keys = Object.keys(bySeason || {});
    var bestKey = null;
    var bestRank = null;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var r = parseHenrikSeasonKeyRank(k);
      if (!r) continue;
      if (!bestRank || compareSeasonRank(r, bestRank) > 0) {
        bestRank = r;
        bestKey = k;
      }
    }
    return bestKey;
  }

  /**
   * Henrik by_season içinde güncel act için kullanılacak anahtarı seçer.
   */
  function resolveHenrikBySeasonKey(bySeason, act) {
    if (!bySeason || typeof bySeason !== "object") return null;

    function tryKey(k) {
      if (!k || bySeason[k] === undefined) return null;
      return k;
    }

    if (act && act.assetPath) {
      var cands = henrikKeyCandidatesFromAssetPath(act.assetPath);
      for (var i = 0; i < cands.length; i++) {
        var ck = tryKey(cands[i]);
        if (ck) return ck;
      }
    }

    if (act && act.uuid && VALORANT_ACT_UUID_TO_HENRIK[act.uuid]) {
      var mk = tryKey(VALORANT_ACT_UUID_TO_HENRIK[act.uuid]);
      if (mk) return mk;
    }

    var fb = newestHenrikKeyInBySeason(bySeason);
    if (fb && !didWarnHenrikFallback) {
      didWarnHenrikFallback = true;
      console.warn(
        "[overlay] Henrik by_season anahtarı tahminle seçildi:",
        fb,
        act ? act.uuid : ""
      );
    }
    return fb;
  }

  /**
   * Güvenli by_season okuma (yoksa Unranked akışı için anlamlı varsayılanlar).
   */
  function readHenrikSeasonBlock(bySeason, act) {
    var key = resolveHenrikBySeasonKey(bySeason, act);
    if (!key || !bySeason || !bySeason[key]) {
      return {
        henrikKey: key,
        number_of_games: 0,
        error: "No data Available",
      };
    }
    var b = bySeason[key];
    return {
      henrikKey: key,
      number_of_games:
        typeof b.number_of_games === "number" ? b.number_of_games : 0,
      error: b.error,
    };
  }

  global.ensureValorantCurrentActSync = ensureValorantCurrentActSync;
  global.resolveHenrikBySeasonKey = resolveHenrikBySeasonKey;
  global.readHenrikSeasonBlock = readHenrikSeasonBlock;
})(typeof window !== "undefined" ? window : this);
