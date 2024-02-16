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
const kDeğeri = 2.75;

function Calc2(İtibariDeğer, ters = false, iskonto = 0) {
  /*
   * kDeğeri -> 1k robuxun değeri
   * İtibariDeğer -> Değişkendir, Robux veya para olabilir.
   */

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
var KurGüncellemePeriyodu = 30 * 60 * 1000;

var indirim = [
  [0, 9999, 0],
  [10000, 19999, 5],
  [20000, 30000, 10],
];

var baslangicZamani = null;
var loopStart = null

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

async function OnReady() {
  console.log("Kur Güncelleniyor...");
  await KurGüncelle();
  baslangicZamani = new Date();
  console.log("Hazır!");
}

var Collectors = []

function DisableCollector(collector,event_name = null) {
     try {
      if(event_name != null){
        collector.removeAllListeners(event_name)
        console.log(event_name + " disconnect")
      }
    }
    catch(e) {console.log(e)}
    try {
      collector.stop()
      console.log("Collector Stop.")
    }
    catch(e){console.log(e)}
}

// Özellik message.delete()
function DeleteMessage(message) {
  try {
  message.delete()
  }
  catch (e){}
}

async function OnMessageCreate(message) {
  if (!message.guild) return;
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  if (message.channel.id != 1206254246656348211) {
    //return;
  }

  let suankiZaman = new Date();
  let gecenSure = suankiZaman - baslangicZamani;

  if (gecenSure >= KurGüncellemePeriyodu) { //
    console.log("Kur güncelleniyor...");

    await KurGüncelle();
     baslangicZamani = suankiZaman;
    
    /*
      await KurGüncelle().then(kur => {
        console.log("Dolar:", kur[0]);
        console.log("Euro:", kur[1]);
      }).catch(error => {
          console.error("Hata:", error);
      });
      */
  }

  let content = message.content.substring(1);
  let data = content.split(" ");

  if (data.length > 2) {
    message.channel.send("Yanlış kullanım, doğrusu: **!robux 1000** veya **!fiyat 2.5**");
    return;
  }

  let fill = "1k robux şu an " + kDeğeri + " Tether USD";
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
        message.channel.send("Yanlış kullanım, doğrusu: **!robux 1000** veya **!fiyat 2.5**");
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
      end_content = fill
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
        message.channel.send("Yanlış kullanım, doğrusu: **!robux 1000** veya **!fiyat 2.5**");
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
      end_content = fill
    }
  } else if (data[0] == "yardım") {
    end_content = "**!robux 1000** veya **!fiyat 2.5**\nEn fazla 30000 robux alabilirsiniz.";
  } else if (data[0] == "sürüm") {
    end_content = "Yen bir sürüm."
  }

  if (end_content != null) {
    message.channel.send(end_content).then(function(bot_mes) {
       
      let del = "🗑️"
      let run_time = 30 * 60 * 1000 // 30 dakika
      
      setTimeout(function(){   
        bot_mes.react(del);
      }, 2500);
      
      let filter = (reaction, user) => {
          return reaction.emoji.name === del && user.id === message.author.id;
      };

      let collector = bot_mes.createReactionCollector(true, { time: run_time });
      let event_name = 'collect'
      
      let element = [bot_mes,collector,event_name,run_time,new Date()]
      
      let bot_message_delete_time = 2.5 * 1000
      
      let deplated = false
      
      collector.on(event_name, (reaction, user) => {
        
         if(user.id == message.author.id) {
           if (reaction.emoji.name == del) {
            //console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
           
            bot_mes.edit("⚠️ Mesaj " + (bot_message_delete_time / 1000) + " saniye sonra silinecektir.")
            
            setTimeout(function(){
              DeleteMessage(message)
              DeleteMessage(bot_mes)
              deplated = true
              
              DisableCollector(collector,event_name)
              
              try {
                let forDeletion = [element]
                Collectors = Collectors.filter(item => !forDeletion.includes(item))
              }
              catch {}
            },bot_message_delete_time)
             
           }
         }
      });
      
      setTimeout(function(){   
          if (deplated == false)  {
           bot_mes.reactions.removeAll().catch(error => console.log('Failed to clear reactions'));
          }
          collector.stop();
      }, run_time);
      
      Collectors.push(element)
  
    });
  }

  //message.channel.send("My Message");
}

function ConnectEvents() {
  
  try {
    let forDeletion = []

    Collectors.forEach((element) => {
      let bot_mes = element[0]
      let collector = element[1]
      let event_name = element[2]
      let run_time = element[3]
      let başlangıç = element[4]
      
      let şu_an = new Date()
      
      if ((şu_an - başlangıç) >= run_time) {
        
        DisableCollector(collector,event_name)

        try {
          bot_mes.reactions.removeAll().catch(error => console.log('Failed to clear reactions.'));
        }
        catch (e) {console.log(e)}
        
        forDeletion.push(element)
      }
        
    });
    
    Collectors = Collectors.filter(item => !forDeletion.includes(item))

  }
  catch(e){console.log(e)}
  
  try {
    client.removeAllListeners('messageCreate')
    client.removeAllListeners('ready')
  } 
  catch(e) { }
  
  client.on("ready", OnReady)
  client.on("messageCreate", OnMessageCreate);
}

function Loop() {
  
  let suankiZaman = new Date();
  let gecenSure = suankiZaman - loopStart;
  
  
  if (gecenSure >= 30 * 60 * 1000) { // 30 dakika da bir bağlantıları yenile.
    console.log("Bağlantılar kalibre ediliyor...")
    ConnectEvents()
    loopStart = suankiZaman;
  }
  
  setTimeout(Loop,10 * 60 * 1000) // Her 10 dakika da bir kendini yenile
}

function ServerRequestListener(request, response) {
  response.writeHead(200);
  response.write("OK v1.5");
  response.end();
}

Loop()

client.login(process.env.token).catch(err => {
  console.log('');
  console.log(("Couldn't log into Discord. Wrong bot token?"));
  console.log('');
  console.log(err);
});;

server.on("request", ServerRequestListener);

server.listen(process.env.PORT);
