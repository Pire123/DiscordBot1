const { Client, GatewayIntentBits, Partials } = require("discord.js");
const http = require("http");
const https = require("https");
const { parseString } = require("xml2js");

const prefix = "!";

const server = http.createServer();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction,
  ],
});

function Calc2(İtibariDeğer, ters = false, iskonto = 0) {
  /*
   * kDeğeri -> 1k robuxun değeri
   * İtibariDeğer -> Değişkendir, Robux veya para olabilir.
   */

  let kDeğeri = 2.5;

  let robux = 0;
  let fiyat = 0;

  const kRobuxDeğeri = (kDeğeri * (100 - iskonto)) / 100;
  // İndirim ile paranın değerini değil robuxunun değerini değiştiriyoruz.

  if (!ters) {
    // İtibari Değer == Para
    let Robux = (İtibariDeğer * 1000) / kRobuxDeğeri;
    let düzenlenmiş_Robux = Math.floor(Robux);
    let Fiyat = (kRobuxDeğeri / 1000) * düzenlenmiş_Robux;
    let düzenlemiş_Fiyat = parseFloat(Fiyat.toFixed(2));

    robux = düzenlenmiş_Robux;
    fiyat = düzenlemiş_Fiyat;
  } else {
    // İtibari Değer == Robux
    let en_küçük_tam_sayıa_yuvarla = true;
    let Fiyat = (kRobuxDeğeri / 1000) * İtibariDeğer;

    let Robux = (Fiyat * 1000) / kRobuxDeğeri;
    let düzenlenmiş_Robux = Math.floor(Robux);

    Fiyat = (kRobuxDeğeri / 1000) * düzenlenmiş_Robux;
    let düzenlemiş_Fiyat = en_küçük_tam_sayıa_yuvarla
      ? parseFloat(Fiyat.toFixed(2))
      : Fiyat;

    robux = düzenlenmiş_Robux;
    fiyat = düzenlemiş_Fiyat;
  }

  return [fiyat, robux];
}

function isBetween(number, min, max) {
  return number >= min && number <= max;
}

var Kur = [];

var indirim = [
  [0, 9999, 0],
  [10000, 19999, 5],
  [20000, 30000, 10],
];

function KurGüncelle() {
  return new Promise((resolve, reject) => {
    const url = "https://www.tcmb.gov.tr/kurlar/today.xml";
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          parseString(data, (err, result) => {
            if (err) {
              reject(err);
            } else {
              try {
                const dolar = parseFloat(
                  result.Tarih_Date.Currency.find(
                    (item) => item.$.Kod === "USD"
                  ).ForexSelling[0]
                );
                const euro = parseFloat(
                  result.Tarih_Date.Currency.find(
                    (item) => item.$.Kod === "EUR"
                  ).ForexSelling[0]
                );
                Kur = [dolar, euro];
                resolve([dolar, euro]);
              } catch (error) {
                reject(error);
              }
            }
          });
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

function DolarTL(dolar) {
  let TL = 0;
  TL = Kur[0] * dolar;
  let digit = 2;
  TL = Math.ceil(TL * (10 * digit)) / (10 * digit);
  return TL;
}

const filter = (reaction, user) => {
    return reaction.emoji.name === '✔️' && user.id === message.author.id;
};

var baslangicZamani = null;

client.on("ready", async () => {
  await KurGüncelle();
  baslangicZamani = new Date();
  console.log("Ready!");
});

client.on("messageCreate", async (message) => {
  if (!message.guild) return;
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  if (message.channel.id != 1206254246656348211) {
    //return;
  }

  let suankiZaman = new Date();
  let gecenSure = suankiZaman - baslangicZamani;

  if (gecenSure >= 30 * 60 * 1000) {
    console.log("Kur güncelleniyor...");

    await KurGüncelle();

    /*
      await KurGüncelle().then(kur => {
        console.log("Dolar:", kur[0]);
        console.log("Euro:", kur[1]);
      }).catch(error => {
          console.error("Hata:", error);
      });
      */

    baslangicZamani = suankiZaman;
  }

  let content = message.content.substring(1);
  let data = content.split(" ");

  if (data.length > 2) {
    message.channel.send(
      "Yanlış kullanım, doğrusu: **!robux 1000** veya **!fiyat 2.5**"
    );
    return;
  }

  let end_content = null;
  let end_cal = null;

  if (data[0] == "robux") {
    if (data[1] != null) {
      let cal = Calc2(data[1], true, 0);
      let iskonto = -99;

      indirim.forEach(function (k) {
        if (isBetween(cal[1], k[0], k[1])) {
          iskonto = k[2];
          return;
        }
      });

      if (iskonto == -99) {
        return;
      }

      cal = Calc2(data[1], true, iskonto);

      if (isNaN(cal[1]) || isNaN(cal[0])) {
        message.channel.send(
          "Yanlış kullanım, doğrusu: **!robux 1000** veya **!fiyat 2.5**"
        );
        return;
      }

      end_cal = cal;

      end_content =
        cal[1] +
        " robux " +
        cal[0] +
        "  USDT (**" +
        DolarTL(cal[0]) +
        " TL değerinde**)";

      if (iskonto != 0) {
        end_content = end_content + "(**%" + iskonto + "**)";
      }
    } else {
      end_content = "1k robux şu an 2.5 Tether USD";
    }
  } else if (data[0] == "fiyat") {
    if (data[1] != null) {
      let cal = Calc2(data[1], false, 0);
      let iskonto = -99;

      indirim.forEach(function (k) {
        if (isBetween(cal[1], k[0], k[1])) {
          iskonto = k[2];
          return;
        }
      });

      if (iskonto == -99) {
        return;
      }

      cal = Calc2(data[1], false, iskonto);

      iskonto = -99;

      indirim.forEach(function (k) {
        if (isBetween(cal[1], k[0], k[1])) {
          iskonto = k[2];
          return;
        }
      });

      if (iskonto == -99) {
        return;
      }

      if (isNaN(cal[1]) || isNaN(cal[0])) {
        message.channel.send(
          "Yanlış kullanım, doğrusu: **!robux 1000** veya **!fiyat 2.5**"
        );
        return;
      }

      end_cal = cal;

      end_content =
        cal[1] +
        " robux " +
        cal[0] +
        "  USDT (**" +
        DolarTL(cal[0]) +
        " TL değerinde**)";

      if (iskonto != 0) {
        end_content = end_content + "(**%" + iskonto + "**)";
      }
    } else {
      end_content = "1k robux şu an 2.5 Tether USD";
    }
  } else if (data[0] == "yardım") {
    end_content = "**!robux 1000** veya **!fiyat 2.5**\n\rEn fazla 30000 robux alabilirsiniz.";
  } else if (data[0] == "deneme") {
    
  }

  if (end_content != null) {
    message.channel.send(end_content).then(function(bot_mes) {
       
      let del = "❌"
      
      setTimeout(function(){   
        bot_mes.react(del);
      }, 2500);
      
      const collector = bot_mes.createReactionCollector(filter, { time: 12000 });

      collector.on('collect', (reaction, user) => {

         if(user.id == message.author.id) {
           if (reaction.emoji.name == del) {
            //console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
            message.delete()
            bot_mes.delete()
           }
         }
      });
    });
  }

  //message.channel.send("My Message");
});

function ServerRequestListener(request, response) {
  response.writeHead(200);
  response.write("OK v1");
  response.end();
}

client.login(process.env.DISCORD_BOT_TOKEN);

server.on("request", ServerRequestListener);

server.listen(process.env.PORT);
